import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Home, Calendar, Stethoscope, DollarSign, FolderOpen } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <FolderOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold gradient-text">404</h1>
          <p className="text-lg font-semibold text-foreground">Página não encontrada</p>
          <p className="text-sm text-muted-foreground">
            A página que você procura não existe ou foi movida para outro endereço.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 gradient-bg text-primary-foreground rounded-lg px-6 py-2.5 font-medium hover:opacity-90 transition-opacity"
        >
          <Home className="h-4 w-4" />
          Voltar ao início
        </Link>
        <div className="pt-4">
          <p className="text-xs text-muted-foreground mb-3">Você pode estar procurando:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link to="/app/agendamento" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors">
              <Calendar className="h-3 w-3" /> Agendamentos
            </Link>
            <Link to="/app/recepcao" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors">
              <Stethoscope className="h-3 w-3" /> Recepção
            </Link>
            <Link to="/app/faturamento" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors">
              <DollarSign className="h-3 w-3" /> Faturamento
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
