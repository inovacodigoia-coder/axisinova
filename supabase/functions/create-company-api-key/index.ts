import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function base64url(bytes: Uint8Array) {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // ---- Autenticação: JWT do usuário logado ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401)

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) return json({ error: 'Não autenticado' }, 401)

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
    if (!isManager) return json({ error: 'Somente administradores podem gerar chaves' }, 403)

    // ---- Nome ----
    const body = (await req.json().catch(() => ({}))) ?? {}
    const rawName = String((body as any).name ?? '').trim()
    if (rawName.length > 120) return json({ error: 'Nome muito longo (máx. 120)' }, 400)
    const name = rawName || 'Integração externa'

    // ---- Geração no servidor (32 bytes de entropia) ----
    const secret = base64url(crypto.getRandomValues(new Uint8Array(32)))
    const apiKey = `axis_live_${secret}`
    const keyHash = await sha256Hex(apiKey)
    const keyPrefix = apiKey.slice(0, 14)

    const { data: inserted, error } = await admin
      .from('instrument_integration_keys')
      .insert({
        company_id: profile.company_id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        created_by: user.id,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error('create-company-api-key insert error:', error.message)
      return json({ error: 'Não foi possível gerar a chave' }, 400)
    }

    // A chave completa é devolvida uma única vez — nunca é armazenada em texto puro.
    return json({ id: inserted.id, api_key: apiKey, key_prefix: keyPrefix })
  } catch (err) {
    console.error('create-company-api-key error:', err)
    return json({ error: 'Erro interno do servidor' }, 500)
  }
})
