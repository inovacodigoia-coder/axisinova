import { useSyncExternalStore } from 'react'
import { MOCK_COMPANY_PROFILES } from '@/mocks/company.mock'
import type { Profile } from '@/types/permissions.types'

/**
 * Store compartilhado de Perfis de Acesso.
 * Mantém a lista viva entre a tela de Setores, a Gestão de Perfis e o CompanyContext,
 * de modo que perfis criados/editados/excluídos apareçam imediatamente em todo o sistema.
 */
let profiles: Profile[] = [...MOCK_COMPANY_PROFILES]
const listeners = new Set<() => void>()

function emit() {
  profiles = [...profiles]
  listeners.forEach(l => l())
}

export function getProfiles(): Profile[] {
  return profiles
}

export function subscribeProfiles(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function upsertProfile(profile: Profile) {
  const idx = profiles.findIndex(p => p.id === profile.id)
  if (idx >= 0) profiles[idx] = profile
  else profiles.push(profile)
  emit()
}

export function removeProfile(profileId: string) {
  profiles = profiles.filter(p => p.id !== profileId)
  emit()
}

export function useProfiles(): Profile[] {
  return useSyncExternalStore(subscribeProfiles, getProfiles, getProfiles)
}
