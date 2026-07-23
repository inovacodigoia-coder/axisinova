import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getRedirectByRole } from '@/mocks/users.mock'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Calendar, FileText, DollarSign, BarChart3, X, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import logoImg from '@/assets/logo-axisinova.jpeg'
import { toast } from 'sonner'
import { loadDevAccessConfig, type DevAccessCredential } from '@/utils/devAccessConfig'

const FEATURES = [
  { icon: Calendar, label: 'Agendamento inteligente' },
  { icon: FileText, label: 'Prontuário eletrônico' },
  { icon: DollarSign, label: 'Faturamento TISS/TUSS' },
  { icon: BarChart3, label: 'BI estratégico em tempo real' },
]

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const [shake, setShake] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Dev card
  const [devCardOpen, setDevCardOpen] = useState(true)
  const [devCardCollapsed, setDevCardCollapsed] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const typingTimeoutsRef = useRef<number[]>([])

  const clearTypingAnimation = useCallback(() => {
    typingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    typingTimeoutsRef.current = []
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      toast.success(`Você já está conectado como ${user.name}`)
      navigate(getRedirectByRole(user.role), { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // Clear error when typing
  useEffect(() => {
    if (error) setError(null)
  }, [email, password])

  useEffect(() => {
    return () => clearTypingAnimation()
  }, [clearTypingAnimation])

  const validateEmail = (v: string) => {
    if (!v) return null
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'E-mail inválido'
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (cooldown > 0 || isLoading) return

      const eErr = validateEmail(email)
      if (eErr) {
        setEmailError(eErr)
        return
      }
      if (!email || !password) return

      setIsLoading(true)
      setError(null)
      setEmailError(null)

      const result = await login(email, password)

      if (!result.success) {
        const newCount = failCount + 1
        setFailCount(newCount)
        setError(result.error || 'Credenciais inválidas')
        setShake(true)
        setTimeout(() => setShake(false), 400)

        if (newCount >= 5) {
          setCooldown(60)
          setFailCount(0)
        }
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true })
      }
    },
    [email, password, login, failCount, cooldown, isLoading, navigate]
  )

  // Typewriter fill for dev card
  const fillCredentials = useCallback((targetEmail: string, targetPassword: string) => {
    clearTypingAnimation()
    setEmail('')
    setPassword('')
    setError(null)
    setEmailError(null)

    targetEmail.split('').forEach((char, index) => {
      const timeoutId = window.setTimeout(() => {
        setEmail((prev) => prev + char)
      }, index * 15)

      typingTimeoutsRef.current.push(timeoutId)
    })

    const passwordStart = targetEmail.length * 15

    targetPassword.split('').forEach((char, index) => {
      const timeoutId = window.setTimeout(() => {
        setPassword((prev) => prev + char)
      }, passwordStart + index * 15)

      typingTimeoutsRef.current.push(timeoutId)
    })
  }, [clearTypingAnimation])

  const isDisabled = cooldown > 0 || isLoading || (!email && !password)
  const cooldownProgress = cooldown > 0 ? ((60 - cooldown) / 60) * 100 : 0

  const [devConfig, setDevConfig] = useState(() => loadDevAccessConfig())

  useEffect(() => {
    const handler = () => setDevConfig(loadDevAccessConfig())
    window.addEventListener('dev-access-config-changed', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('dev-access-config-changed', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const devCredentials: DevAccessCredential[] = devConfig.credentials

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left panel — gradient */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-10 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(190 100% 50%) 0%, hsl(262 93% 58%) 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5" />

        <div>
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Axis Inova" className="h-10 w-10 rounded-lg" />
            <div className="text-[28px] font-bold leading-none">
              <span className="text-white">Axis</span>
              <span className="text-white/80">Inova</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-white/60">Sistema de Gestão em Saúde</p>
        </div>

        <div className="space-y-8">
          <h2 className="text-4xl font-bold leading-tight">
            Gestão em saúde de
            <br />
            alto desempenho
          </h2>

          <div className="h-px bg-white/20" />

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-white/90">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/20" />

          {/* Social proof card */}
          <div className="rounded-xl border border-white/20 bg-white/[0.12] p-5">
            <p className="text-sm leading-relaxed text-white/90">
              "Mais de <strong>500 clínicas</strong> confiam no Axis Inova para gerenciar sua operação com excelência."
            </p>
          </div>
        </div>

        <p className="text-xs text-white/40">© 2025 Axis Inova · Todos os direitos reservados</p>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background"
      >
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img src={logoImg} alt="Axis Inova" className="h-12 w-12 rounded-xl mx-auto mb-2" />
            <span className="text-2xl font-bold text-foreground">Axis</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-[hsl(190,100%,50%)] to-[hsl(262,93%,58%)] bg-clip-text text-transparent">
              Inova
            </span>
          </div>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <h1 className="text-[28px] font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais para acessar o sistema</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-1.5">
              <label className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  placeholder="seu@email.com.br"
                  className={`flex h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary ${
                    emailError ? 'border-destructive focus:ring-destructive/40' : 'border-input focus:ring-primary/40'
                  } ${shake ? 'animate-shake' : ''}`}
                />
              </div>
              {emailError && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" /> {emailError}
                </p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-1.5">
              <label className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`flex h-11 w-full rounded-lg border bg-background pl-10 pr-10 text-sm transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary border-input ${shake ? 'animate-shake' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            {/* Options */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Lembrar-me por 30 dias
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <button
                type="submit"
                disabled={isDisabled}
                className="w-full h-12 rounded-lg text-[15px] font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, hsl(190 100% 50%) 0%, hsl(262 93% 58%) 100%)',
                  boxShadow: '0 4px 20px rgba(0,212,255,0.35)',
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Autenticando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </motion.div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p>{error}</p>
                    {failCount > 0 && failCount < 5 && (
                      <p className="text-xs mt-1 opacity-70">Tentativa {failCount} de 5</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cooldown banner */}
            <AnimatePresence>
              {cooldown > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Acesso temporariamente bloqueado
                    </span>
                    <span className="font-mono font-bold">
                      00:{cooldown.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-orange-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${cooldownProgress}%`,
                        background: `linear-gradient(90deg, hsl(0 70% 50%), hsl(120 70% 45%))`,
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Separator */}
            <div className="relative flex items-center gap-4 py-2">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <p className="text-center text-[13px] text-muted-foreground">
              Não tem acesso? Fale com o administrador
              <br />
              da sua clínica para obter suas credenciais.
            </p>

            <div className="border-t border-border pt-4">
              <p className="text-center text-sm text-muted-foreground">
                Precisa de uma conta para sua clínica?{' '}
                <Link
                  to="/cadastro"
                  className="font-semibold bg-gradient-to-r from-[hsl(190,100%,50%)] to-[hsl(262,93%,58%)] bg-clip-text text-transparent hover:underline"
                >
                  Cadastre sua empresa gratuitamente
                </Link>
              </p>
            </div>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Axis Inova v{SYSTEM_VERSION.formatted} · Política de Privacidade · Termos de Uso
          </p>
        </div>
      </motion.div>

      {/* Dev credentials card — desktop only */}
      <AnimatePresence>
        {devConfig.enabled && devCardOpen && devCredentials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="hidden lg:block fixed bottom-6 left-6 z-[9999] w-[340px] rounded-xl border border-border bg-background shadow-2xl"
          >
            <div
              className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none border-b border-border"
              onClick={() => setDevCardCollapsed(!devCardCollapsed)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">🔧 Acessos para teste</span>
                <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">DEV</span>
              </div>
              <div className="flex items-center gap-1">
                {devCardCollapsed ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDevCardOpen(false)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!devCardCollapsed && (
              <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
                {devCredentials.map((cred) => (
                  <div key={cred.email} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{cred.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{cred.email}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{cred.password}</p>
                    </div>
                    <button
                      onClick={() => fillCredentials(cred.email, cred.password)}
                      className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                    >
                      Usar ▶
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
