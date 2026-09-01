// OAuth2 Client Credentials — RFC 6749 §4.4
// POST /functions/v1/oauth-token
//   Content-Type: application/x-www-form-urlencoded (ou JSON)
//   grant_type=client_credentials&client_id=...&client_secret=...&scope=...
//   ou Authorization: Basic base64(client_id:client_secret)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sha256Hex, signAccessToken } from '../_shared/integrationAuth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const oauthError = (error: string, description: string, status = 400) =>
  json({ error, error_description: description }, status)

const TOKEN_TTL_SECONDS = 3600

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return oauthError('invalid_request', 'Use POST', 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // ---- 1. Parse das credenciais ----
  let params: Record<string, string> = {}
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
    return oauthError('invalid_request', 'Corpo da requisição inválido')
  }

  let clientId = String(params.client_id ?? '').trim()
  let clientSecret = String(params.client_secret ?? '').trim()

  const basic = req.headers.get('Authorization') || req.headers.get('authorization')
  if (basic?.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = atob(basic.slice(6).trim())
      const idx = decoded.indexOf(':')
      if (idx > 0) {
        clientId = decodeURIComponent(decoded.slice(0, idx))
        clientSecret = decodeURIComponent(decoded.slice(idx + 1))
      }
    } catch {
      return oauthError('invalid_client', 'Cabeçalho Basic inválido', 401)
    }
  }

  if (String(params.grant_type ?? '') !== 'client_credentials') {
    return oauthError('unsupported_grant_type', 'Somente grant_type=client_credentials é suportado')
  }
  if (!clientId || !clientSecret) {
    return oauthError('invalid_client', 'client_id e client_secret são obrigatórios', 401)
  }

  // ---- 2. Valida o client ----
  const { data: client } = await supabase
    .from('integration_oauth_clients')
    .select('id, company_id, client_id, secret_hash, scopes, is_active, revoked_at')
    .eq('client_id', clientId)
    .maybeSingle()

  const secretHash = await sha256Hex(clientSecret)
  if (!client || client.secret_hash !== secretHash || !client.is_active || client.revoked_at) {
    return oauthError('invalid_client', 'Credenciais inválidas ou revogadas', 401)
  }

  // ---- 3. Escopos ----
  const allowed: string[] = Array.isArray(client.scopes) ? client.scopes : []
  const requested = String(params.scope ?? '').split(' ').map((s) => s.trim()).filter(Boolean)
  if (requested.length) {
    const invalid = requested.filter((s) => !allowed.includes(s))
    if (invalid.length) {
      return oauthError('invalid_scope', `Escopo não autorizado: ${invalid.join(', ')}`)
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

  return json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: TOKEN_TTL_SECONDS,
    scope: granted.join(' '),
  })
})
