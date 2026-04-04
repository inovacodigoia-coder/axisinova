import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/utils/formatters'
import type { AppNotification } from '@/types/notifications.types'

const priorityBorder: Record<string, string> = {
  critical: 'border-l-destructive',
  high: 'border-l-[hsl(var(--warning))]',
  medium: 'border-l-primary',
  low: 'border-l-border',
}

interface NotificationItemProps {
  notification: AppNotification
  onRead: (id: string) => void
  onArchive: (id: string) => void
  onAction?: (route: string) => void
}

export function NotificationItem({ notification: n, onRead, onArchive, onAction }: NotificationItemProps) {
  const isUnread = n.status === 'unread'

  return (
    <div
      onClick={() => {
        onRead(n.id)
        if (n.actionRoute && onAction) onAction(n.actionRoute)
      }}
      className={cn(
        'flex gap-3 px-4 py-3 border-b border-border/50 border-l-[3px] cursor-pointer hover:bg-muted/50 transition-colors',
        priorityBorder[n.priority],
        isUnread ? 'bg-primary/[0.03]' : 'bg-transparent'
      )}
    >
      <span className="text-base shrink-0 mt-0.5">{n.icon || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-tight', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
            {n.title}
          </p>
          <button
            onClick={e => { e.stopPropagation(); onArchive(n.id) }}
            className="shrink-0 rounded p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground/60">{formatRelativeTime(n.createdAt)}</span>
          {n.actionLabel && (
            <span className="text-[10px] font-medium text-primary">{n.actionLabel} →</span>
          )}
        </div>
      </div>
      {isUnread && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  )
}
