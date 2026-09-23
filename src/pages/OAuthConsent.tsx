import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import logoImg from '@/assets/logo-axisinova.jpeg'

type AuthorizationDetails = {
  client?: { name?: string | null } | null
  redirect_url?: string | null
  redirect_to?: string | null
}

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>
}

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth

export default function OAuthConsent() {
  const [params] = useSearchParams()
  const authorizationId = params.get('authorization_id') ?? ''
  const [details, setDetails] = useState<AuthorizationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!authorizationId) {
        setError('Requisição inválida: authorization_id ausente.')
        return
      }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        const next = window.location.pathname + window.location.search
        window.location.href = '/login?next=' + encodeURIComponent(next)
        return
      }
      const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId)
      if (!active) return
      if (err) {
        setError(err.message)
        return
      }
      const immediate = data?.redirect_url ?? data?.redirect_to
      if (immediate && !data?.client) {
        window.location.href = immediate
        return
      }
      setDetails(data)
    })()
    return () => {
      active = false
    }
  }, [authorizationId])

  async function decide(approve: boolean) {
    setBusy(true)
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId)
    if (err) {
      setBusy(false)
      setError(err.message)
      return
    }
    const target = data?.redirect_url ?? data?.redirect_to
    if (!target) {
      setBusy(false)
      setError('O servidor de autorização não retornou um redirecionamento.')
      return
    }
    window.location.href = target
  }

  const clientName = details?.client?.name ?? 'o aplicativo'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <img src={logoImg} alt="Axis Inova" className="h-10 w-10 rounded-lg" />
          <span className="text-xl font-bold text-foreground">Axis Inova</span>
        </div>

        {error ? (
          <>
            <h1 className="text-lg font-bold text-foreground">Não foi possível carregar a autorização</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <h1 className="text-lg font-bold text-foreground">Conectar {clientName} à sua conta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {clientName} poderá acessar os dados do Axis Inova em seu nome, respeitando suas permissões.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 h-11 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, hsl(190 100% 50%) 0%, hsl(262 93% 58%) 100%)' }}
              >
                Autorizar
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-semibold text-foreground disabled:opacity-60"
              >
                Recusar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
