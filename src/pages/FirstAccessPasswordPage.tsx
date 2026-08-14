import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { getRedirectByRole } from '@/mocks/users.mock'
import { Lock, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function FirstAccessPasswordPage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const translateAuthError = (message: string) => {
    const m = message.toLowerCase()
    if (m.includes('weak') || m.includes('pwned') || m.includes('easy to guess'))
      return 'Esta senha é muito comum e foi encontrada em vazamentos de dados. Escolha uma senha mais forte (use letras maiúsculas, minúsculas, números e símbolos).'
    if (m.includes('should be different from the old password') || m.includes('different from the old'))
      return 'A nova senha deve ser diferente da senha atual.'
    if (m.includes('at least') && m.includes('characters'))
      return 'A nova senha é muito curta. Use no mínimo 8 caracteres.'
    if (m.includes('invalid login credentials')) return 'Senha atual incorreta.'
    if (m.includes('rate limit') || m.includes('too many'))
      return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
    if (m.includes('session') || m.includes('jwt')) return 'Sessão expirada. Faça login novamente.'
    return 'Não foi possível alterar a senha. Tente novamente.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (next.length < 8) return setError('A nova senha deve ter no mínimo 8 caracteres')
    if (next !== confirm) return setError('As senhas não conferem')
    if (next === current) return setError('A nova senha deve ser diferente da senha atual')
    if (!user?.email) return setError('Sessão inválida. Faça login novamente.')

    setLoading(true)
    // 1. Valida a senha atual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    })
    if (signInError) {
      setLoading(false)
      return setError('Senha atual incorreta')
    }

    // 2. Define a nova senha
    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      setLoading(false)
      return setError(translateAuthError(updateError.message))
    }

    // 3. Remove a obrigatoriedade
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
    await refreshUser()

    setLoading(false)
    toast.success('Senha redefinida com sucesso!')
    navigate(getRedirectByRole(user.role), { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl space-y-5">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Primeiro acesso</h1>
          <p className="text-sm text-muted-foreground">
            Por segurança, informe a senha atual e crie uma nova senha pessoal.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {[
          { label: 'Senha atual', value: current, set: setCurrent },
          { label: 'Nova senha', value: next, set: setNext },
          { label: 'Confirmar nova senha', value: confirm, set: setConfirm },
        ].map((f) => (
          <div key={f.label} className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{f.label}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={show ? 'text' : 'password'}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={() => setShow((s) => !s)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? 'Ocultar senhas' : 'Mostrar senhas'}
        </button>

        <button
          type="submit"
          disabled={loading}
          className="gradient-bg w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>

        <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }) }} className="w-full text-xs text-muted-foreground hover:text-foreground">
          Sair
        </button>
      </form>
    </div>
  )
}
