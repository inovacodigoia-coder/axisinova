import { useState } from 'react'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'

interface ResetPasswordFormProps {
  onSubmit: (password: string) => Promise<void>
}

export function ResetPasswordForm({ onSubmit }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Número', ok: /\d/.test(password) },
    { label: 'Caractere especial', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const strength = checks.filter((c) => c.ok).length
  const strengthColors = ['bg-destructive', 'bg-[hsl(var(--warning))]', 'bg-[hsl(33,100%,50%)]', 'bg-[hsl(var(--success))]']
  const passwordsMatch = confirm.length > 0 && password === confirm
  const isValid = strength === 4 && passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setIsLoading(true)
    try {
      await onSubmit(password)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground">Crie uma nova senha segura para sua conta.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nova senha</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < strength ? strengthColors[strength - 1] : 'bg-border'}`} />
          ))}
        </div>
        <ul className="mt-2 space-y-1">
          {checks.map((c) => (
            <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'}`}>
              <CheckCircle className="h-3 w-3" /> {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Confirmar senha</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`flex h-11 w-full rounded-lg border bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${confirm.length > 0 ? (passwordsMatch ? 'border-[hsl(var(--success))]' : 'border-destructive') : 'border-input'}`}
          required
        />
        {confirm.length > 0 && !passwordsMatch && <p className="text-xs text-destructive">Senhas não coincidem</p>}
      </div>

      <GradientButton type="submit" fullWidth disabled={!isValid || isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Salvando...
          </span>
        ) : (
          'Redefinir senha'
        )}
      </GradientButton>
    </form>
  )
}
