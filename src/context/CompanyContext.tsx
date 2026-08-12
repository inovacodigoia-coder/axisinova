import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { Profile, Sector, MenuFunction, SystemModule, PermissionAction } from '@/types/permissions.types'
import type { CompanyUser, Origin } from '@/types/company-portal.types'
import { MOCK_COMPANY_USERS, getFunctionsForProfile, getUtilitiesForProfile } from '@/mocks/company.mock'
import { getSectors, useSectors, getAllowedProfileIdsForUser, useSectorUsers } from '@/stores/sectorsStore'
import { getProfiles, useProfiles } from '@/stores/profilesStore'

import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const SESSION_KEY = 'axis_inova_company_session'
const ORIGIN_KEY = 'axis_inova_active_origin'

interface CompanyContextValue {
  companyUser: CompanyUser | null
  profiles: Profile[]
  activeProfile: Profile | null
  activeSector: Sector | null
  activeOrigin: Origin | null
  availableSectors: Sector[]
  availableOrigins: Origin[]
  availableFunctions: MenuFunction[]
  availableUtilities: MenuFunction[]
  selectProfile: (profile: Profile) => void
  selectSector: (sector: Sector) => void
  selectOrigin: (origin: Origin) => void
  confirmSession: () => void
  clearSession: () => void
  switchProfile: (profileId: string) => void
  switchSector: (sectorId: string) => void
  canAccess: (module: SystemModule, action?: PermissionAction) => boolean
  isSessionReady: boolean
  isSessionHydrated: boolean
  allProfiles: Profile[]
  allSectors: Sector[]
  allUsers: CompanyUser[]
  refreshOrigins: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

function getUserProfiles(userId: string, role?: string, authUserId?: string): Profile[] {
  const all = getProfiles().filter(p => p.isActive)

  // Perfis liberados pelos setores em que o usuário está vinculado (Usuários do Setor)
  const allowedBySector = authUserId ? getAllowedProfileIdsForUser(authUserId) : null
  if (allowedBySector) {
    return all.filter(p => allowedBySector.includes(p.id))
  }

  // Real Supabase users with admin role get all active profiles
  if (role === 'super_admin' || role === 'company_admin') {
    return all
  }
  const user = MOCK_COMPANY_USERS.find(u => u.id === userId)
  if (!user) return []
  return all.filter(p => user.profiles.includes(p.id))
}


function getSectorsForProfile(profile: Profile): Sector[] {
  // Setores sem perfis vinculados ficam disponíveis para todos (ex.: setor recém-criado)
  return getSectors().filter(s => s.isActive && (s.allowedProfiles.length === 0 || s.allowedProfiles.includes(profile.id)))
}

// Map auth user IDs to company user IDs
function getCompanyUserId(authId: string): string | null {
  const map: Record<string, string> = {
    'u_ca_001': 'cu_01',
    'u_doc_001': 'cu_02',
    'u_rec_001': 'cu_03',
    'u_bil_001': 'cu_05',
    'u_tel_001': 'cu_06',
  }
  return map[authId] || null
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [activeSector, setActiveSector] = useState<Sector | null>(null)
  const [activeOrigin, setActiveOrigin] = useState<Origin | null>(null)
  const [availableOrigins, setAvailableOrigins] = useState<Origin[]>([])
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [isSessionHydrated, setIsSessionHydrated] = useState(false)

  const refreshOrigins = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('origins')
      .select(`
        *,
        establishments (
          id,
          name,
          internal_code
        )
      `)
      .eq('company_id', user.companyId)
      .order('name')
    if (error) {
      console.error('Error fetching origins:', error)
      return
    }
    setAvailableOrigins(data || [])
    
    // Check for default origin preference
    const { data: pref } = await supabase
      .from('user_origin_preferences')
      .select('origin_id')
      .eq('user_id', user.id)
      .eq('company_id', user.companyId)
      .eq('is_default', true)
      .maybeSingle()
    
    if (pref && data) {
      const defaultOrigin = data.find((o: any) => o.id === pref.origin_id)
      if (defaultOrigin && !activeOrigin) {
        setActiveOrigin(defaultOrigin)
      }
    } else if (data && data.length > 0 && !activeOrigin) {
      const savedOriginId = localStorage.getItem(ORIGIN_KEY)
      const savedOrigin = data.find((o: any) => o.id === savedOriginId)
      if (savedOrigin) {
        setActiveOrigin(savedOrigin)
      } else {
        const matriz = data.find((o: any) => o.internal_code === '00' || o.name.toUpperCase().includes('MATRIZ'))
        setActiveOrigin(matriz || data[0])
      }
    }
  }, [user, activeOrigin])

  useEffect(() => {
    if (user) refreshOrigins()
  }, [user, refreshOrigins])

  const selectOrigin = useCallback((origin: Origin) => {
    setActiveOrigin(origin)
    localStorage.setItem(ORIGIN_KEY, origin.id)
  }, [])

  const companyUserId = user ? getCompanyUserId(user.id) : null
  const companyUser = companyUserId ? MOCK_COMPANY_USERS.find(u => u.id === companyUserId) || null : null
  const allProfiles = useProfiles()
  useSectorUsers()
  const profiles = user ? getUserProfiles(companyUserId || '', user.role, user.id) : []
  const allSectors = useSectors()

  const availableSectors = activeProfile ? getSectorsForProfile(activeProfile) : []
  const availableFunctions = activeProfile ? getFunctionsForProfile(activeProfile) : []
  const availableUtilities = activeProfile ? getUtilitiesForProfile(activeProfile) : []

  // Restore session
  useEffect(() => {
    setIsSessionHydrated(false)

    if (!user) {
      setActiveProfile(null)
      setActiveSector(null)
      setIsSessionReady(false)
      setIsSessionHydrated(true)
      return
    }

    // company_admin and super_admin bypass
    if (user.role === 'super_admin' || user.role === 'company_admin') {
      const profs = getUserProfiles(companyUserId || '', user.role)
      if (profs.length > 0) {
        const saved = sessionStorage.getItem(SESSION_KEY)
        if (saved) {
          try {
            const { profileId, sectorId } = JSON.parse(saved)
            const p = profs.find(x => x.id === profileId)
            if (p) {
              const sectors = getSectorsForProfile(p)
              const s = sectors.find(x => x.id === sectorId)
              setActiveProfile(p)
              setActiveSector(s || sectors[0] || null)
              setIsSessionReady(true)
              setIsSessionHydrated(true)
              return
            }
          } catch { /* ignore */ }
        }
        // Auto-select for single profile + single sector
        if (profs.length === 1) {
          const sectors = getSectorsForProfile(profs[0])
          if (sectors.length === 1) {
            setActiveProfile(profs[0])
            setActiveSector(sectors[0])
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: profs[0].id, sectorId: sectors[0].id }))
            setIsSessionReady(true)
            setIsSessionHydrated(true)
            return
          }
        }
      }
    }

    // Try restore from session
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const { profileId, sectorId } = JSON.parse(saved)
        const p = profiles.find(x => x.id === profileId)
        if (p) {
          const sectors = getSectorsForProfile(p)
          const s = sectors.find(x => x.id === sectorId)
          setActiveProfile(p)
          setActiveSector(s || null)
          if (s) setIsSessionReady(true)
          setIsSessionHydrated(true)
          return
        }
      } catch { /* ignore */ }
    }

    // Auto-select single profile + sector
    if (profiles.length === 1) {
      const sectors = getSectorsForProfile(profiles[0])
      if (sectors.length === 1) {
        setActiveProfile(profiles[0])
        setActiveSector(sectors[0])
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: profiles[0].id, sectorId: sectors[0].id }))
        setIsSessionReady(true)
        setIsSessionHydrated(true)
        return
      }
    }

    setActiveProfile(null)
    setActiveSector(null)
    setIsSessionReady(false)
    setIsSessionHydrated(true)
  }, [user?.id])

  const selectProfile = useCallback((profile: Profile) => {
    setActiveProfile(profile)
    const sectors = getSectorsForProfile(profile)
    if (sectors.length === 1) {
      setActiveSector(sectors[0])
    } else {
      setActiveSector(null)
    }
  }, [])

  const selectSector = useCallback((sector: Sector) => {
    setActiveSector(sector)
  }, [])

  const confirmSession = useCallback(() => {
    if (activeProfile && activeSector) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: activeProfile.id, sectorId: activeSector.id }))
      setIsSessionReady(true)
    }
  }, [activeProfile, activeSector])

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setActiveProfile(null)
    setActiveSector(null)
    setIsSessionReady(false)
  }, [])

  const switchProfile = useCallback((profileId: string) => {
    const p = profiles.find(x => x.id === profileId)
    if (p) {
      setActiveProfile(p)
      const sectors = getSectorsForProfile(p)
      if (sectors.length === 1) {
        setActiveSector(sectors[0])
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: p.id, sectorId: sectors[0].id }))
        setIsSessionReady(true)
      } else {
        setActiveSector(null)
        setIsSessionReady(false)
      }
    }
  }, [profiles])

  const switchSector = useCallback((sectorId: string) => {
    const s = getSectors().find(x => x.id === sectorId)
    if (s && activeProfile) {
      setActiveSector(s)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: activeProfile.id, sectorId: s.id }))
    }
  }, [activeProfile])

  const canAccess = useCallback((module: SystemModule, action?: PermissionAction): boolean => {
    if (!user) return false
    // O perfil ativo sempre define o que está liberado, inclusive para administradores.
    if (!activeProfile) {
      return user.role === 'super_admin' || user.role === 'company_admin'
    }
    const perms = activeProfile.permissions[module]
    if (!perms) return false
    if (!action) return perms.length > 0
    return perms.includes(action)
  }, [user, activeProfile])

  return (
    <CompanyContext.Provider value={{
      companyUser, profiles, activeProfile, activeSector, activeOrigin,
      availableSectors, availableOrigins, availableFunctions, availableUtilities,
      selectProfile, selectSector, selectOrigin, confirmSession, clearSession,
      switchProfile, switchSector, canAccess, isSessionReady, isSessionHydrated,
      allProfiles: MOCK_COMPANY_PROFILES, allSectors: allSectors, allUsers: MOCK_COMPANY_USERS,
      refreshOrigins,
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompanyContext() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompanyContext must be used within CompanyProvider')
  return ctx
}
