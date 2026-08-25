// Módulo Mapa de Trabalho — persistência real (Supabase: public.lab_work_maps)
// Mantém um cache em memória para leitura síncrona pelos componentes.

import { supabase } from '@/integrations/supabase/client'

export interface WorkMapRecord {
  code: string
  generatedAt: string
  sector: string
  responsible: string
  itemsCount: number
  itemKeys: string[]
}

let cache: WorkMapRecord[] = []
let includedCache = new Set<string>()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(l => l())
}

export function subscribeWorkMaps(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Chave única de um exame dentro de um atendimento */
export function workMapItemKey(orderId: string, guideIndex: number, examIndex: number) {
  return `${orderId}:${guideIndex}:${examIndex}`
}

/** Mock: guia de remessa recebida (aprox. 88% true) */
export function isGuiaRemessaRecebida(key: string): boolean {
  return hashString(key) % 100 >= 12
}

function rowToRecord(row: any): WorkMapRecord {
  return {
    code: row.code,
    generatedAt: row.generated_at || row.created_at,
    sector: row.sector || '—',
    responsible: row.responsible || '—',
    itemsCount: row.items_count ?? (Array.isArray(row.item_keys) ? row.item_keys.length : 0),
    itemKeys: Array.isArray(row.item_keys) ? row.item_keys : [],
  }
}

function rebuildIncluded() {
  const set = new Set<string>()
  cache.forEach(m => m.itemKeys.forEach(k => set.add(k)))
  includedCache = set
}

/** Carrega os mapas do banco para o cache. */
export async function loadWorkMaps(): Promise<WorkMapRecord[]> {
  const { data, error } = await supabase
    .from('lab_work_maps')
    .select('code, sector, responsible, item_keys, items_count, generated_at, created_at')
    .order('generated_at', { ascending: false })

  if (error) {
    console.error('[work-map] load failed', error)
    return cache
  }

  cache = (data || []).map(rowToRecord)
  rebuildIncluded()
  notify()
  return cache
}

export function getWorkMaps(): WorkMapRecord[] {
  return cache
}

export function getIncludedKeys(): Set<string> {
  return includedCache
}

export function isIncludedInMap(key: string): boolean {
  return includedCache.has(key)
}

export function getWorkMap(code: string): WorkMapRecord | undefined {
  return cache.find(m => m.code === code)
}

export async function fetchWorkMap(code: string): Promise<WorkMapRecord | undefined> {
  const { data, error } = await supabase
    .from('lab_work_maps')
    .select('code, sector, responsible, item_keys, items_count, generated_at, created_at')
    .eq('code', code)
    .maybeSingle()

  if (error || !data) return getWorkMap(code)
  const record = rowToRecord(data)
  cache = [record, ...cache.filter(m => m.code !== record.code)]
  rebuildIncluded()
  notify()
  return record
}

export async function createWorkMap(params: {
  itemKeys: string[]
  sector: string
  responsible: string
  companyId: string
  userId?: string | null
}): Promise<WorkMapRecord> {
  await loadWorkMaps()

  const nextCode = () => {
    const nums = cache.map(m => Number(m.code)).filter(n => Number.isFinite(n))
    return String((nums.length ? Math.max(...nums) : 1000) + 1)
  }

  let record: WorkMapRecord | null = null
  for (let attempt = 0; attempt < 5 && !record; attempt++) {
    const code = String(Number(nextCode()) + attempt)
    const { data, error } = await supabase
      .from('lab_work_maps')
      .insert({
        company_id: params.companyId,
        code,
        sector: params.sector,
        responsible: params.responsible,
        item_keys: params.itemKeys as any,
        items_count: params.itemKeys.length,
        created_by: params.userId ?? null,
      })
      .select('code, sector, responsible, item_keys, items_count, generated_at, created_at')
      .single()

    if (error) {
      if (error.code === '23505') continue // código duplicado, tenta o próximo
      console.error('[work-map] create failed', error)
      throw error
    }
    record = rowToRecord(data)
  }

  if (!record) throw new Error('Não foi possível gerar o código do mapa.')

  cache = [record, ...cache]
  rebuildIncluded()
  notify()
  return record
}

export async function deleteWorkMap(code: string) {
  const { error } = await supabase.from('lab_work_maps').delete().eq('code', code)
  if (error) {
    console.error('[work-map] delete failed', error)
    throw error
  }
  cache = cache.filter(m => m.code !== code)
  rebuildIncluded()
  notify()
}

export const DEFAULT_PRIORITIES = ['Normal', 'Urgente', 'Emergência']
