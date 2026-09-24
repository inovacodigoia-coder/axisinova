import { db, norm, type CatItem, type ExameLis } from './deparaUtils'
import { montarAjuste, montarPayload, type FormatoAjuste } from './ajusteLaudo'
import { montarMateriais, montarMetodo, type Cadastro } from './CadastroPrevia'
import type { ModeloItem } from './modelosXml'

export type Confianca = 'alta' | 'media' | 'sem'

/** Alta = nome e material iguais; Média = nome parecido; Sem = nenhuma sugestão */
export function confianca(e: Pick<ExameLis, 'name' | 'default_material' | 'selected_materials'>, it: CatItem | undefined): Confianca {
  if (!it) return 'sem'
  const mats = [e.default_material, ...(e.selected_materials || [])].filter(Boolean).map(m => norm(m as string))
  const matOk = !mats.length || it.materiais.some(m => mats.some(x => norm(m) === x || norm(m).includes(x) || x.includes(norm(m))))
  return norm(it.descricao) === norm(e.name) && matOk ? 'alta' : 'media'
}

export interface ResultadoAuto { exameId: string; nome: string; status: 'pronto' | 'pendencia' | 'falha'; pendencias: string[]; erro?: string; deparaId?: string }

/** De/Para → laudo Pardini novo (liga na bancada Pardini) → ajuste 11K → material/metodologia 11L, sem perguntar nada */
export async function terceirizarCompleto(companyId: string, apoioId: string, exame: ExameLis, item: CatItem, exigePdf: boolean): Promise<ResultadoAuto> {
  const base: ResultadoAuto = { exameId: exame.id, nome: exame.name, status: 'pronto', pendencias: [] }
  try {
    const { data: dp, error } = await db.from('apoio_depara_exame')
      .upsert({ company_id: companyId, exame_id: exame.id, apoio_id: apoioId, codigo_apoio: item.codigo, ativo: true, exige_pdf: exigePdf }, { onConflict: 'company_id,exame_id,apoio_id' })
      .select('id').single()
    if (error) throw error
    base.deparaId = dp.id
    const { data: fs } = await db.rpc('apoio_depara_formatos', { _depara: dp.id })
    const lista = (fs || []) as any[]
    if (!lista.length) return { ...base, status: 'pendencia', pendencias: ['Sem modelo do Pardini carregado (envie o modelos.xml)'] }
    const cods = [...new Set(lista.map(f => f.cod_exm_apoio))]
    const { data: ms } = await db.from('apoio_modelo_resultado').select('cod_exm_apoio, codigo_formato, modelo_json').eq('apoio_id', apoioId).in('cod_exm_apoio', cods)
    const byKey = new Map((ms || []).map((m: any) => [`${m.cod_exm_apoio}|${m.codigo_formato}`, m.modelo_json]))
    const formatos: FormatoAjuste[] = lista.map(f => ({ codigo_formato: f.codigo_formato, recente: f.recente, itens: (byKey.get(`${f.cod_exm_apoio}|${f.codigo_formato}`) || []) as ModeloItem[] }))
    const linhas = montarAjuste(formatos, [], new Set(), 'novo')
    if (!linhas.length) return { ...base, status: 'pendencia', pendencias: ['Modelo do Pardini sem valores'] }
    const { data: cad } = await db.rpc('apoio_laudo_ajuste_cadastro', { _depara: dp.id })
    let materiais: string[] = [], metodologia: string | null = null
    if (cad) {
      const mats = montarMateriais(cad as Cadastro)
      materiais = mats.filter(m => m.incluir && !m.jaTem && m.alvo).map(m => m.alvo)
      for (const m of mats.filter(m => m.semEquivalente)) base.pendencias.push(`Material sem equivalente: ${m.pardini}`)
      const met = montarMetodo(cad as Cadastro)
      if (met?.casada) metodologia = met.casada
      else if (met) base.pendencias.push(`Metodologia nova: ${met.sugerido}`)
    }
    const { params, mapas } = montarPayload(linhas, 'novo')
    const { error: e2 } = await db.rpc('apoio_laudo_ajustar', { _depara: dp.id, _laudo: null, _modo: 'novo', _nome: 'Laudo Pardini', _params: params, _mapas: mapas, _extras: { materiais, metodologia } })
    if (e2) throw e2
    return { ...base, status: base.pendencias.length ? 'pendencia' : 'pronto' }
  } catch (e: any) {
    return { ...base, status: 'falha', erro: e?.message || 'Erro desconhecido' }
  }
}
