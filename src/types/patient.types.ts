// =====================================================================
// Tipos do módulo de Cadastro e Gestão de Pacientes — Axis Inova
// =====================================================================

export type BloodType =
  | 'A+' | 'A-' | 'B+' | 'B-'
  | 'AB+' | 'AB-' | 'O+' | 'O-'
  | 'unknown'

export type MaritalStatus =
  | 'single' | 'married' | 'divorced'
  | 'widowed' | 'stable_union' | 'other'

export type Gender = 'male' | 'female' | 'other' | 'not_informed'

export type EthnicityType =
  | 'white' | 'black' | 'brown' | 'yellow' | 'indigenous' | 'not_informed'

export type EducationType =
  | 'no_education' | 'elementary_incomplete' | 'elementary_complete'
  | 'high_school_incomplete' | 'high_school_complete'
  | 'higher_incomplete' | 'higher_complete' | 'postgraduate'

export type PatientStatus = 'active' | 'inactive' | 'blocked' | 'deceased'

export type PhoneType = 'mobile' | 'landline'

export type AllergyType = 'medication' | 'food' | 'environmental' | 'other'
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'critical'

// ─── Endereço ────────────────────────────────────────────────────────
export interface PatientAddress {
  cep: string                       // 00000-000
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string                     // UF
  ibgeCode?: string
}

// ─── Convênio ────────────────────────────────────────────────────────
export interface PatientConvenio {
  convenioId: string
  convenioName: string
  cardNumber: string
  cardExpiry?: string               // MM/AAAA
  planName?: string
  holderName?: string
  holderCPF?: string
  isHolder: boolean
  nationalHealthCard?: string       // CNS
}

// ─── Responsável ─────────────────────────────────────────────────────
export interface PatientResponsible {
  name: string
  cpf: string
  birthDate?: string
  relationship: string
  phone1: string
  phone2?: string
  email?: string
  address?: PatientAddress
}

// ─── Alergia ─────────────────────────────────────────────────────────
export interface PatientAllergy {
  id: string
  substance: string
  type: AllergyType
  reaction: string
  severity: AllergySeverity
}

// ─── Medicamento contínuo ────────────────────────────────────────────
export interface ContinuousMedication {
  id: string
  name: string
  dosage?: string
  frequency?: string
}

// ─── Dados clínicos ──────────────────────────────────────────────────
export interface PatientClinicalData {
  bloodType?: BloodType
  allergies: PatientAllergy[]
  chronicConditions: string[]
  continuousMedications: ContinuousMedication[]
  disabilities?: string
  needsPriority?: boolean
  organDonor?: boolean
  notes?: string
}

// ─── Alerta interno ──────────────────────────────────────────────────
export interface InternalAlert {
  message: string
  color: 'red' | 'yellow' | 'blue'
}

// ─── Paciente completo ──────────────────────────────────────────────
export interface Patient {
  id: string
  companyId: string

  // Identificação
  fullName: string
  socialName?: string
  cpf?: string
  rg?: string
  rgIssuer?: string
  rgState?: string
  rgIssueDate?: string
  birthDate: string                 // ISO yyyy-mm-dd
  age?: number
  birthCity?: string
  birthState?: string
  nationality?: string
  gender: Gender
  ethnicity?: EthnicityType
  maritalStatus?: MaritalStatus
  education?: EducationType
  motherName?: string
  fatherName?: string
  status: PatientStatus

  // Contato
  phone1: string
  phone1Type: PhoneType
  phone2?: string
  phone2Type?: PhoneType
  phone3?: string
  email?: string
  emailSecondary?: string

  address?: PatientAddress

  // Profissão
  occupation?: string
  employer?: string
  workPhone?: string

  // Convênios e responsável
  convenios: PatientConvenio[]
  responsible?: PatientResponsible

  // Clínicos
  clinicalData: PatientClinicalData

  // Origem
  referralSource?: string
  referralBy?: string
  registeredBy?: string
  importedFrom?: string
  importBatchId?: string

  // Observações
  generalNotes?: string
  internalAlerts?: InternalAlert
  financialNotes?: string
  tags: string[]

  // Controle
  createdAt: string
  updatedAt: string
  lastAttendance?: string
  totalAttendances?: number
}

// ─── Estatísticas resumidas ─────────────────────────────────────────
export interface PatientStats {
  totalConsultations: number
  totalExams: number
  totalProcedures: number
  totalAttendances: number
  lastAttendance?: string
  lastDoctor?: string
  pendingExams: number
  pendingResults: number
  openGuides: number
}

// ─── Importação em lote ─────────────────────────────────────────────
export interface ImportRow {
  rowIndex: number
  rawData: Record<string, string>
  mappedData: Partial<Patient>
  status: 'valid' | 'warning' | 'error' | 'duplicate'
  errors: string[]
  warnings: string[]
  duplicatePatientId?: string
}

// ─── Filtros da listagem ────────────────────────────────────────────
export interface PatientListFilters {
  search?: string
  status?: PatientStatus[]
  gender?: Gender[]
  convenioIds?: string[]
  ageRanges?: string[]              // '0-12' | '13-17' | '18-30' | '31-45' | '46-60' | '60+'
  lastAttendance?: string           // 'week' | 'month' | '3months' | '6months' | 'never'
  bloodType?: BloodType
  hasAllergy?: boolean
  city?: string
  birthDateFrom?: string
  birthDateTo?: string
}

// ─── Labels / dicionários úteis para selects e badges ────────────────
export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
  not_informed: 'Não informado',
}

export const STATUS_LABELS: Record<PatientStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
  deceased: 'Falecido',
}

export const STATUS_COLORS: Record<PatientStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  inactive: 'bg-muted text-muted-foreground',
  blocked: 'bg-destructive/10 text-destructive',
  deceased: 'bg-zinc-500/10 text-zinc-600',
}

export const ETHNICITY_LABELS: Record<EthnicityType, string> = {
  white: 'Branca',
  black: 'Preta',
  brown: 'Parda',
  yellow: 'Amarela',
  indigenous: 'Indígena',
  not_informed: 'Não informado',
}

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  divorced: 'Divorciado(a)',
  widowed: 'Viúvo(a)',
  stable_union: 'União estável',
  other: 'Outro',
}

export const EDUCATION_LABELS: Record<EducationType, string> = {
  no_education: 'Sem escolaridade',
  elementary_incomplete: 'Fundamental incompleto',
  elementary_complete: 'Fundamental completo',
  high_school_incomplete: 'Médio incompleto',
  high_school_complete: 'Médio completo',
  higher_incomplete: 'Superior incompleto',
  higher_complete: 'Superior completo',
  postgraduate: 'Pós-graduação',
}

export const ALLERGY_TYPE_LABELS: Record<AllergyType, string> = {
  medication: 'Medicamento',
  food: 'Alimento',
  environmental: 'Ambiental',
  other: 'Outro',
}

export const ALLERGY_SEVERITY_LABELS: Record<AllergySeverity, string> = {
  mild: 'Leve',
  moderate: 'Moderada',
  severe: 'Severa',
  critical: 'Crítica',
}

export const ALLERGY_SEVERITY_COLORS: Record<AllergySeverity, string> = {
  mild: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  moderate: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  severe: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  critical: 'bg-destructive/15 text-destructive',
}

export const BRAZIL_STATES: { value: string; label: string }[] = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' }, { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

export const CHRONIC_CONDITIONS_PRESET = [
  'HAS', 'DM Tipo 1', 'DM Tipo 2', 'Cardiopatia', 'DPOC',
  'Asma', 'IRC', 'Neoplasia', 'Hipotireoidismo', 'Epilepsia',
  'Depressão', 'Ansiedade', 'Obesidade', 'Artrite', 'Osteoporose',
]
