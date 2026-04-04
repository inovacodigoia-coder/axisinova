export type NotificationCategory =
  | 'scheduling'
  | 'reception'
  | 'billing'
  | 'medical'
  | 'results'
  | 'correction'
  | 'system'
  | 'admin'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'
export type NotificationStatus = 'unread' | 'read' | 'archived'

export interface AppNotification {
  id: string
  userId: string
  category: NotificationCategory
  priority: NotificationPriority
  status: NotificationStatus
  title: string
  message: string
  actionLabel?: string
  actionRoute?: string
  relatedEntityId?: string
  relatedEntityType?: string
  icon?: string
  createdAt: string
  readAt?: string
  expiresAt?: string
}

export interface NotificationGroup {
  category: NotificationCategory
  label: string
  icon: string
  unreadCount: number
  notifications: AppNotification[]
}
