// Rotina semanal (e clique manual): getResultado Operacao=ModelosTodos -> grava apoio_modelo_resultado
// e marca "Modelo do apoio mudou" quando o CodigoFormato muda. Só leitura no Pardini.
import { adminClient, apoiosAutomaticos, autenticar, corsHeaders, idMsg, json, paraCada, uuidOk } from '../_shared/pardini/contexto.ts'
import { brData, chamar } from '../_shared/pardini/soap.ts'
import { conteudoUtil, contarTag, esc } from '../_shared/pardini/xml.ts'
import { parseModelos } from '../_shared/pardini/parsers.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const admin = adminClient()
  const quem = await autenticar(req, admin, 'apoio.catalogo.gerenciar')
  if (quem instanceof Response) return quem
  const body = await req.json().catch(() => ({}))
  const labs = await apoiosAutomaticos(admin, uuidOk(body?.apoio_id) ? body.apoio_id : undefined, quem.companyId)
  const out = await paraCada(admin, labs, 'modelos', async (ctx) => {
    const hoje = new Date(), ini = new Date(Date.now() - 365 * 864e5)
    const xml = `<Consulta><Protocolo>1</Protocolo><ID>${idMsg()}</ID><SolicitaResultado><CodLab>${esc(ctx.lab.cod_lab)}</CodLab><Operacao>ModelosTodos</Operacao><Acao>Mostra</Acao><DataInicial>${brData(ini)}</DataInicial><HoraInicial>00:00:00</HoraInicial><DataFinal>${brData(hoje)}</DataFinal><HoraFinal>23:59:59</HoraFinal><Grafico>0</Grafico><UnidadeNoValor>0</UnidadeNoValor><DadosConstantes>1</DadosConstantes><valorReferencia>${esc(ctx.lab.opcoes?.valorReferencia ?? 1)}</valorReferencia></SolicitaResultado></Consulta>`
    const util = conteudoUtil(await chamar(ctx, 'getResultado', [['XML', 'string', xml]], { tentativas: 2, timeoutMs: 120_000 }))
    const modelos = parseModelos(util)
    const esperado = contarTag(util, 'SuperExame')
    if (esperado !== modelos.length) throw new Error(`Contagem de modelos não bate: arquivo tem ${esperado} SuperExame, li ${modelos.length}. Nada foi gravado.`)

    const agora = new Date().toISOString()
    const rows = modelos.map((m) => ({
      company_id: ctx.lab.company_id, apoio_id: ctx.lab.id, cod_exm_apoio: m.codExmApoio,
      material_nome: m.materialNome || null, exame_nome: m.exameNome || null, codigo_formato: m.codigoFormato || null,
      modelo_json: m.itens, origem: 'automatico', atualizado_em: agora,
    }))
    for (let i = 0; i < rows.length; i += 300) {
      const { error } = await admin.from('apoio_modelo_resultado').upsert(rows.slice(i, i + 300), { onConflict: 'apoio_id,cod_exm_apoio' })
      if (error) throw new Error(`Falha ao gravar modelos: ${error.message}`)
    }

    const formatos = new Map<string, string>()
    for (const m of modelos) if (m.codigoFormato) formatos.set(m.codExmApoio.split('|').slice(0, 2).join('|'), m.codigoFormato)
    const { data: dps } = await admin.from('apoio_depara_exame').select('id, codigo_apoio, codigo_formato').eq('apoio_id', ctx.lab.id).eq('ativo', true)
    let mudaram = 0
    for (const d of dps ?? []) {
      const novo = formatos.get(String(d.codigo_apoio).toUpperCase())
      if (novo && d.codigo_formato && novo !== d.codigo_formato) {
        await admin.from('apoio_depara_exame').update({ modelo_mudou: true, codigo_formato_anterior: d.codigo_formato }).eq('id', d.id); mudaram++
      }
    }
    return { modelos: modelos.length, mudaram }
  })
  return json({ ok: out.every((o) => o.ok), resultados: out })
})
