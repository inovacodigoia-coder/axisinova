import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

/** Blocks loopback, private, link-local and other non-public destinations (SSRF guard). */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    return true
  }

  // IPv6
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return true // unique local
    if (/^fe[89ab][0-9a-f]:/.test(host)) return true // link local
    if (host.startsWith('::ffff:')) return isBlockedHost(host.slice(7))
    return false
  }

  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a >= 224) return true // multicast / reserved
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Authentication is mandatory before the server makes any outbound request.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Não autenticado' }, 401)

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await anonClient.auth.getUser()
    if (!caller) return json({ error: 'Sessão inválida ou expirada' }, 401)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin
      .from('profiles')
      .select('company_id, is_active')
      .eq('id', caller.id)
      .maybeSingle()

    if (!profile || profile.is_active === false || !profile.company_id) {
      return json({ error: 'Sem permissão' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const method = ['GET', 'POST', 'PUT', 'PATCH'].includes(String(body.method || '').toUpperCase())
      ? String(body.method).toUpperCase()
      : 'GET'
    const event = typeof body.event === 'string' ? body.event : 'TEST_EVENT'

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return json({ error: 'URL inválida. Use http:// ou https://' }, 400)
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return json({ error: 'URL inválida. Use http:// ou https://' }, 400)
    }

    if (isBlockedHost(parsed.hostname)) {
      return json({ error: 'Destino não permitido: endereços internos ou privados são bloqueados.' }, 400)
    }

    const instrument = (body.instrument && typeof body.instrument === 'object') ? body.instrument : {
      id: body.instrument_id ?? null,
      name: body.instrument_name ?? null,
    }

    const payload = {
      event,
      test: true,
      instrument_id: instrument.id ?? body.instrument_id ?? null,
      instrument_name: instrument.name ?? body.instrument_name ?? null,
      instrument,
      sent_at: new Date().toISOString(),
      message: 'Teste de conectividade do webhook (Axis Inova)',
    }

    let target = parsed.toString()
    if (method === 'GET') {
      const u = new URL(parsed.toString())
      u.searchParams.set('test', 'true')
      u.searchParams.set('event', event)
      if (instrument.id) u.searchParams.set('instrument_id', String(instrument.id))
      if (instrument.name) u.searchParams.set('name', String(instrument.name))
      if (instrument.identifier) u.searchParams.set('identifier', String(instrument.identifier))
      if (instrument.type) u.searchParams.set('type', String(instrument.type))
      if (instrument.brand_model) u.searchParams.set('brand_model', String(instrument.brand_model))
      u.searchParams.set('payload', JSON.stringify(payload))
      target = u.toString()
    }

    const started = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    try {
      const res = await fetch(target, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Test': 'true',
        },
        body: method === 'GET' ? undefined : JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'manual',
      })
      const text = (await res.text().catch(() => '')).slice(0, 2000)
      return json({
        ok: res.ok,
        status: res.status,
        duration_ms: Date.now() - started,
        response: text,
      })
    } catch (err) {
      return json({
        ok: false,
        status: 0,
        duration_ms: Date.now() - started,
        error: err instanceof Error ? err.message : 'Falha de conexão com o servidor de destino',
      })
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    console.error('test-instrument-webhook error:', e)
    return json({ error: 'Erro inesperado' }, 500)
  }
})
