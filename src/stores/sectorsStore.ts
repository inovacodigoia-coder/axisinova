import { useSyncExternalStore } from 'react'
import { MOCK_SECTORS } from '@/mocks/company.mock'
import type { Sector } from '@/types/permissions.types'

/**
 * Store compartilhado de Setores.
 * Mantém a lista viva entre a tela de Setores e o CompanyContext (troca de perfil/setor),
 * de modo que setores criados ou editados apareçam imediatamente no seletor do usuário.
 */
let sectors: Sector[] = [...MOCK_SECTORS]
/** sectorId -> lista de userIds vinculados (Usuários do Setor) */
let sectorUsers: Record<string, string[]> = JSON.parse(localStorage.getItem('axis_inova_sector_users') || '{}')
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

export function removeSector(sectorId: string) {
  sectors = sectors.filter(s => s.id !== sectorId)
  delete sectorUsers[sectorId]
  emit()
}

/** Remove um perfil de todas as vinculações de setores (usado ao excluir perfil) */
export function detachProfileFromSectors(profileId: string) {
  sectors = sectors.map(s => ({
    ...s,
    allowedProfiles: s.allowedProfiles.filter(p => p !== profileId),
    allowedDeadlineEditProfiles: (s.allowedDeadlineEditProfiles || []).filter(p => p !== profileId),
  }))
  emit()
}

export function getSectorUsers(): Record<string, string[]> {
  return sectorUsers
}

export function setSectorUsers(sectorId: string, userIds: string[]) {
  sectorUsers = { ...sectorUsers, [sectorId]: userIds }
  localStorage.setItem('axis_inova_sector_users', JSON.stringify(sectorUsers))
  emit()
}

/** Setores em que o usuário está vinculado */
export function getSectorsForUser(userId: string): Sector[] {
  return sectors.filter(s => s.isActive && (sectorUsers[s.id] || []).includes(userId))
}

/** IDs de perfis liberados ao usuário através dos setores em que está vinculado */
export function getAllowedProfileIdsForUser(userId: string): string[] | null {
  const linked = getSectorsForUser(userId)
  if (linked.length === 0) return null // sem vínculo: mantém comportamento padrão
  const ids = new Set<string>()
  linked.forEach(s => s.allowedProfiles.forEach(p => ids.add(p)))
  return Array.from(ids)
}

export function useSectors(): Sector[] {
  return useSyncExternalStore(subscribeSectors, getSectors, getSectors)
}

export function useSectorUsers(): Record<string, string[]> {
  return useSyncExternalStore(subscribeSectors, getSectorUsers, getSectorUsers)
}
