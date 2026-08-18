import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => ({}))
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    const method = ['GET', 'POST', 'PUT', 'PATCH'].includes(String(body.method || '').toUpperCase())
      ? String(body.method).toUpperCase()
      : 'GET'
    const event = typeof body.event === 'string' ? body.event : 'TEST_EVENT'

    if (!url || !/^https?:\/\//i.test(url)) {
      return json({ error: 'URL inválida. Use http:// ou https://' }, 400)
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

    let target = url
    if (method === 'GET') {
      const u = new URL(url)
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
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500)
  }
})
