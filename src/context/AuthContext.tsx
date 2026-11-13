import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AuthUser, UserRole } from '@/types/auth.types'
import { getRedirectByRole } from '@/mocks/users.mock'
import { supabase } from '@/integrations/supabase/client'
import { checkLockout, recordLoginAttempt, lockoutMessage, GENERIC_LOGIN_ERROR, withTimeout } from '@/services/authGuard'
import {
  LOGIN_PRAZO_MS, MSG_SERVIDOR_LENTO, MSG_CONTA_INATIVA, MSG_SEM_ACESSO,
  chamarComPrazo, falhaPassageiraAuth, falhaPassageiraConsulta, servidorOcupado, type TipoErroLogin,
} from '@/lib/loginResiliente'

/** Só o necessário para liberar o acesso: usuário, empresa e perfil, numa única consulta. */
const PERFIL_LOGIN_COLUNAS = 'full_name, role, company_id, is_active, must_change_password, is_admin, empresa:companies!profiles_company_id_fkey(name, nome_fantasia)'

const TOKEN_KEY = 'axis_inova_token'
const USER_KEY = 'axis_inova_user'

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
  /** Segundos restantes de bloqueio, quando aplicável */
  lockedFor?: number
  /** Falha de conexão/servidor — não conta como tentativa de senha */
  networkError?: boolean
  /** Tipo do erro, para a tela mostrar a mensagem certa */
  tipoErro?: TipoErroLogin
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

  // Keep the cached company name in sync with the database (e.g. after editing Dados da Empresa)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (!isAuthenticated || restoredRef.current) return
    restoredRef.current = true
    void refreshUserRef.current?.()
  }, [isAuthenticated])
  const refreshUserRef = useRef<(() => Promise<void>) | null>(null)

  // Saída em andamento (botão Sair ou limpeza de uma entrada abandonada). A próxima entrada espera
  // ela terminar um pouco, para a saída atrasada não apagar o acesso recém-criado.
  const saidaPendenteRef = useRef<Promise<unknown> | null>(null)
  const loginEmAndamentoRef = useRef(false)
  const autenticadoRef = useRef(false)
  autenticadoRef.current = isAuthenticated

  const sairLocal = useCallback(() => {
    const p = supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    saidaPendenteRef.current = p
    void p.finally(() => { if (saidaPendenteRef.current === p) saidaPendenteRef.current = null })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const identifier = email.trim().toLowerCase()
    const prazoFinal = Date.now() + LOGIN_PRAZO_MS
    const SERVIDOR: LoginResult = { success: false, error: MSG_SERVIDOR_LENTO, networkError: true, tipoErro: 'servidor' }
    loginEmAndamentoRef.current = true

    try {
      if (saidaPendenteRef.current) await withTimeout(saidaPendenteRef.current, 3000)

      // 1. Verificação de bloqueio (servidor) em paralelo com a entrada: não soma o tempo das duas.
      const bloqueioP = checkLockout(identifier)

      // 2. Entrada. Erro de rede/5xx repete sozinho (até 2x, espera 2 s); senha errada volta na hora.
      const entrada = await chamarComPrazo(
        () => supabase.auth.signInWithPassword({ email: identifier, password }),
        {
          prazoFinal,
          ehFalhaPassageira: falhaPassageiraAuth,
          // Resposta que chega depois de desistirmos: não deixa um acesso solto no navegador.
          aoAbandonar: (p) => {
            void p.then((r) => {
              if (r?.data?.session && !loginEmAndamentoRef.current && !autenticadoRef.current) sairLocal()
            }, () => {})
          },
        },
      )
      if (entrada.tipo !== 'ok') {
        console.warn('[login] entrada sem resposta:', entrada.tipo)
        return SERVIDOR
      }
      const { data: authData, error: authError } = entrada.valor
      if (authError && authError.status !== 400) console.error('login error', authError.status, authError.message)
      if (servidorOcupado(entrada.valor)) return SERVIDOR

      const lockState = await withTimeout(bloqueioP, Math.max(0, prazoFinal - Date.now()))
      if (lockState?.locked) {
        if (authData.session) sairLocal()
        return { success: false, error: lockoutMessage(lockState.retry_after_seconds), lockedFor: lockState.retry_after_seconds, tipoErro: 'bloqueado' }
      }

      if (authData.user) {
        // 3. Única consulta para liberar o acesso: perfil + empresa.
        const perfilRes = await chamarComPrazo(
          () => Promise.resolve(supabase
            .from('profiles')
            .select(PERFIL_LOGIN_COLUNAS)
            .eq('id', authData.user.id)
            .maybeSingle()) as any,
          { prazoFinal, ehFalhaPassageira: falhaPassageiraConsulta as any },
        ) as any
        if (perfilRes.tipo !== 'ok') {
          sairLocal()
          return SERVIDOR
        }
        const profile = perfilRes.valor.data as any
        if (perfilRes.valor.error) console.error('login profile error', perfilRes.valor.status, perfilRes.valor.error?.message)

        if (!profile) {
          sairLocal()
          return { success: false, error: MSG_SEM_ACESSO, tipoErro: 'sem_acesso' }
        }

        if (!profile.is_active) {
          void recordLoginAttempt(identifier, false)
          sairLocal()
          return { success: false, error: MSG_CONTA_INATIVA, tipoErro: 'sem_acesso' }
        }

        // Successful login clears the failure counter server-side (does not block entry)
        void recordLoginAttempt(identifier, true)

        const empresa = profile.empresa as { name?: string; nome_fantasia?: string } | null
        const companyName: string | null = empresa?.nome_fantasia || empresa?.name || null

        const authUser: AuthUser = {
          id: authData.user.id,
          name: profile.full_name || authData.user.email || '',
          email: authData.user.email || '',
          role: (profile.role as UserRole) || 'company_admin',
          companyId: profile.company_id || null,
          companyName,
          isActive: profile.is_active ?? true,
          mustChangePassword: profile.must_change_password === true,
          isAdmin: profile.is_admin === true,
          lastLogin: new Date().toISOString(),
        }

        const newToken = authData.session?.access_token || `supabase_token_${Date.now()}`
        try {
          localStorage.setItem(TOKEN_KEY, newToken)
          localStorage.setItem(USER_KEY, JSON.stringify(authUser))
        } catch { /* storage cheio/bloqueado: segue só na memória */ }
        // Acabou de carregar perfil e empresa: não repete a mesma busca ao autenticar.
        restoredRef.current = true
        setUser(authUser)
        setToken(newToken)
        setIsAuthenticated(true)

        const redirectTo = authUser.mustChangePassword ? '/primeiro-acesso' : getRedirectByRole(authUser.role)
        return { success: true, redirectTo }
      }

      // Failed attempt: record server-side and apply lockout rules.
      const postState = await recordLoginAttempt(identifier, false)
      if (postState?.locked) {
        return { success: false, error: lockoutMessage(postState.retry_after_seconds), lockedFor: postState.retry_after_seconds, tipoErro: 'bloqueado' }
      }

      return { success: false, error: GENERIC_LOGIN_ERROR, tipoErro: 'credenciais' }
    } catch (err) {
      console.error('login failed', err)
      return SERVIDOR
    } finally {
      loginEmAndamentoRef.current = false
    }
  }, [sairLocal])

  const logout = useCallback(() => {
    const saida = supabase.auth.signOut().catch(() => {})
    saidaPendenteRef.current = saida
    void saida.finally(() => { if (saidaPendenteRef.current === saida) saidaPendenteRef.current = null })
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
    // Sessão local (sem ida ao servidor de autenticação); a consulta ao perfil já valida o acesso.
    const { data: { session } } = await supabase.auth.getSession()
    const authUser = session?.user
    if (!authUser) return
    const { data: profile } = await supabase
      .from('profiles')
      .select(PERFIL_LOGIN_COLUNAS)
      .eq('id', authUser.id)
      .maybeSingle() as any
    if (!profile) return
    const empresa = profile.empresa as { name?: string; nome_fantasia?: string } | null
    const companyName: string | null | undefined = empresa ? (empresa.nome_fantasia || empresa.name || null) : undefined
    setUser((prev) => {
      if (!prev) return prev
      const updated: AuthUser = {
        ...prev,
        name: profile?.full_name || prev.name,
        role: (profile?.role as UserRole) || prev.role,
        companyId: profile?.company_id ?? prev.companyId,
        companyName: companyName !== undefined ? companyName : prev.companyName,
        isActive: profile?.is_active ?? prev.isActive,
        mustChangePassword: (profile as any)?.must_change_password === true,
        isAdmin: (profile as any)?.is_admin === true,
      }
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  refreshUserRef.current = refreshUser
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
