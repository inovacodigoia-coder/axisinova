import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { limparAvisosLimite, useAvisosLimite } from '@/lib/buscarEmBlocos'

/** Aviso exibido quando alguma lista atingiu o teto de segurança da busca em blocos. */
export function AvisoResultadosLimitados() {
  const telas = useAvisosLimite()
  const { pathname } = useLocation()
  useEffect(() => { limparAvisosLimite() }, [pathname])
  if (telas.length === 0) return null
  return (
    <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="flex-1">
        <p className="font-semibold">Resultados limitados, refine o período.</p>
        <p className="text-xs text-muted-foreground">Nenhum registro foi apagado. A lista ({telas.join(', ')}) passou do limite de exibição; filtre por período para ver todos.</p>
      </div>
      <button type="button" aria-label="Fechar aviso" onClick={limparAvisosLimite} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
