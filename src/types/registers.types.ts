export type AppointmentType = 'first_time' | 'return' | 'exam' | 'procedure' | 'emergency' | 'consulta' | 'exame' | 'procedimento';

export interface AttachmentRule {
  id: string
  name?: string
  attachmentName: string
  isRequired: boolean
  description?: string
  appliesToTypes: AppointmentType[]
  order: number
  observations?: string
  convenioId?: string;
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
  price?: number
  type: string
  isActive: boolean
  createdAt: string
  specialtyId?: string
  estimatedDurationMinutes?: number
  requiresAuthorization?: boolean
  authorizationInstructions?: string
  requiresAnesthesia?: boolean
  anesthesiaType?: string
  preOperativeInstructions?: string
  postOperativeInstructions?: string
  attachmentRules: AttachmentRule[]
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
  name?: string
  fullName?: string
  crm: string
  uf?: string
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
  createdAt?: string
  updatedAt?: string;
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
  type?: string
  authPhone?: string
  email?: string
  observations?: string
  attachmentRules?: AttachmentRule[]
  createdAt?: string;
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

export const CONVENIO_TYPE_LABELS: Record<string, string> = {
  'public': 'Público',
  'private': 'Particular',
  'insurance': 'Convênio',
  'self_pay': 'Auto-pagamento'
};

export const CONVENIO_TYPE_COLORS: Record<string, string> = {
  'public': 'blue',
  'private': 'green',
  'insurance': 'purple',
  'self_pay': 'orange'
};

export const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const BLOCK_REASONS = [
  'Inadimplência', 'Licença Médica', 'Desligamento', 'Férias', 'Outros'
];

export interface ProcedureType {
  value: string;
  label: string;
  color?: string;
}

export const PROCEDURE_TYPES: ProcedureType[] = [
  { value: 'Consulta', label: 'Consulta', color: 'bg-blue-100 text-blue-700' },
  { value: 'Exame', label: 'Exame', color: 'bg-green-100 text-green-700' },
  { value: 'Cirurgia', label: 'Cirurgia', color: 'bg-red-100 text-red-700' },
  { value: 'Pequeno Procedimento', label: 'Pequeno Procedimento', color: 'bg-orange-100 text-orange-700' },
  { value: 'Outros', label: 'Outros', color: 'bg-gray-100 text-gray-700' }
];

export const ANESTHESIA_TYPES = [
  'Local', 'Sedação', 'Geral', 'Raque', 'Peridural'
];
