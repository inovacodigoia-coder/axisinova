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

    const payload = {
      event,
      test: true,
      instrument_id: body.instrument_id ?? null,
      instrument_name: body.instrument_name ?? null,
      sent_at: new Date().toISOString(),
      message: 'Teste de conectividade do webhook (Axis Inova)',
    }

    const target = method === 'GET'
      ? `${url}${url.includes('?') ? '&' : '?'}test=true&event=${encodeURIComponent(event)}`
      : url

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
