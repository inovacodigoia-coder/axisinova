import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  variant: StatusVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<StatusVariant, string> = {
  success: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-primary/10 text-primary',
  neutral: 'bg-muted text-muted-foreground',
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}
