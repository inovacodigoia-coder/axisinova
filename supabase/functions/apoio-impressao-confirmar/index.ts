// ServidorAisaxius confirma o resultado de um trabalho: { id, ok, erro }
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'
import { authenticateIntegration } from '../_shared/integrationAuth.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.object({ id: z.string().uuid(), ok: z.boolean(), erro: z.string().max(2000).optional().nullable() })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const auth = await authenticateIntegration(req, supabase)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  let raw: unknown
  try { raw = await req.json() } catch { return json({ error: 'JSON inválido' }, 400) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
  const { id, ok, erro } = parsed.data

  const patch = ok
    ? { status: 'impresso', impresso_em: new Date().toISOString(), erro: null }
    : { status: 'erro', erro: erro || 'Falha na impressão' }
  const { data, error } = await supabase.from('apoio_impressao_fila').update(patch)
    .eq('id', id).eq('empresa_id', auth.companyId).in('status', ['enviado', 'pendente', 'erro'])
    .select('id, status').maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!data) return json({ error: 'Trabalho não encontrado' }, 404)
  return json({ ok: true, id: data.id, status: data.status })
})
