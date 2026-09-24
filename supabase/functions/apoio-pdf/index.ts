// Fila de PDFs do Pardini (também roda ao final de cada apoio-resultado).
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { processarPdfs } from '../_shared/pardini/pdf.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin)
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const out = await paraCada(admin, labs, 'pdf', (ctx) => processarPdfs(ctx, 200))
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
