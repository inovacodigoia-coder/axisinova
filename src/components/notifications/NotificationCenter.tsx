import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationContext } from '@/context/NotificationContext'
import { NotificationItem } from './NotificationItem'
import type { NotificationCategory } from '@/types/notifications.types'

interface NotificationCenterProps {
  open: boolean
  onClose: () => void
}

const CATEGORY_TABS: { key: 'all' | NotificationCategory; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'billing', label: 'Faturamento' },
  { key: 'scheduling', label: 'Agendamento' },
  { key: 'reception', label: 'Recepção' },
  { key: 'medical', label: 'Prontuário' },
  { key: 'results', label: 'Resultados' },
  { key: 'correction', label: 'Correções' },
]

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markRead, markAllRead, archive, clearAll, groupedByCategory } = useNotificationContext()
  const [activeTab, setActiveTab] = useState<'all' | NotificationCategory>('all')
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (activeTab === 'all') return notifications
    return notifications.filter(n => n.category === activeTab)
  }, [notifications, activeTab])

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: unreadCount }
    groupedByCategory.forEach(g => { counts[g.category] = g.unreadCount })
    return counts
  }, [unreadCount, groupedByCategory])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 z-50 w-[380px] max-h-[520px] flex flex-col rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">🔔 Notificações</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">
                Marcar todas como lidas
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                activeTab === tab.key
                  ? 'gradient-bg text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {(tabCounts[tab.key] || 0) > 0 && (
                <span className="text-[9px] opacity-80">({tabCounts[tab.key]})</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            filtered.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markRead}
                onArchive={archive}
                onAction={(route) => { navigate(route); onClose() }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2 flex items-center justify-between">
            <button onClick={() => { navigate('/app/notificacoes'); onClose() }} className="text-[10px] text-primary hover:underline">
              Ver todas as notificações
            </button>
            <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Limpar todas
            </button>
          </div>
        )}
      </div>
    </>
  )
}
