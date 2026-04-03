import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { Profile, Sector, MenuFunction, SystemModule, PermissionAction } from '@/types/permissions.types'
import type { CompanyUser } from '@/types/company-portal.types'
import { MOCK_COMPANY_PROFILES, MOCK_COMPANY_USERS, MOCK_SECTORS, getFunctionsForProfile, getUtilitiesForProfile } from '@/mocks/company.mock'

const SESSION_KEY = 'axis_inova_company_session'

interface CompanyContextValue {
  companyUser: CompanyUser | null
  profiles: Profile[]
  activeProfile: Profile | null
  activeSector: Sector | null
  availableSectors: Sector[]
  availableFunctions: MenuFunction[]
  availableUtilities: MenuFunction[]
  selectProfile: (profile: Profile) => void
  selectSector: (sector: Sector) => void
  confirmSession: () => void
  clearSession: () => void
  switchProfile: (profileId: string) => void
  switchSector: (sectorId: string) => void
  canAccess: (module: SystemModule, action?: PermissionAction) => boolean
  isSessionReady: boolean
  allProfiles: Profile[]
  allSectors: Sector[]
  allUsers: CompanyUser[]
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

function getUserProfiles(userId: string): Profile[] {
  const user = MOCK_COMPANY_USERS.find(u => u.id === userId)
  if (!user) return []
  return MOCK_COMPANY_PROFILES.filter(p => user.profiles.includes(p.id) && p.isActive)
}

function getSectorsForProfile(profile: Profile): Sector[] {
  return MOCK_SECTORS.filter(s => s.allowedProfiles.includes(profile.id) && s.isActive)
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
  const [isSessionReady, setIsSessionReady] = useState(false)

  const companyUserId = user ? getCompanyUserId(user.id) : null
  const companyUser = companyUserId ? MOCK_COMPANY_USERS.find(u => u.id === companyUserId) || null : null
  const profiles = user ? getUserProfiles(companyUserId || '') : []
  const availableSectors = activeProfile ? getSectorsForProfile(activeProfile) : []
  const availableFunctions = activeProfile ? getFunctionsForProfile(activeProfile) : []
  const availableUtilities = activeProfile ? getUtilitiesForProfile(activeProfile) : []

  // Restore session
  useEffect(() => {
    if (!user) {
      setActiveProfile(null)
      setActiveSector(null)
      setIsSessionReady(false)
      return
    }

    // company_admin and super_admin bypass
    if (user.role === 'super_admin' || user.role === 'company_admin') {
      const profs = getUserProfiles(companyUserId || '')
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
        return
      }
    }
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
      clearSession()
      setActiveProfile(p)
    }
  }, [profiles, clearSession])

  const switchSector = useCallback((sectorId: string) => {
    const s = MOCK_SECTORS.find(x => x.id === sectorId)
    if (s && activeProfile) {
      setActiveSector(s)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: activeProfile.id, sectorId: s.id }))
    }
  }, [activeProfile])

  const canAccess = useCallback((module: SystemModule, action?: PermissionAction): boolean => {
    if (!user) return false
    if (user.role === 'super_admin' || user.role === 'company_admin') return true
    if (!activeProfile) return false
    const perms = activeProfile.permissions[module]
    if (!perms) return false
    if (!action) return perms.length > 0
    return perms.includes(action)
  }, [user, activeProfile])

  return (
    <CompanyContext.Provider value={{
      companyUser, profiles, activeProfile, activeSector, availableSectors,
      availableFunctions, availableUtilities,
      selectProfile, selectSector, confirmSession, clearSession,
      switchProfile, switchSector, canAccess, isSessionReady,
      allProfiles: MOCK_COMPANY_PROFILES, allSectors: MOCK_SECTORS, allUsers: MOCK_COMPANY_USERS,
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
