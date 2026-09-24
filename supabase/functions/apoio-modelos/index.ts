// Rotina semanal: getResultado Operacao=ModelosSolicitados; marca "Modelo do apoio mudou" quando o CodigoFormato muda.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, idMsg, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { brData, chamar } from '../_shared/pardini/soap.ts'
import { blocos, conteudoUtil, esc, texto } from '../_shared/pardini/xml.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin, 'apoio.catalogo.gerenciar')
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const out = await paraCada(admin, labs, 'modelos', async (ctx) => {
    const hoje = new Date(), ini = new Date(Date.now() - 365 * 864e5)
    const xml = `<Consulta><Protocolo>1</Protocolo><ID>${idMsg()}</ID><SolicitaResultado><CodLab>${esc(ctx.lab.cod_lab)}</CodLab><Operacao>ModelosSolicitados</Operacao><Acao>Mostra</Acao><DataInicial>${brData(ini)}</DataInicial><HoraInicial>00:00:00</HoraInicial><DataFinal>${brData(hoje)}</DataFinal><HoraFinal>23:59:59</HoraFinal><Grafico>0</Grafico><UnidadeNoValor>0</UnidadeNoValor><DadosConstantes>1</DadosConstantes><valorReferencia>${esc(ctx.lab.opcoes?.valorReferencia ?? 1)}</valorReferencia></SolicitaResultado></Consulta>`
    const util = conteudoUtil(await chamar(ctx, 'getResultado', [['XML', 'string', xml]], { tentativas: 3 }))
    const formatos = new Map<string, string>()
    for (const s of blocos(util, 'SuperExame')) {
      const cod = texto(s.replace(/<Exame\b[\s\S]*/i, ''), 'CodExmApoio').toUpperCase(), f = texto(s.replace(/<Exame\b[\s\S]*/i, ''), 'CodigoFormato')
      if (cod && f) formatos.set(cod.split('|').slice(0, 2).join('|'), f)
    }
    const { data: dps } = await admin.from('apoio_depara_exame').select('id, codigo_apoio, codigo_formato').eq('apoio_id', ctx.lab.id).eq('ativo', true)
    let mudaram = 0
    for (const d of dps ?? []) {
      const novo = formatos.get(String(d.codigo_apoio).toUpperCase())
      if (novo && d.codigo_formato && novo !== d.codigo_formato) {
        await admin.from('apoio_depara_exame').update({ modelo_mudou: true, codigo_formato_anterior: d.codigo_formato }).eq('id', d.id); mudaram++
      }
    }
    return { modelos: formatos.size, mudaram }
  })
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
