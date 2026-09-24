// Fila de PDFs (getResultadoPedido PDF=2). Limite 5.000/dia por credencial; acima de 4.000 só os exige_pdf.
import { chamar, type Ctx } from './soap.ts'
import { texto, conteudoUtil } from './xml.ts'

const LIMITE = 5000, RESERVA = 4000

function b64(s: string): Uint8Array {
  const bin = atob(s.replace(/\s+/g, ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function processarPdfs(ctx: Ctx, max = 100) {
  const { admin, lab } = ctx
  const { data: cont } = await admin.from('apoio_pdf_contador').select('chamadas').eq('apoio_id', lab.id).eq('dia', new Date().toISOString().slice(0, 10)).maybeSingle()
  let usados = cont?.chamadas ?? 0
  if (usados >= LIMITE) return { baixados: 0, motivo: 'Limite diário de PDFs atingido' }

  const { data: pes } = await admin.from('apoio_pedido_exame').select('id, company_id, exame_id, cod_ped_apoio, codigo_apoio, sequencial, created_at')
    .eq('apoio_id', lab.id).not('cod_ped_apoio', 'is', null).in('status', ['liberado_apoio', 'importado', 'importado_com_pendencia', 'liberado_local']).limit(1000)
  if (!pes?.length) return { baixados: 0 }
  const ids = pes.map((p: any) => p.id)
  const { data: docs } = await admin.from('apoio_documento').select('pedido_exame_id').eq('tipo', 'laudo_pdf').in('pedido_exame_id', ids)
  const tem = new Set((docs ?? []).map((d: any) => d.pedido_exame_id))
  const { data: dps } = await admin.from('apoio_depara_exame').select('exame_id, exige_pdf').eq('apoio_id', lab.id).eq('ativo', true)
  const exige = new Set((dps ?? []).filter((d: any) => d.exige_pdf).map((d: any) => d.exame_id))
  const fila = pes.filter((p: any) => !tem.has(p.id) && (exige.has(p.exame_id) || lab.guardar_pdf_sempre))
    .sort((a: any, b: any) => Number(exige.has(b.exame_id)) - Number(exige.has(a.exame_id)))

  let baixados = 0; const falhas: string[] = []
  for (const p of fila.slice(0, max)) {
    const obrig = exige.has(p.exame_id)
    if (usados >= LIMITE || (usados >= RESERVA && !obrig)) break
    const { data: n } = await admin.rpc('apoio_pdf_contar', { _apoio: lab.id, _company: lab.company_id }); usados = n ?? usados + 1
    try {
      const resp = await chamar(ctx, 'getResultadoPedido', [
        ['anoCodPedApoio', 'long', new Date(p.created_at).getFullYear()], ['CodPedApoio', 'string', p.cod_ped_apoio],
        ['CodExmApoio', 'string', `${p.codigo_apoio}|${p.sequencial ?? 1}`], ['PDF', 'long', 2], ['versaoResultado', 'long', 1],
        ['papelTimbrado', 'boolean', !!lab.opcoes?.papelTimbrado], ['valorReferencia', 'long', lab.opcoes?.valorReferencia ?? 1], ['UnidadeNoValor', 'boolean', false],
      ], { tentativas: 2 })
      const b = texto(resp, 'PDF') || texto(conteudoUtil(resp), 'PDF')
      if (!b) { falhas.push(`${p.cod_ped_apoio}: sem PDF na resposta`); continue }
      const bytes = b64(b)
      if (String.fromCharCode(...bytes.slice(0, 4)) !== '%PDF') { falhas.push(`${p.cod_ped_apoio}: conteúdo não é PDF`); continue }
      const path = `${p.company_id}/resultados/${p.id}/pardini-${Date.now()}.pdf`
      const { error } = await admin.storage.from('apoio-documentos').upload(path, bytes, { contentType: 'application/pdf' })
      if (error) { falhas.push(error.message); continue }
      await admin.from('apoio_documento').insert({ company_id: p.company_id, pedido_exame_id: p.id, tipo: 'laudo_pdf', storage_path: path, origem: 'integracao' })
      baixados++
    } catch (e) { falhas.push(`${p.cod_ped_apoio}: ${(e as Error).message}`) }
  }
  return { baixados, pendentes: Math.max(0, fila.length - baixados), usados_hoje: usados, falhas: falhas.slice(0, 10) }
}
