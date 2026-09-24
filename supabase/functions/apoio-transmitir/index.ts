// Transmissão da remessa ao laboratório de apoio.
// Provisório: a integração real entra no prompt 11. Não altera status dos exames.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({ remessa_id: z.string().uuid() })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: claims, error: authErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401)

  let raw: unknown
  try { raw = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)

  const { data: remessa } = await supabase.from('apoio_remessa')
    .select('id, status').eq('id', parsed.data.remessa_id).maybeSingle()
  if (!remessa) return json({ ok: false, motivo: 'Remessa não encontrada' }, 404)

  return json({ ok: false, motivo: 'Integração ainda não configurada. Use o modo manual.' })
})
