import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { X, Bell, Check, AlertTriangle, Info, Calendar, DollarSign, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'billing' | 'record'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const initialNotifications: Notification[] = [
  { id: '1', type: 'appointment', title: 'Novo agendamento', message: 'Maria Silva agendou consulta para 25/03 às 10:00', timestamp: new Date(Date.now() - 5 * 60000), read: false },
  { id: '2', type: 'warning', title: 'Guia TISS com glosa', message: 'Guia TISS-2026-001545 foi glosada pela Amil', timestamp: new Date(Date.now() - 30 * 60000), read: false },
  { id: '3', type: 'billing', title: 'Pagamento confirmado', message: 'Unimed confirmou pagamento do lote #2026-03', timestamp: new Date(Date.now() - 2 * 3600000), read: false },
  { id: '4', type: 'info', title: 'Atualização do sistema', message: 'Nova versão do módulo TISS disponível', timestamp: new Date(Date.now() - 5 * 3600000), read: true },
  { id: '5', type: 'record', title: 'Prontuário atualizado', message: 'Dr. Carlos Mendes atualizou o prontuário de João Santos', timestamp: new Date(Date.now() - 8 * 3600000), read: true },
]

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  // Simulate real-time notifications
  useEffect(() => {
    const simulated = [
      { type: 'appointment' as NotificationType, title: 'Confirmação de consulta', message: 'Pedro Oliveira confirmou presença para amanhã às 09:00' },
      { type: 'warning' as NotificationType, title: 'Paciente em espera', message: 'Ana Costa está aguardando há mais de 20 minutos' },
      { type: 'success' as NotificationType, title: 'Guia TISS aprovada', message: 'Guia TISS-2026-001544 foi aprovada pela SulAmérica' },
    ]
    let idx = 0
    const interval = setInterval(() => {
      if (idx < simulated.length) {
        const n = simulated[idx]
        setNotifications(prev => [{
          id: `sim_${Date.now()}`, ...n, timestamp: new Date(), read: false,
        }, ...prev])
        idx++
      }
    }, 45000) // Every 45 seconds
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [{ ...n, id: `n_${Date.now()}`, timestamp: new Date(), read: false }, ...prev])
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

const iconMap: Record<NotificationType, typeof Bell> = {
  info: Info, success: Check, warning: AlertTriangle, error: AlertTriangle,
  appointment: Calendar, billing: DollarSign, record: FileText,
}

const colorMap: Record<NotificationType, string> = {
  info: 'bg-primary/10 text-primary',
  success: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
  error: 'bg-destructive/10 text-destructive',
  appointment: 'bg-primary/10 text-primary',
  billing: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  record: 'bg-secondary/10 text-secondary',
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

interface PanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: PanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications()

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-16 z-50 w-[380px] max-h-[70vh] flex flex-col rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Notificações</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">Marcar todas como lidas</button>
            )}
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map(n => {
              const Icon = iconMap[n.type]
              return (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors',
                    !n.read && 'bg-primary/[0.03]'
                  )}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', colorMap[n.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm', !n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>{n.title}</p>
                      <button onClick={e => { e.stopPropagation(); removeNotification(n.id) }} className="shrink-0 rounded p-0.5 hover:bg-muted">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.timestamp)}</p>
                  </div>
                  {!n.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              )
            })
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <button onClick={clearAll} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              Limpar todas
            </button>
          </div>
        )}
      </div>
    </>
  )
}
