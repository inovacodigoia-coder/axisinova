// Cria um client OAuth2 (client_credentials) para a empresa do usuário logado.
// O client_secret é devolvido UMA única vez; no banco fica só o hash SHA-256.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sha256Hex, base64url } from '../_shared/integrationAuth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const VALID_SCOPES = ['exams:read', 'orders:read', 'results:write']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Não autenticado' }, 401)
    }

    const accessToken = authHeader.slice(7).trim()
    if (!accessToken) return json({ error: 'Não autenticado' }, 401)

    // Edge Functions não mantêm uma sessão do navegador. O JWT recebido deve
    // ser passado explicitamente ao Auth; depender do estado interno do client
    // faz getUser() retornar null mesmo com o header Authorization presente.
    const { data: { user }, error: authError } = await admin.auth.getUser(accessToken)
    if (authError || !user) {
      console.error('[create-oauth-client] token inválido:', authError?.message ?? 'usuário ausente')
      return json({ error: 'Sessão inválida ou expirada' }, 401)
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('company_id, role, is_admin, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.company_id || profile.is_active === false) {
      return json({ error: 'Perfil sem empresa vinculada' }, 403)
    }
    const isManager =
      profile.is_admin === true || ['company_admin', 'super_admin'].includes(String(profile.role))
    if (!isManager) return json({ error: 'Somente administradores podem gerar credenciais' }, 403)

    const body = (await req.json().catch(() => ({}))) ?? {}
    const rawName = String((body as any).name ?? '').trim()
    if (rawName.length > 120) return json({ error: 'Nome muito longo (máx. 120)' }, 400)
    const name = rawName || 'Integração OAuth2'

    const rawScopes = Array.isArray((body as any).scopes) ? (body as any).scopes.map(String) : VALID_SCOPES
    const scopes = rawScopes.filter((s: string) => VALID_SCOPES.includes(s))
    if (!scopes.length) return json({ error: 'Informe ao menos um escopo válido' }, 400)

    const clientId = `axis_cid_${base64url(crypto.getRandomValues(new Uint8Array(12)))}`
    const clientSecret = `axis_sec_${base64url(crypto.getRandomValues(new Uint8Array(32)))}`
    const secretHash = await sha256Hex(clientSecret)

    const { data: inserted, error } = await admin
      .from('integration_oauth_clients')
      .insert({
        company_id: profile.company_id,
        name,
        client_id: clientId,
        secret_hash: secretHash,
        scopes,
        created_by: user.id,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[create-oauth-client] erro:', error.message)
      return json({ error: 'Não foi possível criar as credenciais' }, 500)
    }

    return json({
      id: inserted.id,
      client_id: clientId,
      client_secret: clientSecret,
      scopes,
      token_endpoint: `${supabaseUrl}/functions/v1/oauth-token`,
    })
  } catch (e) {
    console.error('[create-oauth-client] exceção:', (e as Error).message)
    return json({ error: 'Erro inesperado' }, 500)
  }
})
