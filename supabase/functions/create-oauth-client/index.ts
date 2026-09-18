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

const VALID_SCOPES = ['exams:read', 'orders:read', 'orders:write', 'results:write']

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

    // Valida o JWT do usuário. Primeiro com um client anônimo que repassa o
    // header Authorization (caminho mais confiável), depois com o admin.
    const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    let user = (await anon.auth.getUser()).data.user
    if (!user) {
      const viaAdmin = await admin.auth.getUser(accessToken)
      user = viaAdmin.data.user
      if (!user) {
        console.error(
          '[create-oauth-client] token inválido (len=' + accessToken.length + '):',
          viaAdmin.error?.message ?? 'usuário ausente',
        )
        return json({ error: 'Sessão inválida ou expirada' }, 401)
      }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('company_id, role, is_admin, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.company_id || profile.is_active === false) {
      return json({ error: 'Perfil sem empresa vinculada' }, 403)
    }
    let isManager =
      profile.is_admin === true || ['company_admin', 'super_admin'].includes(String(profile.role))

    // Também é gestor quem pertence a um setor cujo perfil de acesso concede
    // permissões administrativas (ex.: "TI – Administração").
    if (!isManager) {
      const { data: links } = await admin
        .from('sector_users')
        .select('sector_id')
        .eq('user_id', user.id)
        .eq('company_id', profile.company_id)

      const sectorIds = (links ?? []).map((l) => l.sector_id).filter(Boolean)
      if (sectorIds.length) {
        const { data: sectors } = await admin
          .from('company_sectors')
          .select('allowed_profile_ids')
          .in('id', sectorIds)

        const profileIds = [...new Set((sectors ?? []).flatMap((s) => s.allowed_profile_ids ?? []))]
        if (profileIds.length) {
          const { data: accessProfiles } = await admin
            .from('access_profiles')
            .select('permissions, is_active')
            .in('id', profileIds)

          isManager = (accessProfiles ?? []).some((ap) => {
            if (ap.is_active === false) return false
            const perms = (ap.permissions ?? {}) as Record<string, string[]>
            const settings = perms.settings ?? []
            const users = perms.users ?? []
            return settings.includes('edit') || settings.includes('approve') || users.includes('create')
          })
        }
      }
    }

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
