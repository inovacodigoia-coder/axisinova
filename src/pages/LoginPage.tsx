import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoginForm } from '@/components/auth/LoginForm'
import { Shield, Zap, Building2 } from 'lucide-react'

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'super_admin' ? '/superadmin/dashboard' : '/app/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleLogin = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      await login(email, password)
    } catch {
      const newCount = failCount + 1
      setFailCount(newCount)
      setError('E-mail ou senha incorretos. Verifique e tente novamente.')
      if (newCount >= 3) {
        setCooldown(30)
        setFailCount(0)
      }
    }
  }, [login, failCount])

  const features = [
    { icon: Shield, title: 'Acesso seguro e criptografado', desc: 'Seus dados protegidos com as melhores práticas de segurança' },
    { icon: Zap, title: 'Tudo disponível em tempo real', desc: 'Informações sempre atualizadas para sua equipe' },
    { icon: Building2, title: 'Feito para a saúde brasileira', desc: 'Compliance com LGPD, ANS e normas do setor' },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] gradient-bg relative overflow-hidden flex-col justify-between p-10 text-white">
        <div>
          <div className="text-2xl font-bold">
            <span className="text-white">Axis</span>
            <span className="text-white/80">Inova</span>
          </div>
          <p className="mt-2 text-sm text-white/60">Plataforma de gestão clínica</p>
        </div>
        <div className="space-y-6">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="text-xs text-white/60">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/40">© 2025 Axis Inova · Todos os direitos reservados</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="text-2xl font-bold text-foreground">Axis</span>
            <span className="text-2xl font-bold gradient-text">Inova</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais para acessar</p>
          </div>

          <LoginForm onSubmit={handleLogin} error={error} attemptsLeft={3 - failCount} cooldown={cooldown} />
        </div>
      </div>
    </div>
  )
}
