import { supabase } from '@/integrations/supabase/client'

export const db = supabase as any

export interface CatItem { codigo: string; descricao: string; materiais: string[]; conservantes: string[]; info_comp: string[]; ativo: boolean }
export interface ExameLis { id: string; internal_code: string | null; name: string; workbench_id: string | null; default_material: string | null; selected_materials: string[] | null }

const cache = new Map<string, Promise<CatItem[]>>()

/** Referência completa do apoio (carregada uma vez por sessão) */
export function carregarCatalogo(apoioId: string, force = false): Promise<CatItem[]> {
  if (!force && cache.has(apoioId)) return cache.get(apoioId)!
  const p = (async () => {
    const out: CatItem[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('apoio_catalogo_exame').select('codigo, descricao, materiais, conservantes, info_comp, ativo')
        .eq('apoio_id', apoioId).order('codigo').range(from, from + 999)
      if (error) throw error
      out.push(...(data || []).map((r: any) => ({ ...r, descricao: r.descricao || '', materiais: r.materiais || [], conservantes: r.conservantes || [], info_comp: r.info_comp || [] })))
      if (!data || data.length < 1000) break
    }
    return out
  })()
  cache.set(apoioId, p)
  p.catch(() => cache.delete(apoioId))
  return p
}

export const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const STOP = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'NO', 'NA', 'EM', 'A', 'O', 'SORO', 'SANGUE', 'TOTAL'])
const tokens = (s: string) => norm(s).split(' ').filter(t => t.length > 1 && !STOP.has(t))

/** Pontua itens da referência por semelhança de nome e material com o nosso exame */
export function sugerir(exame: Pick<ExameLis, 'name' | 'default_material' | 'selected_materials'>, cat: CatItem[], n = 5): { item: CatItem; score: number }[] {
  const tn = tokens(exame.name)
  if (!tn.length) return []
  const nomeN = norm(exame.name)
  const mats = [exame.default_material, ...(exame.selected_materials || [])].filter(Boolean).map(m => norm(m as string))
  const res: { item: CatItem; score: number }[] = []
  for (const it of cat) {
    if (!it.ativo) continue
    const td = tokens(it.descricao)
    if (!td.length) continue
    const inter = tn.filter(t => td.some(d => d === t || (t.length >= 4 && d.startsWith(t)) || (d.length >= 4 && t.startsWith(d)))).length
    if (!inter) continue
    let score = inter / (tn.length + td.length - inter)
    const dn = norm(it.descricao)
    if (dn === nomeN) score += 1
    else if (dn.startsWith(nomeN)) score += 0.4
    if (mats.length && it.materiais.some(m => mats.some(x => norm(m).includes(x) || x.includes(norm(m))))) score += 0.3
    res.push({ item: it, score })
  }
  return res.sort((a, b) => b.score - a.score).slice(0, n)
}

export const exigePdfSugerido = (desc: string) => /ANATOM|CITOLOG|IMUNOHISTO|BIOPSIA/.test(norm(desc).replace(/\s/g, ''))

export const brl = (n: number | null | undefined) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
