import { useSyncExternalStore } from 'react'
import { MOCK_SECTORS } from '@/mocks/company.mock'
import type { Sector } from '@/types/permissions.types'

/**
 * Store compartilhado de Setores.
 * Mantém a lista viva entre a tela de Setores e o CompanyContext (troca de perfil/setor),
 * de modo que setores criados ou editados apareçam imediatamente no seletor do usuário.
 */
let sectors: Sector[] = [...MOCK_SECTORS]
const listeners = new Set<() => void>()

function emit() {
  sectors = [...sectors]
  listeners.forEach(l => l())
}

export function getSectors(): Sector[] {
  return sectors
}

export function subscribeSectors(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function upsertSector(sector: Sector) {
  const idx = sectors.findIndex(s => s.id === sector.id)
  if (idx >= 0) sectors[idx] = sector
  else sectors.push(sector)
  emit()
}

export function useSectors(): Sector[] {
  return useSyncExternalStore(subscribeSectors, getSectors, getSectors)
}
