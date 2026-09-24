// Rotina diária: baixa o tabexalhpV2.xml do Pardini (Basic Auth) e aplica como no upload manual.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { aplicarCatalogo, parse } from '../_shared/pardini/catalogo.ts'
import { decodificarArquivo } from '../_shared/pardini/xml.ts'

const URL_CAT = 'https://www.hermespardini.com.br/cal/tabexalhpV2.xml'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin, 'apoio.catalogo.gerenciar')
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const out = await paraCada(admin, labs, 'catalogo', async (ctx) => {
    const ini = Date.now()
    const r = await fetch(URL_CAT, { headers: { Authorization: 'Basic ' + btoa(`${ctx.lab.cod_lab}:${ctx.senha}`) } })
    const buf = new Uint8Array(await r.arrayBuffer())
    await admin.from('apoio_chamada_log').insert({ company_id: ctx.lab.company_id, apoio_id: ctx.lab.id, operacao: 'catalogo', requisicao: `GET ${URL_CAT} (Basic ***)`, resposta: `${buf.length} bytes`, http_status: r.status, duracao_ms: Date.now() - ini, erro: r.ok ? null : `HTTP ${r.status}` })
    if (!r.ok) throw new Error(`Catálogo: HTTP ${r.status}`)
    const xml = decodificarArquivo(buf) // arquivo por URL: ISO-8859-1 de verdade
    const itens = parse(xml)
    if (!itens.length) throw new Error('Catálogo sem <EXAME> válido')
    const { total, afetados } = await aplicarCatalogo(admin, ctx.lab, itens, 'tabexalhpV2.xml (automático)', quem.userId ?? null)
    return { total, terceirizados_afetados: afetados }
  })
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
