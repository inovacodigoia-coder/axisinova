// OAuth2 Client Credentials — RFC 6749 §4.4
// POST /functions/v1/oauth-token
//   Content-Type: application/x-www-form-urlencoded (ou JSON)
//   grant_type=client_credentials&client_id=...&client_secret=...&scope=...
//   ou Authorization: Basic base64(client_id:client_secret)
// Proteção (Etapa 2A/2A.1): client_id + segredo são conferidos ANTES de qualquer bloqueio por IP.
// Credencial válida nunca é recusada por bloqueio de IP/par (só pelo limite de emissões do client_id);
// credencial inválida/inexistente conta no limite por IP e respeita os bloqueios (par client_id+IP e IP).
// Log de toda chamada — 1 consulta antes (api_oauth_pre) e 1 depois, em segundo plano (api_oauth_resultado).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sha256Hex, signAccessToken } from '../_shared/integrationAuth.ts'
import { avaliarCliente, carregarCliente, iguaisTempoConstante } from '../_shared/parceiroAcesso.ts'
import {
  CODIGO_BLOQUEIO_IGNORADO, codigoDeErro, emSegundoPlano, linhaDeLog, MENSAGEM_BLOQUEIO, mensagemLimite, novoContexto,
  registrarOauth, verificarOauth, type ResultadoOauth,
} from '../_shared/apiProtecao.ts'

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  })

const oauthError = (error: string, description: string, status = 400) =>
  json({ error, error_description: description }, status)

const TOKEN_TTL_SECONDS = 3600

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const ctx = novoContexto(req, 'oauth-token')

  // Responde e, depois, conta sucesso/falha e grava o log (não atrasa a resposta)
  const finalizar = async (res: Response, resultado: ResultadoOauth, errorCode?: string) => {
    const codigo = errorCode ?? (await codigoDeErro(res))
    emSegundoPlano(registrarOauth(supabase, ctx, resultado, linhaDeLog(ctx, res.status, codigo)))
    return res
  }

  try {
    if (req.method !== 'POST') return await finalizar(oauthError('invalid_request', 'Use POST', 405), 'outro')

    // ---- 1. Parse das credenciais ----
    let params: Record<string, string> = {}
    let corpoInvalido = false
    let basicInvalido = false
    const contentType = req.headers.get('content-type') || ''
    try {
      if (contentType.includes('application/json')) {
        const body = await req.json()
        params = Object.fromEntries(Object.entries(body ?? {}).map(([k, v]) => [k, String(v ?? '')]))
      } else {
        const form = new URLSearchParams(await req.text())
        params = Object.fromEntries(form.entries())
      }
    } catch {
      corpoInvalido = true
    }

    let clientId = String(params.client_id ?? '').trim()
    let clientSecret = String(params.client_secret ?? '').trim()

    const basic = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!corpoInvalido && basic?.toLowerCase().startsWith('basic ')) {
      try {
        const decoded = atob(basic.slice(6).trim())
        const idx = decoded.indexOf(':')
        if (idx > 0) {
          clientId = decodeURIComponent(decoded.slice(0, idx))
          clientSecret = decodeURIComponent(decoded.slice(idx + 1))
        }
      } catch {
        basicInvalido = true
      }
    }
    ctx.clientId = clientId || null

    // ---- 1b. Erros de formato (não consultam o cadastro) ----
    let erroFormato: Response | null = null
    if (corpoInvalido) erroFormato = oauthError('invalid_request', 'Corpo da requisição inválido')
    else if (basicInvalido) erroFormato = oauthError('invalid_client', 'Cabeçalho Basic inválido', 401)
    else if (String(params.grant_type ?? '') !== 'client_credentials') {
      erroFormato = oauthError('unsupported_grant_type', 'Somente grant_type=client_credentials é suportado')
    } else if (!clientId || !clientSecret) {
      erroFormato = oauthError('invalid_client', 'client_id e client_secret são obrigatórios', 401)
    }

    // ---- 2. Confere client e segredo ANTES do bloqueio por IP (hash em tempo constante) ----
    let client: Awaited<ReturnType<typeof carregarCliente>> = null
    let credencialValida = false
    if (!erroFormato) {
      client = await carregarCliente(supabase, clientId)
      const secretHash = await sha256Hex(clientSecret)
      const hashOk = iguaisTempoConstante(String(client?.secret_hash ?? '0'.repeat(64)), secretHash)
      credencialValida = !!client && hashOk && !!client.is_active && !client.revoked_at
    }

    // ---- 2a. Limites e bloqueios: válida só por emissões do client_id; inválida por IP e bloqueios ----
    const limite = await verificarOauth(supabase, ctx.ip, clientId, credencialValida)
    if (!limite.permitido) {
      const msg = limite.errorCode === 'LOCKED' ? MENSAGEM_BLOQUEIO(limite.retryAfter) : mensagemLimite(limite.retryAfter)
      const res = json({ error: 'RATE_LIMITED', error_description: msg }, 429, { 'Retry-After': String(limite.retryAfter) })
      return await finalizar(res, 'outro', limite.errorCode ?? 'RATE_LIMITED')
    }

    if (erroFormato) return await finalizar(erroFormato, 'outro')
    if (!credencialValida || !client) {
      // client_id inexistente e senha errada: mesma resposta e mesma contagem
      return await finalizar(oauthError('invalid_client', 'Credenciais inválidas ou revogadas', 401), 'falha_credencial')
    }
    ctx.companyId = String(client.company_id)
    ctx.partnerId = client.partner_id ? String(client.partner_id) : null

    // ---- 2b. Parceiro vinculado: ativo, autorizado e módulo liberado; senão, sem token ----
    const acesso = await avaliarCliente(supabase, client)
    if (!acesso.ok) {
      return await finalizar(acesso.code === 'PARTNER_NOT_AUTHORIZED'
        ? oauthError('PARTNER_NOT_AUTHORIZED', acesso.message, 403)
        : oauthError('invalid_client', 'Credenciais inválidas ou revogadas', 401), 'outro')
    }

    // ---- 3. Escopos ----
    const allowed: string[] = Array.isArray(client.scopes) ? client.scopes : []
    const requested = String(params.scope ?? '').split(' ').map((s) => s.trim()).filter(Boolean)
    if (requested.length) {
      const invalid = requested.filter((s) => !allowed.includes(s))
      if (invalid.length) {
        return await finalizar(oauthError('invalid_scope', `Escopo não autorizado: ${invalid.join(', ')}`), 'outro')
      }
    }
    const granted = requested.length ? requested : allowed

    // ---- 4. Emite o token ----
    const now = Math.floor(Date.now() / 1000)
    const accessToken = await signAccessToken({
      iss: 'axisinova',
      sub: client.client_id,
      company_id: client.company_id,
      scope: granted.join(' '),
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    })

    await supabase
      .from('integration_oauth_clients')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', client.id)

    return await finalizar(json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_SECONDS,
      scope: granted.join(' '),
    }), 'sucesso', limite.bloqueioIgnorado ? CODIGO_BLOQUEIO_IGNORADO : undefined)
  } catch (e) {
    console.error('[oauth-token] erro interno:', e instanceof Error ? e.message : e)
    return await finalizar(oauthError('server_error', 'Erro interno ao emitir o token', 500), 'outro', 'INTERNAL_ERROR')
  }
})
