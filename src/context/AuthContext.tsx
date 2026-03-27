import { createContext, useCallback, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthState, AuthUser, UserRole } from '@/types/auth.types'
import { MOCK_USERS_AUTH } from '@/mocks/superadmin.mock'

const TOKEN_KEY = 'axis_inova_token'

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN'; payload: { user: AuthUser; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'SET_IMPERSONATION'; payload: { companyId: string; companyName: string } | null }

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  impersonation: { companyId: string; companyName: string } | null
  setImpersonation: (data: { companyId: string; companyName: string } | null) => void
}

const initialState: AuthState & { impersonation: { companyId: string; companyName: string } | null } = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  impersonation: null,
}

function reducer(state: typeof initialState, action: AuthAction): typeof initialState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false }
    case 'LOGOUT':
      return { ...initialState, isLoading: false }
    case 'SET_IMPERSONATION':
      return { ...state, impersonation: action.payload }
    default:
      return state
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

function buildAuthUser(mock: typeof MOCK_USERS_AUTH[0]): AuthUser {
  return {
    id: mock.id,
    name: mock.name,
    email: mock.email,
    role: mock.role as UserRole,
    companyId: ('companyId' in mock ? (mock as any).companyId : null) as string | null,
    companyName: ('companyName' in mock ? (mock as any).companyName : null) as string | null,
    lastLogin: new Date().toISOString(),
    isActive: true,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const mock = MOCK_USERS_AUTH.find((u) => u.email === parsed.email)
        if (mock) {
          dispatch({ type: 'LOGIN', payload: { user: buildAuthUser(mock), token: parsed.token } })
          return
        }
      } catch { /* ignore */ }
    }
    dispatch({ type: 'SET_LOADING', payload: false })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 1500))
    const mock = MOCK_USERS_AUTH.find((u) => u.email === email && u.password === password)
    if (!mock) throw new Error('Credenciais inválidas')
    const user = buildAuthUser(mock)
    const token = `mock_token_${Date.now()}`
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ email, token }))
    dispatch({ type: 'LOGIN', payload: { user, token } })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem('axis_inova_session')
    dispatch({ type: 'LOGOUT' })
  }, [])

  const forgotPassword = useCallback(async (_email: string) => {
    await new Promise((r) => setTimeout(r, 1500))
  }, [])

  const resetPassword = useCallback(async (_token: string, _newPassword: string) => {
    await new Promise((r) => setTimeout(r, 1500))
  }, [])

  const setImpersonation = useCallback((data: { companyId: string; companyName: string } | null) => {
    dispatch({ type: 'SET_IMPERSONATION', payload: data })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, forgotPassword, resetPassword, impersonation: state.impersonation, setImpersonation }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
