import { cn } from '@/lib/utils'

interface Row { label: string; count: number; percentage: number }

interface Props {
  title: string
  subtitle?: string
  rows: Row[]
  accent?: 'primary' | 'secondary'
}

export function SamplesBreakdownPanel({ title, subtitle, rows, accent = 'primary' }: Props) {
  const max = rows[0]?.count || 1
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma amostra no período selecionado.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-foreground truncate pr-2">{r.label}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  <strong className="text-foreground">{r.count}</strong> · {r.percentage}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                <div
                  className={cn('h-2 rounded-full', accent === 'primary' ? 'bg-primary' : 'bg-secondary')}
                  style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
