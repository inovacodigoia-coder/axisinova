import { cn } from '@/lib/utils'

interface ComparisonBadgeProps {
  trend: number
  trendIsPositive: boolean
  className?: string
}

export function ComparisonBadge({ trend, trendIsPositive, className }: ComparisonBadgeProps) {
  const isUp = trend > 0.5
  const isDown = trend < -0.5
  const isNeutral = !isUp && !isDown

  const positive = (isUp && trendIsPositive) || (isDown && !trendIsPositive)

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
      isNeutral && 'bg-muted text-muted-foreground',
      !isNeutral && positive && 'bg-emerald-500/15 text-emerald-400',
      !isNeutral && !positive && 'bg-red-500/15 text-red-400',
      className
    )}>
      {isUp ? '↑' : isDown ? '↓' : '→'} {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
    </span>
  )
}
