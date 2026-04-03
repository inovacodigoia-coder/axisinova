export interface Doctor {
  id: string
  fullName: string
  crm: string
  crmState: string
  mainSpecialty: string
  otherSpecialties?: string[]
  phone?: string
  email?: string
  birthDate?: string
  enabledConvenios: string[]
  isActive: boolean
  companyId: string
  consultDuration: number
  consultInterval: number
  schedule: DoctorSchedule[]
}

export interface DoctorSchedule {
  dayOfWeek: number // 0=Sun...6=Sat
  startTime: string
  endTime: string
  active: boolean
}

export interface Convenio {
  id: string
  name: string
  ansCode?: string
  type: 'health_plan' | 'private' | 'sus'
  cnpj?: string
  authPhone?: string
  email?: string
  notes?: string
  isActive: boolean
  companyId: string
  documentRules?: ConvenioDocumentRules
}

export type DocumentRequirement = 'none' | 'optional' | 'required'

export interface ConvenioDocumentRules {
  consulta: Record<string, DocumentRequirement>
  exame: Record<string, DocumentRequirement>
  procedimento: Record<string, DocumentRequirement>
}

export const DOCUMENT_COLUMNS = [
  'Carteirinha', 'Pedido Médico', 'RG/CPF', 'Autorização', 'Guia SADT', 'Laudo'
] as const

export const ATTENDANCE_TYPES = ['consulta', 'exame', 'procedimento'] as const

export interface Exam {
  id: string
  tussCode: string
  name: string
  type: 'lab' | 'imaging' | 'clinical_procedure' | 'surgical_procedure' | 'consultation'
  specialty?: string
  duration?: number
  preparation?: string
  resultDays?: number
  requiresAuth: boolean
  authInstructions?: string
  notes?: string
  isActive: boolean
  companyId: string
}

export const EXAM_TYPES: { value: Exam['type']; label: string }[] = [
  { value: 'lab', label: 'Exame Laboratorial' },
  { value: 'imaging', label: 'Exame de Imagem' },
  { value: 'clinical_procedure', label: 'Procedimento Clínico' },
  { value: 'surgical_procedure', label: 'Procedimento Cirúrgico' },
  { value: 'consultation', label: 'Consulta' },
]

export const SPECIALTIES = [
  'Cardiologia', 'Dermatologia', 'Endocrinologia', 'Gastroenterologia',
  'Ginecologia', 'Neurologia', 'Oftalmologia', 'Ortopedia',
  'Otorrinolaringologia', 'Pediatria', 'Psiquiatria', 'Urologia',
  'Clínica Geral', 'Cirurgia Geral', 'Radiologia',
]
