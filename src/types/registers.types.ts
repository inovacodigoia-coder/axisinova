export type AppointmentType = 'first_time' | 'return' | 'exam' | 'procedure' | 'emergency';

export interface AttachmentRule {
  id: string
  name?: string
  attachmentName: string
  isRequired: boolean
  description?: string
  appliesToTypes: AppointmentType[]
  order: number
  observations: string
}

export interface ExamParameter {
  id: number
  name: string
  section: string
  equipCode?: string
  type: 'numerical' | 'text' | 'calculation' | 'binary'
  origin: 'manual' | 'interface'
  unit?: string
  isMandatory: boolean
  allowNegative: boolean
  isCalculated: boolean
  isHidden: boolean
  formula?: string
}

export interface ReferenceValue {
  id: string
  description: string
  minValue?: number
  maxValue?: number
  minAge?: number
  maxAge?: number
  sex?: 'M' | 'F' | 'Both'
  isPregnant?: boolean
  normalText?: string
  order: number
  observations?: string
}

export interface Exam {
  id: string
  companyId: string
  name: string
  tussCode?: string;
  internalCode?: string;
  type: 'clinical' | 'lab'
  measurementUnit?: string
  specialtyId?: string
  defaultOrigin?: string
  defaultDestination?: string
  reportObservations?: string
  preparationInstructions?: string
  estimatedDurationMinutes?: number
  resultDeadlineDays?: number
  requiresAuthorization: boolean
  authorizationInstructions?: string
  attachmentRules: AttachmentRule[]
  parameters?: any[]
  referenceValues?: any[]
  confirmationQuestions?: string[]
  isActive: boolean
  createdAt: string
  showDuration?: boolean
  showDeadline?: boolean
}

export interface Procedure {
  id: string
  companyId: string
  name: string
  tussCode?: string
  internalCode?: string
  price: number
  type?: string
  isActive: boolean
  createdAt: string
}

export interface Specialty {
  id: string
  companyId: string
  name: string
  description?: string
  isActive: boolean
  createdAt?: string
}

export interface Doctor {
  id: string
  companyId: string
  name: string
  fullName?: string
  crm: string
  uf: string
  crmState?: string
  specialtyId?: string
  specialtyIds?: string[]
  phone?: string
  email?: string
  birthDate?: string
  photo?: string
  enabledConvenioIds?: string[]
  scheduleConfig?: any
  isBlocked?: boolean
  blockedReason?: string
  blockedAt?: string
  isActive: boolean
}

export type Insurance = Convenio;

export interface Convenio {
  id: string
  companyId: string
  name: string
  cnpj?: string
  ansCode?: string
  isActive: boolean
  operator?: string
}

export interface MeasurementUnit {
  id: string
  companyId: string
  name: string
  abbreviation: string
  isActive: boolean
}

export interface Sector {
  id: string
  companyId: string
  name: string
  type: 'reception' | 'collection' | 'triage' | 'technical' | 'delivery'
  isActive: boolean
}
