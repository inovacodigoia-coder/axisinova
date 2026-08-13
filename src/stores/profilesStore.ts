import { useSyncExternalStore } from 'react'
import type { Profile } from '@/types/permissions.types'
import { supabase } from '@/integrations/supabase/client'

/**
 * Store compartilhado de Perfis de Acesso.
 * Mantém a lista viva entre a tela de Setores, a Gestão de Perfis e o CompanyContext,
 * de modo que perfis criados/editados/excluídos apareçam imediatamente em todo o sistema.
 */
let profiles: Profile[] = []
let hydratedFor: string | null = null
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

function fromRow(row: any): Profile {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || undefined,
    companyId: row.company_id,
    permissions: row.permissions || {},
    isActive: row.is_active,
    createdBy: row.created_by === 'it_team' ? 'it_team' : 'admin',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function hydrateProfiles(companyId: string) {
  if (!companyId || hydratedFor === companyId) return
  const { data, error } = await supabase
    .from('access_profiles')
    .select('*')
    .eq('company_id', companyId)
    .order('code')
  if (error) throw error
  profiles = (data || []).map(fromRow)
  hydratedFor = companyId
  emit()
}

export async function saveProfile(profile: Profile) {
  const { data, error } = await supabase
    .from('access_profiles')
    .upsert({
      id: profile.id,
      company_id: profile.companyId,
      code: profile.code,
      name: profile.name,
      description: profile.description || null,
      permissions: profile.permissions,
      is_active: profile.isActive,
      created_by: profile.createdBy,
    })
    .select('*')
    .single()
  if (error) throw error
  upsertProfile(fromRow(data))
}

export async function deleteProfile(profileId: string) {
  const { error } = await supabase.from('access_profiles').delete().eq('id', profileId)
  if (error) throw error
  removeProfile(profileId)
}

export function removeProfile(profileId: string) {
  profiles = profiles.filter(p => p.id !== profileId)
  emit()
}

export function useProfiles(): Profile[] {
  return useSyncExternalStore(subscribeProfiles, getProfiles, getProfiles)
}
