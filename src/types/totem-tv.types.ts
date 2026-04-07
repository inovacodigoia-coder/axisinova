export type DeviceType = 'totem' | 'tv'

export type TicketFilter = 'all' | 'SP' | 'SN' | 'EX' | 'PR' | 'RE'

export interface TotemConfig {
  id: string
  companyId: string
  name: string
  location: string
  isActive: boolean
  slug: string
  allowedTicketTypes: TicketFilter[]
  welcomeMessage: string
  logoUrl?: string
  primaryColor: string
  backgroundColor: string
  showEstimatedWait: boolean
  allowSearchByName: boolean
  allowSearchByCPF: boolean
  allowSearchByBirthDate: boolean
  printerEnabled: boolean
  printerType?: 'thermal_network' | 'thermal_usb' | 'none'
  printerAddress?: string
  createdAt: string
}

export interface TVConfig {
  id: string
  companyId: string
  name: string
  location: string
  isActive: boolean
  slug: string
  displayTicketTypes: TicketFilter[]
  showDoctorName: boolean
  showRoomName: boolean
  showQueueList: boolean
  maxQueueVisible: number
  showClock: boolean
  showLogo: boolean
  logoUrl?: string
  primaryColor: string
  backgroundColor: string
  voiceEnabled: boolean
  voiceConfig?: VoiceConfig
  createdAt: string
}

export interface Room {
  id: string
  companyId: string
  name: string
  type: 'consultation' | 'exam' | 'procedure' | 'mixed'
  number?: string
  floor?: string
  doctorId?: string
  isActive: boolean
  description?: string
}

export interface VoiceConfig {
  id: string
  companyId: string
  enabled: boolean
  language: 'pt-BR' | 'pt-PT'
  voiceName: string
  rate: number
  pitch: number
  volume: number
  useSocialName: boolean
  callTemplate: string
  callRepetitions: number
  intervalBetweenRepetitions: number
}
