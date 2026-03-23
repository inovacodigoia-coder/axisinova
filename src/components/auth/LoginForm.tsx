import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { Link } from 'react-router-dom'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
  error: string | null
  attemptsLeft: number
  cooldown: number
}

export function LoginForm({ onSubmit, error, attemptsLeft, cooldown }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return
    setIsLoading(true)
    try {
      await onSubmit(email, password)
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = cooldown > 0 || isLoading

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {cooldown > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--warning))]/10 p-3 text-sm text-[hsl(var(--warning))]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Muitas tentativas. Aguarde {cooldown}s.</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">E-mail</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Senha</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
          />
          Lembrar-me por 30 dias
        </label>
        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Esqueci minha senha
        </Link>
      </div>

      <GradientButton type="submit" fullWidth disabled={isDisabled}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Autenticando...
          </span>
        ) : (
          'Entrar'
        )}
      </GradientButton>

      <div className="relative flex items-center gap-4 py-2">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-medium text-primary hover:underline">
          Cadastre sua empresa
        </Link>
      </p>
    </form>
  )
}
