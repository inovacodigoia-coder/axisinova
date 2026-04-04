import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  dark?: boolean
}

export function ChartCard({ title, subtitle, children, className, dark }: ChartCardProps) {
  return (
    <div className={cn(
      'rounded-xl border p-5',
      dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border',
      className
    )}>
      <div className="mb-4">
        <h3 className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-foreground')}>{title}</h3>
        {subtitle && <p className={cn('text-xs mt-0.5', dark ? 'text-white/50' : 'text-muted-foreground')}>{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
