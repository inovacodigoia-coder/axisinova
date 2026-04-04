import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { AppNotification, NotificationCategory, NotificationGroup } from '@/types/notifications.types'
import { MOCK_NOTIFICATIONS, SIMULATED_NOTIFICATIONS } from '@/mocks/notifications.mock'
import { NOTIFICATION_INTERVAL_MS } from '@/utils/constants'

interface NotificationState {
  notifications: AppNotification[]
  lastChecked: string
}

type Action =
  | { type: 'ADD'; payload: AppNotification }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'ARCHIVE'; payload: string }
  | { type: 'CLEAR_ALL' }

function reducer(state: NotificationState, action: Action): NotificationState {
  switch (action.type) {
    case 'ADD':
      return { ...state, notifications: [action.payload, ...state.notifications] }
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } : n
        ),
      }
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.status === 'unread' ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } : n
        ),
        lastChecked: new Date().toISOString(),
      }
    case 'ARCHIVE':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, status: 'archived' as const } : n
        ),
      }
    case 'CLEAR_ALL':
      return { ...state, notifications: [] }
    default:
      return state
  }
}

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  groupedByCategory: NotificationGroup[]
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'status'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  archive: (id: string) => void
  clearAll: () => void
  latestNotification: AppNotification | null
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: string }> = {
  scheduling: { label: 'Agendamento', icon: '📅' },
  reception: { label: 'Recepção', icon: '🏥' },
  billing: { label: 'Faturamento', icon: '💳' },
  medical: { label: 'Prontuário', icon: '🩺' },
  results: { label: 'Resultados', icon: '🧪' },
  correction: { label: 'Correções', icon: '↩️' },
  system: { label: 'Sistema', icon: '⚙️' },
  admin: { label: 'Admin', icon: '👤' },
}

export function NotificationContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    notifications: MOCK_NOTIFICATIONS.filter(n => n.status !== 'archived'),
    lastChecked: new Date().toISOString(),
  })

  // Simulate real-time notifications
  useEffect(() => {
    let idx = 0
    const interval = setInterval(() => {
      if (idx < SIMULATED_NOTIFICATIONS.length) {
        const sim = SIMULATED_NOTIFICATIONS[idx]
        dispatch({
          type: 'ADD',
          payload: { ...sim, id: `sim_${Date.now()}`, createdAt: new Date().toISOString(), status: 'unread' },
        })
        idx++
      }
    }, NOTIFICATION_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const activeNotifications = useMemo(
    () => state.notifications.filter(n => n.status !== 'archived'),
    [state.notifications]
  )

  const unreadCount = useMemo(
    () => activeNotifications.filter(n => n.status === 'unread').length,
    [activeNotifications]
  )

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {}
    activeNotifications.forEach(n => {
      if (!groups[n.category]) groups[n.category] = []
      groups[n.category].push(n)
    })
    return Object.entries(groups).map(([cat, notifs]) => ({
      category: cat as NotificationCategory,
      label: CATEGORY_META[cat as NotificationCategory]?.label || cat,
      icon: CATEGORY_META[cat as NotificationCategory]?.icon || '🔔',
      unreadCount: notifs.filter(n => n.status === 'unread').length,
      notifications: notifs,
    }))
  }, [activeNotifications])

  const latestNotification = useMemo(
    () => activeNotifications.find(n => n.status === 'unread') || null,
    [activeNotifications]
  )

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'status'>) => {
    dispatch({ type: 'ADD', payload: { ...n, id: `n_${Date.now()}`, createdAt: new Date().toISOString(), status: 'unread' } })
  }, [])

  const markRead = useCallback((id: string) => dispatch({ type: 'MARK_READ', payload: id }), [])
  const markAllRead = useCallback(() => dispatch({ type: 'MARK_ALL_READ' }), [])
  const archive = useCallback((id: string) => dispatch({ type: 'ARCHIVE', payload: id }), [])
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR_ALL' }), [])

  return (
    <NotificationContext.Provider value={{
      notifications: activeNotifications, unreadCount, groupedByCategory,
      addNotification, markRead, markAllRead, archive, clearAll, latestNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationContextProvider')
  return ctx
}
