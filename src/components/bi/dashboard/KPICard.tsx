import { cn } from '@/lib/utils'
import { ComparisonBadge } from '@/components/bi/shared/ComparisonBadge'
import { KPITrendLine } from './KPITrendLine'
import type { KPIData } from '@/types/bi.types'

interface KPICardProps {
  data: KPIData
  dark?: boolean
}

function formatValue(value: number | string, unit?: string): string {
  if (unit === 'R$') {
    const n = typeof value === 'string' ? parseFloat(value) : value
    return `R$ ${n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(0)}`
  }
  return String(value)
}

export function KPICard({ data, dark }: KPICardProps) {
  return (
    <div className={cn(
      'rounded-xl border p-4 flex flex-col gap-2',
      dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border'
    )}>
      <p className={cn('text-[10px] uppercase tracking-wider font-semibold', dark ? 'text-white/40' : 'text-muted-foreground')}>
        {data.label}
      </p>
      <div className="flex items-end gap-2">
        <span className={cn('text-2xl font-bold', dark ? 'text-white' : 'text-foreground')}>
          {formatValue(data.value, data.unit)}
        </span>
        {data.unit && data.unit !== 'R$' && (
          <span className={cn('text-sm mb-0.5', dark ? 'text-white/40' : 'text-muted-foreground')}>{data.unit}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ComparisonBadge trend={data.trend} trendIsPositive={data.trendIsPositive} />
        <span className={cn('text-[10px]', dark ? 'text-white/30' : 'text-muted-foreground')}>vs anterior</span>
      </div>
      <KPITrendLine data={data.sparklineData} positive={data.trendIsPositive} />
      {data.target && (
        <div className="mt-1">
          <div className="flex justify-between text-[10px]">
            <span className={dark ? 'text-white/40' : 'text-muted-foreground'}>Meta: {data.unit === 'R$' ? `R$ ${(data.target / 1000).toFixed(0)}k` : data.target}{data.unit === '%' ? '%' : ''}</span>
            <span className={data.targetReached ? 'text-emerald-400' : 'text-amber-400'}>
              {data.targetReached ? '✓ Atingida' : 'Em progresso'}
            </span>
          </div>
          <div className={cn('mt-1 h-1 rounded-full', dark ? 'bg-white/10' : 'bg-muted')}>
            <div
              className={cn('h-full rounded-full', data.targetReached ? 'bg-emerald-500' : 'gradient-bg')}
              style={{ width: `${Math.min(100, (Number(data.value) / data.target) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
