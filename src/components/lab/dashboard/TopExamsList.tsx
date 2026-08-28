import { cn } from '@/lib/utils'

interface Props {
  rows: { name: string; code?: string; sector: string; count: number; ratio: number }[]
  limit: number
  onLimitChange: (n: number) => void
}

const LIMITS = [5, 10, 20, 30]

export function TopExamsList({ rows, limit, onLimitChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Exames Mais Realizados</h3>
          <p className="text-xs text-muted-foreground">Ranking do período selecionado</p>
        </div>
        <div className="flex gap-1">
          {LIMITS.map(n => (
            <button
              key={n}
              onClick={() => onLimitChange(n)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                limit === n ? 'gradient-bg text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              Top {n}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum exame realizado no período selecionado.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                  <span className="shrink-0 text-sm font-bold text-foreground">{r.count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="truncate text-[10px] text-muted-foreground">
                    {[r.code, r.sector].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div className="h-1.5 rounded-full gradient-bg" style={{ width: `${Math.max(4, r.ratio * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
