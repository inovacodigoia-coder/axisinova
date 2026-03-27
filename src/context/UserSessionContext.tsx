import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { UserProfile, Sector, UserSession, ModuleKey, Permission } from '@/types/profile.types'
import { useAuth } from '@/context/AuthContext'
import { getProfilesForUser } from '@/mocks/profiles.mock'

const SESSION_KEY = 'axis_inova_session'

interface UserSessionContextValue {
  session: UserSession
  selectProfile: (profile: UserProfile) => void
  selectSector: (sector: Sector) => void
  confirmSession: () => void
  clearSession: () => void
  canAccess: (module: ModuleKey, action?: Permission['action']) => boolean
  getFunctions: () => UserProfile['functions']
  getUtilities: () => UserProfile['utilities']
  isSessionReady: boolean
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null)

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [session, setSession] = useState<UserSession>({
    selectedProfile: null,
    selectedSector: null,
    availableProfiles: [],
  })
  const [isSessionReady, setIsSessionReady] = useState(false)

  // Load profiles for user and restore session
  useEffect(() => {
    if (!user) {
      setSession({ selectedProfile: null, selectedSector: null, availableProfiles: [] })
      setIsSessionReady(false)
      return
    }

    const profiles = getProfilesForUser(user.id)
    const saved = sessionStorage.getItem(SESSION_KEY)

    if (saved) {
      try {
        const { profileId, sectorId } = JSON.parse(saved)
        const profile = profiles.find(p => p.id === profileId)
        const sector = profile?.sectors.find(s => s.id === sectorId)
        if (profile && sector) {
          setSession({ selectedProfile: profile, selectedSector: sector, availableProfiles: profiles })
          setIsSessionReady(true)
          return
        }
      } catch { /* ignore */ }
    }

    // Auto-select if single profile + single sector
    if (profiles.length === 1 && profiles[0].sectors.length === 1) {
      setSession({
        selectedProfile: profiles[0],
        selectedSector: profiles[0].sectors[0],
        availableProfiles: profiles,
      })
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: profiles[0].id, sectorId: profiles[0].sectors[0].id }))
      setIsSessionReady(true)
      return
    }

    // Super admin bypasses profile selection
    if (user.role === 'super_admin') {
      if (profiles.length > 0) {
        setSession({
          selectedProfile: profiles[0],
          selectedSector: profiles[0].sectors[0],
          availableProfiles: profiles,
        })
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ profileId: profiles[0].id, sectorId: profiles[0].sectors[0].id }))
        setIsSessionReady(true)
        return
      }
    }

    setSession(prev => ({ ...prev, availableProfiles: profiles }))
    setIsSessionReady(false)
  }, [user])

  const selectProfile = useCallback((profile: UserProfile) => {
    setSession(prev => ({
      ...prev,
      selectedProfile: profile,
      selectedSector: profile.sectors.length === 1 ? profile.sectors[0] : null,
    }))
  }, [])

  const selectSector = useCallback((sector: Sector) => {
    setSession(prev => ({ ...prev, selectedSector: sector }))
  }, [])

  const confirmSession = useCallback(() => {
    if (session.selectedProfile && session.selectedSector) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        profileId: session.selectedProfile.id,
        sectorId: session.selectedSector.id,
      }))
      setIsSessionReady(true)
    }
  }, [session])

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(prev => ({ ...prev, selectedProfile: null, selectedSector: null }))
    setIsSessionReady(false)
  }, [])

  const canAccess = useCallback((module: ModuleKey, action?: Permission['action']): boolean => {
    if (!user) return false
    if (user.role === 'super_admin' || user.role === 'company_admin') return true
    if (!session.selectedProfile) return false
    return session.selectedProfile.permissions.some(
      p => p.module === module && (!action || p.action === action)
    )
  }, [user, session.selectedProfile])

  const getFunctions = useCallback(() => session.selectedProfile?.functions || [], [session.selectedProfile])
  const getUtilities = useCallback(() => session.selectedProfile?.utilities || [], [session.selectedProfile])

  return (
    <UserSessionContext.Provider value={{ session, selectProfile, selectSector, confirmSession, clearSession, canAccess, getFunctions, getUtilities, isSessionReady }}>
      {children}
    </UserSessionContext.Provider>
  )
}

export function useUserSession() {
  const ctx = useContext(UserSessionContext)
  if (!ctx) throw new Error('useUserSession must be used within UserSessionProvider')
  return ctx
}
