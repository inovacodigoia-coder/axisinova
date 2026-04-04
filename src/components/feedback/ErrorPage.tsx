import { useState } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

interface ErrorPageProps {
  error?: Error | null
  onRetry?: () => void
}

export function ErrorPage({ error, onRetry }: ErrorPageProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
        <p className="text-muted-foreground">
          Ocorreu um erro inesperado nesta página. Os detalhes foram registrados automaticamente.
        </p>
        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg gradient-bg px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>
          )}
          <a
            href="/app/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </a>
        </div>
        {error && (
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? '▲ Ocultar detalhes' : '▼ Detalhes técnicos'}
            </button>
            {showDetails && (
              <pre className="mt-2 rounded-lg bg-card border border-border p-3 text-left text-xs text-muted-foreground font-mono overflow-x-auto max-h-[200px]">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
