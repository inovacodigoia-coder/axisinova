// Busca resultados do Pardini (getResultado, Acao=Mostra, cursor nosso) e importa. Também reprocessa um log.
import { adminClient, apoiosAutomaticos, autenticar, carregarCtx, corsHeaders, cursorLer, idMsg, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { brData, brHora, chamar, type Ctx } from '../_shared/pardini/soap.ts'
import { contarTag, conteudoUtil, esc } from '../_shared/pardini/xml.ts'
import { importar, parseResultados } from '../_shared/pardini/resultado.ts'
import { processarPdfs } from '../_shared/pardini/pdf.ts'

async function rodar(ctx: Ctx) {
  const cur = await cursorLer(ctx.admin, ctx.lab, 'resultado')
  const fim = new Date()
  const ini = new Date((cur?.ate ? new Date(cur.ate).getTime() : fim.getTime() - 24 * 3600_000) - 60 * 60_000)
  const vr = ctx.lab.opcoes?.valorReferencia ?? 1
  const xml = `<Consulta><Protocolo>1</Protocolo><ID>${idMsg()}</ID><SolicitaResultado><CodLab>${esc(ctx.lab.cod_lab)}</CodLab><Operacao>Resultados</Operacao><Acao>Mostra</Acao><DataInicial>${brData(ini)}</DataInicial><HoraInicial>${brHora(ini)}</HoraInicial><DataFinal>${brData(fim)}</DataFinal><HoraFinal>${brHora(fim)}</HoraFinal><Grafico>1</Grafico><UnidadeNoValor>0</UnidadeNoValor><DadosConstantes>1</DadosConstantes><valorReferencia>${esc(vr)}</valorReferencia></SolicitaResultado></Consulta>`
  const resp = await chamar(ctx, 'getResultado', [['XML', 'string', xml]], { tentativas: 3 })
  const util = conteudoUtil(resp)
  const pedidos = parseResultados(util)
  const resumo = await importar(ctx, pedidos)
  const noTexto = contarTag(util, 'Pedido')
  if (noTexto !== pedidos.length) throw new Error(`Leitura incompleta: ${pedidos.length} de ${noTexto} pedidos. Cursor não avançou.`)
  let pdf = null
  try { pdf = await processarPdfs(ctx) } catch (e) { pdf = { erro: (e as Error).message } }
  // Cursor só avança depois de tudo gravado
  return { ...resumo, pdf, ate: fim.toISOString() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin)
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))

  // Reprocessar a resposta de um log (reaplica o De/Para sobre a versão recebida)
  if (uuidOk(body?.reprocessar_log_id)) {
    if (quem.tipo === 'usuario') {
      const { data: adm } = await quem.client.rpc('is_company_manager', { _user_id: quem.userId })
      if (!adm) return json({ ok: false, motivo: 'Somente administradores' }, 403)
    }
    const { data: log } = await admin.from('apoio_chamada_log').select('id, company_id, apoio_id, operacao, resposta').eq('id', body.reprocessar_log_id).maybeSingle()
    if (!log || (quem.companyId && log.company_id !== quem.companyId)) return json({ ok: false, motivo: 'Registro não encontrado' }, 404)
    if (!log.resposta) return json({ ok: false, motivo: 'Este registro não tem resposta para reprocessar' })
    try {
      const ctx = await carregarCtx(admin, log.apoio_id).catch(async () => {
        const { data: lab } = await admin.from('apoio_laboratorio').select('*').eq('id', log.apoio_id).single()
        return { admin, lab, senha: '' } as Ctx
      })
      const xml = log.operacao === 'orfao' ? `<Resultados><Pedido>${log.resposta}</Pedido></Resultados>` : conteudoUtil(log.resposta)
      const r = await importar(ctx, parseResultados(xml), { reprocessar: true })
      await admin.from('apoio_auditoria').insert({ company_id: log.company_id, tabela: 'apoio_chamada_log', registro_id: log.id, acao: 'reprocessar', depois: r, usuario_id: quem.userId ?? null })
      return json({ ok: true, ...r })
    } catch (e) { return json({ ok: false, motivo: (e as Error).message }) }
  }

  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const out = await paraCada(admin, labs, 'resultado', rodar)
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
