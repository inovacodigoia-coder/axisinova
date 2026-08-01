import { useState, useEffect, FormEvent } from 'react'
import { Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface Props {
  deviceKind: 'totem' | 'tv' | 'painel'
  slug: string
  expectedUsername?: string | null
  expectedPassword?: string | null
  deviceName?: string
  children: React.ReactNode
  /** While true, gate waits (shows nothing) instead of letting children through. Use while credentials are still loading. */
  loading?: boolean
}

const storageKey = (kind: string, slug: string) => `axis_device_auth__${kind}__${slug}`

export function DeviceAuthGate({ deviceKind, slug, expectedUsername, expectedPassword, deviceName, children, loading }: Props) {
  // We consider it "no credentials required" ONLY if both fields are literally null/empty AND it's not the fallback state
  const isFallback = expectedUsername === '...'
  const hasCredentials = !!(expectedUsername && expectedPassword && !isFallback)
  
  const [authed, setAuthed] = useState<boolean>(() => {
    if (!hasCredentials && !isFallback) return true
    try { return sessionStorage.getItem(storageKey(deviceKind, slug)) === '1' } catch { return false }
  })
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(storageKey(deviceKind, slug)) === '1')
    } catch {}
  }, [deviceKind, slug])

  if (loading && !isFallback) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conectando ao sistema...</h2>
        <p className="text-slate-400 max-w-xs">
          Estamos preparando o acesso. Se esta tela persistir por muito tempo, verifique sua conexão ou o link utilizado.
        </p>
      </div>
    )
  }

  // If authed OR no credentials actually required (and not fallback waiting for query)
  if (authed || (!hasCredentials && !isFallback)) return <>{children}</>

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Se for fallback, precisamos buscar as credenciais reais agora que o usuário quer logar
    let targetUser = expectedUsername
    let targetPass = expectedPassword

    if (isFallback || !targetUser || !targetPass) {
      const table = deviceKind === 'totem' ? 'queue_totems' : 'queue_tvs'
      const { data, error } = await supabase
        .from(table as any)
        .select('access_username, access_password')
        .eq('slug', slug)
        .maybeSingle()
      
      if (error || !data) {
        setError('Dispositivo não encontrado ou erro de conexão.')
        return
      }
      targetUser = (data as any).access_username
      targetPass = (data as any).access_password
    }

    const inputUser = username.trim()
    const inputPass = password.trim()
    const dbUser = (targetUser || '').trim()
    const dbPass = (targetPass || '').trim()

    if (inputUser === dbUser && inputPass === dbPass) {
      try { sessionStorage.setItem(storageKey(deviceKind, slug), '1') } catch {}
      setAuthed(true)
      setError('')
      // Se for fallback, recarrega a página para pegar o estado completo do banco
      if (isFallback) window.location.reload()
    } else {
      setError('Usuário ou senha incorretos')
    }
  }

  const title = deviceKind === 'totem' ? 'Acesso ao Totem' : 'Acesso ao Painel/TV'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 space-y-5">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {deviceName && <p className="text-sm text-muted-foreground">{deviceName}</p>}
          <p className="text-xs text-muted-foreground">Informe as credenciais para liberar o acesso.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Usuário</label>
          <input autoFocus value={username} onChange={e => setUsername(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Senha</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground p-1">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">{error}</div>}

        <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-lg gradient-bg px-4 py-2.5 text-sm font-semibold text-white">
          <LogIn className="h-4 w-4" /> Entrar
        </button>
      </form>
    </div>
  )
}