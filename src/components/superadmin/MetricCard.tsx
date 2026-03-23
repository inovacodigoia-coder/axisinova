import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  change: number
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

export function MetricCard({ title, value, change, icon: Icon, iconBg, iconColor }: MetricCardProps) {
  const isPositive = change >= 0

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        {isPositive ? <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
        <span className={`text-sm font-medium ${isPositive ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
          {isPositive ? '+' : ''}{change}%
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs mês anterior</span>
      </div>
    </div>
  )
}
