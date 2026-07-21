export interface Specialty {
  id: string
  name: string
  companyId: string
  isActive: boolean
  createdAt: string
}

export interface Doctor {
  id: string
  companyId: string
  fullName: string
  crm: string
  crmState: string
  specialtyIds: string[]
  phone?: string
  email?: string
  birthDate?: string
  photo?: string
  enabledConvenioIds: string[]
  scheduleConfig?: DoctorScheduleConfig
  isActive: boolean
  isBlocked: boolean
  blockedReason?: string
  blockedAt?: string
  createdAt: string
  updatedAt: string
}

export interface DoctorScheduleConfig {
  consultationDuration: number
  intervalBetween: number
  workDays: WorkDayConfig[]
  blockedDates?: string[] // ISO date strings for holidays, days off, etc.
}

export interface WorkDayConfig {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6
  isActive: boolean
  startTime: string
  endTime: string
  lunchStart?: string
  lunchEnd?: string
}

export interface Convenio {
  id: string
  companyId: string
  name: string
  ansCode?: string
  operator?: string
  type: 'health_plan' | 'private' | 'sus' | 'other'
  cnpj?: string
  authPhone?: string
  email?: string
  observations?: string
  attachmentRules: AttachmentRule[]
  isActive: boolean
  createdAt: string
}

export type AppointmentType = 'consulta' | 'exame' | 'procedimento'

export interface AttachmentRule {
  id: string
  convenioId: string
  attachmentName: string
  isRequired: boolean
  appliesToTypes: AppointmentType[]
  order: number
  observations?: string
}

export interface Exam {
  id: string
  companyId: string
  name: string
  tussCode?: string
  type: 'clinical' | 'lab'
  specialtyId?: string
  preparationInstructions?: string
  estimatedDurationMinutes?: number
  resultDeadlineDays?: number
  requiresAuthorization: boolean
  authorizationInstructions?: string
  attachmentRules: AttachmentRule[]
  isActive: boolean
  createdAt: string
}

export interface Procedure {
  id: string
  companyId: string
  name: string
  tussCode?: string
  type: 'clinical' | 'surgical' | 'diagnostic' | 'therapeutic' | 'other'
  specialtyId?: string
  estimatedDurationMinutes?: number
  requiresAuthorization: boolean
  authorizationInstructions?: string
  requiresAnesthesia: boolean
  anesthesiaType?: string
  preOperativeInstructions?: string
  postOperativeInstructions?: string
  attachmentRules: AttachmentRule[]
  isActive: boolean
  createdAt: string
}

export const PROCEDURE_TYPES: { value: Procedure['type']; label: string; color: string }[] = [
  { value: 'clinical', label: 'Clínico', color: 'bg-blue-100 text-blue-700' },
  { value: 'surgical', label: 'Cirúrgico', color: 'bg-red-100 text-red-700' },
  { value: 'diagnostic', label: 'Diagnóstico', color: 'bg-green-100 text-green-700' },
  { value: 'therapeutic', label: 'Terapêutico', color: 'bg-purple-100 text-purple-700' },
  { value: 'other', label: 'Outro', color: 'bg-muted text-muted-foreground' },
]

export const ANESTHESIA_TYPES = ['Local', 'Sedação', 'Geral', 'Raqui', 'Peridural'] as const

export const CONVENIO_TYPE_LABELS: Record<Convenio['type'], string> = {
  health_plan: 'Plano de Saúde',
  private: 'Particular',
  sus: 'SUS',
  other: 'Outro',
}

export const CONVENIO_TYPE_COLORS: Record<Convenio['type'], string> = {
  health_plan: 'bg-blue-100 text-blue-700',
  private: 'bg-green-100 text-green-700',
  sus: 'bg-orange-100 text-orange-700',
  other: 'bg-muted text-muted-foreground',
}

export const UF_LIST = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

export const BLOCK_REASONS = [
  'Saiu da empresa',
  'Afastamento médico',
  'Férias',
  'Licença',
  'Outro',
] as const
