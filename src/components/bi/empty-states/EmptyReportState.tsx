import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyReportStateProps {
  hasFilters: boolean
  onClearFilters?: () => void
  reportName: string
  emptyMessage: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyReportState({ hasFilters, onClearFilters, reportName, emptyMessage, actionLabel, onAction }: EmptyReportStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Nenhum {reportName} encontrado com os filtros aplicados.
          </p>
          {onClearFilters && (
            <button onClick={onClearFilters} className="text-xs text-primary hover:underline mt-2">
              Limpar filtros
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-muted-foreground mb-1">{emptyMessage}</p>
          {actionLabel && onAction && (
            <button onClick={onAction} className="text-xs text-primary hover:underline mt-2">
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  )
}
