import { ComparisonBadge } from '@/components/bi/shared/ComparisonBadge'
import { cn } from '@/lib/utils'

interface SummaryItem {
  label: string
  value: string
  trend?: number
  trendIsPositive?: boolean
}

interface ReportSummaryBarProps {
  items: SummaryItem[]
  dark?: boolean
}

export function ReportSummaryBar({ items, dark }: ReportSummaryBarProps) {
  return (
    <div className={cn(
      'flex flex-wrap gap-4 rounded-xl border p-4',
      dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border'
    )}>
      {items.map((item, i) => (
        <div key={i} className={cn('flex items-center gap-4', i > 0 && dark && 'border-l border-white/10 pl-4', i > 0 && !dark && 'border-l border-border pl-4')}>
          <div>
            <p className={cn('text-[10px] uppercase tracking-wider font-semibold', dark ? 'text-white/40' : 'text-muted-foreground')}>{item.label}</p>
            <p className={cn('text-lg font-bold', dark ? 'text-white' : 'text-foreground')}>{item.value}</p>
          </div>
          {item.trend !== undefined && item.trendIsPositive !== undefined && (
            <ComparisonBadge trend={item.trend} trendIsPositive={item.trendIsPositive} />
          )}
        </div>
      ))}
    </div>
  )
}
