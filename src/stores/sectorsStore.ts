import { useSyncExternalStore } from 'react'
import { MOCK_SECTORS } from '@/mocks/company.mock'
import type { Sector } from '@/types/permissions.types'
import { supabase } from '@/integrations/supabase/client'

/**
 * Store compartilhado de Setores.
 * Persiste no Supabase (tabela profiles_sectors para vínculos de usuários).
 */
let sectors: Sector[] = [...MOCK_SECTORS]
/** sectorId -> lista de profileIds vinculados (Usuários do Setor - na verdade são Perfis) */
let sectorUsers: Record<string, string[]> = {}
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

/**
 * Carrega os vínculos do banco de dados
 */
export async function loadSectorUsers(companyId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles_sectors' as any)
      .select('profile_id, sector_id')
      .eq('company_id', companyId)
    
    if (error) throw error
    
    const mapping: Record<string, string[]> = {}
    data?.forEach((row: any) => {
      if (!mapping[row.sector_id]) mapping[row.sector_id] = []
      mapping[row.sector_id].push(row.profile_id)
    })
    
    sectorUsers = mapping
    emit()
  } catch (err) {
    console.error('Erro ao carregar vínculos de setores:', err)
  }
}

export async function setSectorUsers(sectorId: string, profileIds: string[], companyId: string) {
  try {
    // 1. Remove vínculos antigos do setor
    await supabase
      .from('profiles_sectors' as any)
      .delete()
      .eq('sector_id', sectorId)
      .eq('company_id', companyId)
    
    // 2. Insere novos
    if (profileIds.length > 0) {
      const inserts = profileIds.map(pid => ({
        profile_id: pid,
        sector_id: sectorId,
        company_id: companyId
      }))
      
      await supabase
        .from('profiles_sectors' as any)
        .insert(inserts)
    }

    sectorUsers = { ...sectorUsers, [sectorId]: profileIds }
    emit()
  } catch (err) {
    console.error('Erro ao salvar vínculos de setores:', err)
    throw err
  }
}

/** Setores em que o perfil (usuário logado) está vinculado */
export function getSectorsForUser(profileId: string): Sector[] {
  return sectors.filter(s => s.isActive && (sectorUsers[s.id] || []).includes(profileId))
}

/** IDs de perfis liberados ao usuário através dos setores em que está vinculado */
export function getAllowedProfileIdsForUser(profileId: string): string[] | null {
  const linked = getSectorsForUser(profileId)
  if (linked.length === 0) return null 
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
