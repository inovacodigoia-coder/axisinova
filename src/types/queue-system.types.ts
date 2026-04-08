export interface Unit {
  id: string
  name: string
  companyId: string
  isActive: boolean
  createdAt: string
}

export interface QueueLine {
  id: string
  unitId: string
  name: string
  prefix: string
  type: 'external' | 'internal'
  category: 'attendance' | 'collect'
  isActive: boolean
  order: number
}

export interface Guiche {
  id: string
  unitId: string
  name: string
  type: 'external' | 'internal'
  isActive: boolean
}

export interface Totem {
  id: string
  unitId: string
  name: string
  isActive: boolean
}

export interface TV {
  id: string
  unitId: string
  name: string
  voiceType: 'feminine' | 'masculine'
  screenSize: 'small' | 'medium' | 'large' | 'extra_large'
  deviceCount: number
  mediaMode: 'with_media' | 'without_media'
  mediaAttachments: MediaAttachment[]
  isActive: boolean
}

export interface MediaAttachment {
  id: string
  tvId: string
  name: string
  type: 'video' | 'image'
  durationSeconds: number
  fileUrl: string
  createdAt: string
}

export type TicketStatus =
  | 'waiting'
  | 'called'
  | 'in_attendance'
  | 'reallocated'
  | 'finalized'

export interface Ticket {
  id: string
  unitId: string
  queueLineId: string
  queueLineName: string
  prefix: string
  number: number
  displayCode: string
  status: TicketStatus
  guicheId?: string
  guicheName?: string
  tvId?: string
  callCount: number
  patientName?: string
  reallocatedToQueueId?: string
  reallocatedToQueueName?: string
  attendantId?: string
  attendantName?: string
  generatedAt: string
  calledAt?: string
  attendanceStartedAt?: string
  reallocatedAt?: string
  finalizedAt?: string
  timeline: TicketTimelineEntry[]
}

export interface TicketTimelineEntry {
  id: string
  action: 'created' | 'called' | 'attended' | 'reallocated' | 'finalized' | 'reactivated'
  description: string
  performedBy?: string
  guicheName?: string
  timestamp: string
}

export interface AttendantSession {
  unitId: string
  unitName: string
  tvId?: string
  tvName?: string
  guicheId?: string
  guicheName?: string
  selectedQueueLineIds: string[]
  showFinalized: boolean
}

export interface QueueBIData {
  dailyStats: {
    date: string
    generated: number
    attended: number
    abandoned: number
    avgWaitMinutes: number
  }[]
  attendants: {
    id: string
    name: string
    unitName: string
    ticketsAttended: number
    avgTimeMinutes: number
    ticketsFinalized: number
  }[]
  unitMetrics: {
    unitId: string
    unitName: string
    generated: number
    attended: number
    abandoned: number
    avgWaitMinutes: number
    efficiency: number
  }[]
  totals: {
    generated: number
    attended: number
    abandoned: number
    avgWaitMinutes: number
  }
}
