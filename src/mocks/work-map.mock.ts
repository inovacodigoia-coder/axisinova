// Mock store do Módulo Mapa de Trabalho (Etapa 1)
// Estende os atendimentos existentes com os campos:
//  - guia_remessa_recebida (mock determinístico: ~12% false)
//  - incluido_em_mapa (marcado ao gerar um mapa)

const INCLUDED_KEY = 'axis_work_map_included'
const MAPS_KEY = 'axis_work_maps'

export interface WorkMapRecord {
  code: string
  generatedAt: string
  sector: string
  responsible: string
  itemsCount: number
  itemKeys: string[]
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

function readSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(INCLUDED_KEY)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set<string>()
  }
}

export function getIncludedKeys(): Set<string> {
  return readSet()
}

export function isIncludedInMap(key: string): boolean {
  return readSet().has(key)
}

export function getWorkMaps(): WorkMapRecord[] {
  try {
    const raw = sessionStorage.getItem(MAPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getWorkMap(code: string): WorkMapRecord | undefined {
  return getWorkMaps().find(m => m.code === code)
}

export function createWorkMap(params: { itemKeys: string[]; sector: string; responsible: string }): WorkMapRecord {
  const maps = getWorkMaps()
  const code = String(1000 + maps.length + 1)
  const record: WorkMapRecord = {
    code,
    generatedAt: new Date().toISOString(),
    sector: params.sector,
    responsible: params.responsible,
    itemsCount: params.itemKeys.length,
    itemKeys: params.itemKeys,
  }
  try {
    sessionStorage.setItem(MAPS_KEY, JSON.stringify([...maps, record]))
    const set = readSet()
    params.itemKeys.forEach(k => set.add(k))
    sessionStorage.setItem(INCLUDED_KEY, JSON.stringify([...set]))
  } catch (e) {
    console.error('[work-map] persist failed', e)
  }
  return record
}

export const DEFAULT_PRIORITIES = ['Normal', 'Urgente', 'Emergência']
