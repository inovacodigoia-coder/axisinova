import { useState } from 'react'
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { Link } from 'react-router-dom'

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>
}

export function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(email)
      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--success))]/10">
          <CheckCircle className="h-8 w-8 text-[hsl(var(--success))]" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Verifique seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de recuperação para <strong>{email}</strong>. O link expira em 15 minutos.
        </p>
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-4">
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 animate-bounce-slow">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Recuperar acesso</h2>
        <p className="text-sm text-muted-foreground">Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>

      <GradientButton type="submit" fullWidth disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Enviando...
          </span>
        ) : (
          'Enviar link de recuperação'
        )}
      </GradientButton>

      <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar para o login
      </Link>
    </form>
  )
}
