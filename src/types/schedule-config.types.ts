export type AttendanceTypeDay = 'consultation' | 'exam' | 'procedure' | 'mixed'

export interface DayScheduleConfig {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  isActive: boolean
  startTime: string
  endTime: string
  lunchStart?: string
  lunchEnd?: string
  attendanceTypes: AttendanceTypeDay[]
  slotDuration: number
  intervalBetween: number
  maxPatients: number
  roomId?: string
}

export interface DoctorScheduleFullConfig {
  doctorId: string
  days: DayScheduleConfig[]
  defaultSlotDuration: number
  defaultInterval: number
  allowOverbooking: boolean
  overbookingLimit: number
}

export interface ScheduleSlotPreviewItem {
  time: string
  endTime: string
  isAvailable: boolean
  isLunch: boolean
  slotNumber: number
  attendanceType?: AttendanceTypeDay
}

export type RestrictionSeverity = 'block' | 'warning' | 'info'

export interface RestrictionAlert {
  id: string
  severity: RestrictionSeverity
  title: string
  message: string
  canContinue: boolean
  requiresConfirmation: boolean
  confirmationLabel?: string
  details?: string[]
}
