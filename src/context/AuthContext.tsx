import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthUser, UserRole } from '@/types/auth.types'
import { authenticateUser, getRedirectByRole } from '@/mocks/users.mock'

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
    await new Promise((r) => setTimeout(r, 1200))

    const credential = authenticateUser(email, password)

    if (!credential) {
      return { success: false, error: 'Credenciais inválidas' }
    }

    if (!credential.user.isActive) {
      return { success: false, error: 'Usuário inativo. Contate o administrador.' }
    }

    const newToken = `mock_token_${credential.user.id}_${Date.now()}`

    // Default to localStorage; caller can switch to sessionStorage via rememberMe logic
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(credential.user))

    setUser(credential.user)
    setToken(newToken)
    setIsAuthenticated(true)

    const redirectTo = getRedirectByRole(credential.user.role)
    return { success: true, redirectTo }
  }, [])

  const logout = useCallback(() => {
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
