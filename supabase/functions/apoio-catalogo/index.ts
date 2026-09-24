// Rotina diária (02:00) e botão "Baixar do Pardini agora": baixa o tabexalhpV2.xml (Basic Auth) e aplica como no upload manual.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { aplicarCatalogo, parse } from '../_shared/pardini/catalogo.ts'
import { decodificarArquivo } from '../_shared/pardini/xml.ts'

const URL_CAT = 'https://www.hermespardini.com.br/cal/tabexalhpV2.xml'
const MSG_LOGIN = 'Código ou senha do Pardini recusados'
const MSG_FORA = 'Não foi possível baixar do Pardini agora. Tente de novo ou envie o arquivo manualmente.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin, 'apoio.catalogo.gerenciar')
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const unico = uuidOk(body?.apoio_id) ? body.apoio_id as string : undefined
  const labs = await apoiosAutomaticos(admin, unico, quem.companyId)
  if (unico && !labs.length) return json({ ok: false, error: 'Apoio sem integração Pardini automática ativa' }, 400)
  const manual = quem.tipo === 'usuario'
  const out = await paraCada(admin, labs, 'catalogo', async (ctx) => {
    const ini = Date.now()
    let r: Response
    try {
      r = await fetch(URL_CAT, { headers: { Authorization: 'Basic ' + btoa(`${ctx.lab.cod_lab}:${ctx.senha}`) }, signal: AbortSignal.timeout(90_000) })
    } catch (e) {
      await admin.from('apoio_chamada_log').insert({ company_id: ctx.lab.company_id, apoio_id: ctx.lab.id, operacao: 'catalogo', requisicao: `GET ${URL_CAT} (Basic ***)`, resposta: null, http_status: null, duracao_ms: Date.now() - ini, erro: (e as Error).message.slice(0, 500) })
      throw new Error(MSG_FORA)
    }
    const buf = new Uint8Array(await r.arrayBuffer())
    await admin.from('apoio_chamada_log').insert({ company_id: ctx.lab.company_id, apoio_id: ctx.lab.id, operacao: 'catalogo', requisicao: `GET ${URL_CAT} (Basic ***)`, resposta: `${buf.length} bytes`, http_status: r.status, duracao_ms: Date.now() - ini, erro: r.ok ? null : `HTTP ${r.status}` })
    if (r.status === 401 || r.status === 403) throw new Error(MSG_LOGIN)
    if (!r.ok) throw new Error(MSG_FORA)
    const xml = decodificarArquivo(buf) // arquivo por URL: ISO-8859-1
    const itens = parse(xml)
    if (!itens.length) throw new Error('Catálogo baixado sem <EXAME> válido — nada foi alterado')
    const nome = manual ? 'tabexalhpV2.xml (baixado do Pardini)' : 'tabexalhpV2.xml (automático)'
    const a = await aplicarCatalogo(admin, ctx.lab, itens, nome, quem.userId ?? null)
    return { atualizado_em: a.sync.created_at, total: a.total, novos: a.novos, alterados: a.alterados, desativados: a.desativados, terceirizados_afetados: a.afetados, alertas: a.alertas.map((x) => x.mensagem) }
  })
  for (const o of out) if (!o.ok) {
    const lab = labs.find((l) => l.nome === o.apoio)
    if (lab) await admin.from('apoio_auditoria').insert({ company_id: lab.company_id, tabela: 'apoio_catalogo_exame', registro_id: lab.id, acao: 'SINCRONIZAR_FALHA', usuario_id: quem.userId ?? null, depois: { erro: o.erro, origem: manual ? 'manual' : 'automatica' } }).then(() => {}, () => {})
  }
  if (unico) {
    const o = out[0]
    return o?.ok ? json({ ...o, ok: true }) : json({ ok: false, error: o?.erro || MSG_FORA })
  }
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
