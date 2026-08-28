import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LAB_STATUS_META, LAB_STATUS_ORDER } from '@/hooks/useLabDashboardMetrics'

interface Props {
  counts: Record<string, number>
}

export function StatusCardsRow({ counts }: Props) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {LAB_STATUS_ORDER.map(status => {
        const meta = LAB_STATUS_META[status]
        const count = counts[status] || 0
        const empty = count === 0
        return (
          <button
            key={status}
            type="button"
            onClick={() => meta.route && navigate(meta.route)}
            className={cn(
              'rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all',
              meta.route ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default',
              empty && 'opacity-50'
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate">
                {meta.label}
              </span>
            </div>
            <p className={cn('mt-2 text-2xl font-bold', empty ? 'text-muted-foreground' : meta.text)}>{count}</p>
            <p className="text-[10px] text-muted-foreground">pedido{count === 1 ? '' : 's'}</p>
          </button>
        )
      })}
    </div>
  )
}
