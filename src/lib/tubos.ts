// =====================================================================
// Tubos da etiqueta de coleta — fonte: cadastro de Materiais e Tubos.
// Ordem: recipiente do laudo (exam.recipienteId) → recipiente padrão do
// material → (transição) regra antiga para materiais migrados sem tubo →
// "TUBO NÃO DEFINIDO". Nunca cai num tubo padrão escondido.
// =====================================================================
import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { TUBE_TYPES } from '@/types/lab.types'
import { coletasDoExame, chaveExame, refExameEtiqueta } from '@/lib/coletasEtiqueta'

export interface Recipiente { id: string; nome: string; sigla: string; cor_tampa: string | null; cor_hex: string | null; aditivo: string | null; volume_ml: number | null; observacao: string | null; ativo: boolean; ordem: number }
export interface Material { id: string; nome: string; sigla: string | null; recipiente_id: string | null; descricao: string | null; legado: boolean; ativo: boolean; ordem: number; condicao_transporte_id?: string | null; estab_ambiente_h?: number | null; estab_refrigerado_h?: number | null; estab_congelado_h?: number | null }
export interface Tubo { type: string; label: string; sigla: string; color: string; hex: string; volume: string; indefinido?: boolean
  /** Etiqueta própria de uma coleta seguinte (ex.: TOTG 120 min). */
  extra?: { examKey: string; coleta: string; ordem: number } }

export const normMat = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

type Estado = { companyId: string | null; materiais: Material[]; recipientes: Recipiente[]; carregado: boolean }
let estado: Estado = { companyId: null, materiais: [], recipientes: [], carregado: false }
let porNome = new Map<string, Material>()
let porRec = new Map<string, Recipiente>()
const ouvintes = new Set<() => void>()
let carregando: Promise<void> | null = null

function publicar(p: Partial<Estado>) {
  estado = { ...estado, ...p }
  porNome = new Map(estado.materiais.map(m => [normMat(m.nome), m]))
  porRec = new Map(estado.recipientes.map(r => [r.id, r]))
  ouvintes.forEach(f => f())
}

export async function recarregarTubos(companyId?: string | null) {
  const cid = companyId ?? estado.companyId
  if (!cid) return
  const db = supabase as any
  const [m, r] = await Promise.all([
    db.from('lab_material').select('*').eq('company_id', cid).order('ordem').order('nome'),
    db.from('lab_recipiente').select('*').eq('company_id', cid).order('ordem').order('nome'),
  ])
  publicar({ companyId: cid, materiais: m.data ?? [], recipientes: r.data ?? [], carregado: true })
}

/** Carrega (uma vez por empresa) e re-renderiza quando o cadastro muda. */
export function useMateriaisTubos(companyId?: string | null) {
  useEffect(() => {
    if (!companyId || (estado.companyId === companyId && (estado.carregado || carregando))) return
    carregando = recarregarTubos(companyId).finally(() => { carregando = null })
  }, [companyId])
  return useSyncExternalStore(cb => { ouvintes.add(cb); return () => ouvintes.delete(cb) }, () => estado)
}

export const materialPorNome = (nome: unknown) => porNome.get(normMat(nome)) ?? null
export const recipientePorId = (id: string | null | undefined) => (id ? porRec.get(id) ?? null : null)

/** Regra antiga (texto do material → tipo fixo). null = não achou tubo. */
export function regraAntiga(material: unknown): string | null {
  const m = normMat(material)
  if (!m) return null
  if (m.includes('fezes') || m.includes('fecal')) return 'fezes'
  if (m.includes('escarro') || m.includes('secrec') || m.includes('swab') || m.includes('saliva')) return 'escarro'
  if (m.includes('urina')) return 'urina'
  if (m.includes('edta') || m.includes('sangue total') || m.includes('hemograma')) return 'edta'
  if (m.includes('citrat') || m.includes('coagulacao')) return 'citrato'
  if (m.includes('plasma')) return 'citrato'
  if (m.includes('soro') || m.includes('gel') || m.includes('sangue')) return 'gel'
  if (m.includes('frasco')) return 'urina'
  return null
}

const SIGLA_ANTIGA: Record<string, string> = { gel: 'GEL', edta: 'EDTA', citrato: 'CIT', urina: 'URINA', fezes: 'FEZES', escarro: 'ESCARRO' }

/** Chave do tubo do exame (agrupa exames na mesma etiqueta). */
export function tuboDoExame(e: any): string {
  const material = typeof e === 'string' ? e : e?.material
  const recLaudo = typeof e === 'object' ? recipientePorId(e?.recipienteId) : null
  if (recLaudo) return `rec:${recLaudo.id}`
  const mat = materialPorNome(material)
  if (mat?.recipiente_id && recipientePorId(mat.recipiente_id)) return `rec:${mat.recipiente_id}`
  if (mat && !mat.legado) return 'indef'
  return regraAntiga(material) ?? 'indef'
}

/**
 * Tubo que um material antigo (legado, sem recipiente) já recebe hoje pela regra
 * antiga — a mesma ordem de tubos que o aparelho usa. null = sem tubo de verdade.
 * Só serve para não mostrar "sem tubo" onde a etiqueta já sai certa; não muda a etiqueta.
 */
export function tuboAutomatico(m: Pick<Material, 'nome' | 'legado' | 'recipiente_id'> | null | undefined): Tubo | null {
  if (!m || !m.legado || (m.recipiente_id && recipientePorId(m.recipiente_id))) return null
  const k = regraAntiga(m.nome)
  return k ? tuboInfo(k) : null
}

/** Material que precisa de tubo configurado (sem recipiente e sem regra automática). */
export const materialSemTubo = (m: Pick<Material, 'nome' | 'legado' | 'recipiente_id'>) =>
  !(m.recipiente_id && recipientePorId(m.recipiente_id)) && !tuboAutomatico(m)

/** Aviso para a Coleta (null = tudo certo). */
export function avisoTubo(e: any): string | null {
  const k = tuboDoExame(e)
  if (k === 'indef') return 'Tubo não definido: corrija o cadastro de Materiais'
  if (k.startsWith('rec:')) return null
  const mat = materialPorNome(e?.material)
  return mat ? 'Tubo ainda não configurado no cadastro de Materiais' : null
}

export function tuboInfo(key: string): Tubo {
  if (key.startsWith('rec:')) {
    const r = recipientePorId(key.slice(4))
    if (r) return { type: key, label: r.nome, sigla: r.sigla, color: '', hex: r.cor_hex || '#94A3B8', volume: r.volume_ml ? `${r.volume_ml}mL` : '—' }
  }
  const t = TUBE_TYPES.find(x => x.type === key)
  if (t) return { ...t, sigla: SIGLA_ANTIGA[key] || key.toUpperCase() }
  return { type: 'indef', label: 'Tubo não definido', sigla: '?', color: 'bg-destructive', hex: '#DC2626', volume: '—', indefinido: true }
}

/** Tubos de um conjunto de exames, em ordem estável (antigos → cadastro → não definido). */
export function tubosDosExames(exams: any[]): Tubo[] {
  const keys = new Set(exams.map(tuboDoExame))
  const antigos = TUBE_TYPES.filter(t => keys.has(t.type)).map(t => tuboInfo(t.type))
  const recs = [...keys].filter(k => k.startsWith('rec:')).sort().map(tuboInfo)
  return [...antigos, ...recs, ...(keys.has('indef') ? [tuboInfo('indef')] : [])]
}

/** Texto da etiqueta: "NOME DO RECIPIENTE (SIGLA)" ou "TUBO NÃO DEFINIDO". */
export const etiquetaTubo = (t: Tubo) => (t.indefinido ? { material: 'TUBO NÃO DEFINIDO', tube: '' } : { material: t.label, tube: t.sigla })

/**
 * Etiquetas do pedido: tubos comuns (mesma ordem/código de sempre) e, depois deles,
 * uma etiqueta para cada coleta seguinte dos exames com coletas em tempos diferentes.
 * Só para impressão/consulta de etiquetas — a Coleta continua por tubo comum.
 */
export function etiquetasDosExames(exams: any[]): Tubo[] {
  const extras: Tubo[] = []
  const vistos = new Set<string>()
  for (const e of exams || []) {
    const coletas = coletasDoExame(e)
    if (coletas.length < 2) continue
    const examKey = chaveExame(e)
    if (vistos.has(examKey)) continue
    vistos.add(examKey)
    const base = tuboInfo(tuboDoExame(e))
    coletas.slice(1).forEach((c, i) => {
      extras.push({ ...base, type: `extra:${examKey}:${i + 2}`, extra: { examKey, coleta: c.nome, ordem: i + 2 } })
    })
  }
  return [...tubosDosExames(exams), ...extras]
}

/** Exames de uma etiqueta (tubo comum ou etiqueta própria da coleta). */
export function examesDoTubo(exams: any[], tube: Tubo): any[] {
  if (tube.extra) return (exams || []).filter(e => chaveExame(e) === tube.extra!.examKey).slice(0, 1)
  return (exams || []).filter(e => tuboDoExame(e) === tube.type)
}

/** Linha de exames da etiqueta, com o nome da coleta quando o exame tem coletas em tempos diferentes. */
export function refsEtiqueta(tube: Tubo, exams: any[], refOf: (e: any) => string): string[] {
  const lista = examesDoTubo(exams, tube)
  return lista.map(e => refExameEtiqueta(refOf(e), e, tube.extra ? tube.extra.ordem - 1 : 0))
}

/** Descrição na tela: "TUBO GEL (GEL) · 120 MIN". */
export function descricaoEtiqueta(tube: Tubo): string {
  const t = etiquetaTubo(tube)
  const base = `${t.material.toUpperCase()}${t.tube ? ` (${t.tube})` : ''}`
  return tube.extra ? `${base} · ${tube.extra.coleta}` : base
}
