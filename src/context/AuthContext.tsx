import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser, UserRole } from '@/types/auth.types'
import { getRedirectByRole } from '@/mocks/users.mock'
import { supabase } from '@/integrations/supabase/client'
import { checkLockout, recordLoginAttempt, lockoutMessage, GENERIC_LOGIN_ERROR, withTimeout } from '@/services/authGuard'

const TOKEN_KEY = 'axis_inova_token'
const USER_KEY = 'axis_inova_user'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
  /** Segundos restantes de bloqueio, quando aplicável */
  lockedFor?: number
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  refreshUser: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  impersonation: { companyId: string; companyName: string } | null
  setImpersonation: (data: { companyId: string; companyName: string } | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [impersonation, setImpersonation] = useState<{ companyId: string; companyName: string } | null>(null)

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
    const savedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AuthUser
        setUser(parsed)
        setToken(savedToken)
        setIsAuthenticated(true)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(USER_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const identifier = email.trim().toLowerCase()
    const NET_ERROR = 'Não foi possível conectar ao servidor. Verifique a internet e tente novamente.'

    try {
      // 1. Server-side lockout check (never trusts client-side counters; times out instead of hanging)
      const lockState = await checkLockout(identifier)
      if (lockState?.locked) {
        return { success: false, error: lockoutMessage(lockState.retry_after_seconds), lockedFor: lockState.retry_after_seconds }
      }

      // 2. Backend auth
      const authRes = await withTimeout(supabase.auth.signInWithPassword({ email: identifier, password }), 20000)
      if (!authRes) return { success: false, error: NET_ERROR }
      const { data: authData, error: authError } = authRes
      if (authError && authError.status !== 400) {
        console.error('login error', authError.status, authError.message)
        if (!authError.status || authError.status >= 500) return { success: false, error: NET_ERROR }
      }

      if (authData.user) {
        const profRes = await withTimeout(
          Promise.resolve(supabase
            .from('profiles')
            .select('full_name, role, company_id, is_active, must_change_password, is_admin')
            .eq('id', authData.user.id)
            .single()),
          15000,
        )
        if (!profRes) {
          await supabase.auth.signOut().catch(() => {})
          return { success: false, error: NET_ERROR }
        }
        const profile = profRes.data

        if (profile && !profile.is_active) {
          void recordLoginAttempt(identifier, false)
          await supabase.auth.signOut()
          return { success: false, error: GENERIC_LOGIN_ERROR }
        }

        // Successful login clears the failure counter server-side (does not block entry)
        void recordLoginAttempt(identifier, true)

        let companyName: string | null = null
        if (profile?.company_id) {
          const compRes = await withTimeout(
            Promise.resolve(supabase.from('companies').select('name, nome_fantasia').eq('id', profile.company_id).single()),
            10000,
          )
          const company = compRes?.data as any
          companyName = company?.nome_fantasia || company?.name || null
        }

        const authUser: AuthUser = {
          id: authData.user.id,
          name: profile?.full_name || authData.user.email || '',
          email: authData.user.email || '',
          role: (profile?.role as UserRole) || 'company_admin',
          companyId: profile?.company_id || null,
          companyName,
          isActive: profile?.is_active ?? true,
          mustChangePassword: (profile as any)?.must_change_password === true,
          isAdmin: (profile as any)?.is_admin === true,
          lastLogin: new Date().toISOString(),
        }

        const newToken = authData.session?.access_token || `supabase_token_${Date.now()}`
        try {
          localStorage.setItem(TOKEN_KEY, newToken)
          localStorage.setItem(USER_KEY, JSON.stringify(authUser))
        } catch { /* storage cheio/bloqueado: segue só na memória */ }
        setUser(authUser)
        setToken(newToken)
        setIsAuthenticated(true)

        const redirectTo = authUser.mustChangePassword ? '/primeiro-acesso' : getRedirectByRole(authUser.role)
        return { success: true, redirectTo }
      }

      // Failed attempt: record server-side and apply lockout rules.
      const postState = await recordLoginAttempt(identifier, false)
      if (postState?.locked) {
        return { success: false, error: lockoutMessage(postState.retry_after_seconds), lockedFor: postState.retry_after_seconds }
      }

      return { success: false, error: GENERIC_LOGIN_ERROR }
    } catch (err) {
      console.error('login failed', err)
      return { success: false, error: NET_ERROR }
    }
  }, [])

  const logout = useCallback(() => {
    void supabase.auth.signOut()
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem('axis_inova_session')
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    setImpersonation(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, company_id, is_active, must_change_password, is_admin')
      .eq('id', authUser.id)
      .single()
    setUser((prev) => {
      if (!prev) return prev
      const updated: AuthUser = {
        ...prev,
        name: profile?.full_name || prev.name,
        role: (profile?.role as UserRole) || prev.role,
        companyId: profile?.company_id ?? prev.companyId,
        isActive: profile?.is_active ?? prev.isActive,
        mustChangePassword: (profile as any)?.must_change_password === true,
        isAdmin: (profile as any)?.is_admin === true,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const forgotPassword = useCallback(async (_email: string) => {
    await new Promise((r) => setTimeout(r, 1500))
  }, [])

  const resetPassword = useCallback(async (_token: string, _newPassword: string) => {
    await new Promise((r) => setTimeout(r, 1500))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
        forgotPassword,
        resetPassword,
        impersonation,
        setImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
