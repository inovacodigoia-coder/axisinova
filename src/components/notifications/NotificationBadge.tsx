import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  className?: string
  animate?: boolean
}

export function NotificationBadge({ count, className, animate }: NotificationBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={cn(
        'absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground',
        animate && 'animate-pulse',
        className
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
