import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser, UserRole } from '@/types/auth.types'
import { getRedirectByRole } from '@/mocks/users.mock'
import { supabase } from '@/integrations/supabase/client'

const TOKEN_KEY = 'axis_inova_token'
const USER_KEY = 'axis_inova_user'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
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

    // 1. Server-side lockout check (never trusts client-side counters)
    const lockState = await checkLockout(identifier)
    if (lockState?.locked) {
      return { success: false, error: lockoutMessage(lockState.retry_after_seconds), lockedFor: lockState.retry_after_seconds }
    }

    // 2. Backend auth
    const { data: authData } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authData.user) {
      // Fetch profile to get company info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, company_id, is_active, must_change_password, is_admin')
        .eq('id', authData.user.id)
        .single()

      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        return { success: false, error: 'Usuário inativo. Contate o administrador.' }
      }

      // Get company name if linked
      let companyName: string | null = null
      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, nome_fantasia')
          .eq('id', profile.company_id)
          .single()
        companyName = (company as any)?.nome_fantasia || company?.name || null
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
      localStorage.setItem(TOKEN_KEY, newToken)
      localStorage.setItem(USER_KEY, JSON.stringify(authUser))
      setUser(authUser)
      setToken(newToken)
      setIsAuthenticated(true)

      const redirectTo = authUser.mustChangePassword ? '/primeiro-acesso' : getRedirectByRole(authUser.role)
      return { success: true, redirectTo }
    }

    // No client-side fallback: only backend-verified sessions are accepted.
    return {
      success: false,
      error: authError?.message === 'Email not confirmed'
        ? 'E-mail ainda não confirmado.'
        : 'Credenciais inválidas',
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
