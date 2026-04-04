import { Link } from 'react-router-dom'
import { Lock, ArrowLeft, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'

export default function UnauthorizedPage() {
  const { user } = useAuth()
  const companyCtx = (() => { try { return useCompanyContext() } catch { return null } })()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Acesso não permitido</h1>
        <p className="text-muted-foreground">
          Seu perfil não tem permissão para acessar este módulo.
        </p>
        {companyCtx?.activeProfile && (
          <div className="rounded-lg bg-card border border-border px-4 py-3 text-sm space-y-1">
            <p className="text-muted-foreground">Perfil atual: <span className="font-medium text-foreground">{companyCtx.activeProfile.name}</span></p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <button className="inline-flex items-center gap-2 gradient-bg text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
            <Mail className="h-4 w-4" />
            Solicitar acesso
          </button>
        </div>
      </div>
    </div>
  )
}
