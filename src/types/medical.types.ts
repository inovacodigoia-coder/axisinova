export interface VitalSigns {
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  temperature?: number
  oxygenSaturation?: number
  respiratoryRate?: number
  weight?: number
  height?: number
  bmi?: number
  glucometry?: number
  recordedAt: string
}

export interface CID10 {
  code: string
  description: string
  category: string
}

export interface Diagnosis {
  cid10Primary: CID10
  cid10Secondary?: CID10[]
  type: 'working' | 'confirmed' | 'differential' | 'ruled_out'
  notes?: string
}

export interface PrescriptionItem {
  id: string
  medication: string
  dosage: string
  form: string
  route: string
  frequency: string
  duration: string
  quantity: number
  instructions?: string
  isControlled: boolean
}

export interface ExamRequest {
  id: string
  examCatalogId: string
  examCatalogType: 'exam' | 'procedure'
  examName: string
  examCode?: string
  urgency: 'routine' | 'urgent' | 'emergency'
  clinicalIndication: string
  prepInstructions?: string
  requestedAt: string
  // Legacy fields for backward compat with mock data
  examId?: string
}

export interface AttendanceRecord {
  id: string
  appointmentId: string
  patientId: string
  doctorId: string
  companyId: string
  startedAt: string
  finishedAt?: string
  duration?: number
  vitalSigns?: VitalSigns
  chiefComplaint: string
  anamnesis?: string
  physicalExam?: string
  diagnosis?: Diagnosis
  prescription?: PrescriptionItem[]
  examRequests?: ExamRequest[]
  certificateDays?: number
  certificateReason?: string
  notes?: string
  followUpDays?: number
  followUpNotes?: string
  status: 'in_progress' | 'completed' | 'signed'
  signedAt?: string
  createdBy: string
  updatedAt: string
}

export interface PatientAlert {
  id: string
  patientId: string
  companyId?: string
  type: 'allergy' | 'chronic_condition' | 'important_note' | 'medication_in_use'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  createdBy: string
  createdAt: string
  isActive: boolean
}

export interface PatientMedication {
  id: string
  patientId: string
  medication: string
  dosage: string
  frequency: string
  startDate: string
  endDate?: string
  status: 'active' | 'suspended' | 'completed'
  prescribedBy: string
}

export interface ExamResult {
  id: string
  patientId: string
  examName: string
  examCode: string
  requestedBy: string
  requestedAt: string
  status: 'requested' | 'collected' | 'in_analysis' | 'result_available' | 'delivered'
  resultDate?: string
  resultSummary?: string
}

export const VITAL_RANGES = {
  bloodPressureSystolic: { min: 90, max: 140, alertHigh: 140, unit: 'mmHg' },
  bloodPressureDiastolic: { min: 60, max: 90, alertHigh: 90, unit: 'mmHg' },
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  temperature: { min: 35.5, max: 37.5, alertHigh: 37.8, unit: '°C' },
  oxygenSaturation: { min: 95, max: 100, alertLow: 95, unit: '%' },
  respiratoryRate: { min: 12, max: 20, unit: 'irpm' },
  glucometry: { min: 70, max: 140, alertHigh: 200, unit: 'mg/dL' },
} as const

export const BMI_CLASSIFICATIONS = [
  { max: 18.5, label: 'Abaixo do peso', color: 'text-blue-600' },
  { max: 24.9, label: 'Normal', color: 'text-green-600' },
  { max: 29.9, label: 'Sobrepeso', color: 'text-yellow-600' },
  { max: 34.9, label: 'Obesidade Grau I', color: 'text-orange-500' },
  { max: 39.9, label: 'Obesidade Grau II', color: 'text-orange-600' },
  { max: Infinity, label: 'Obesidade Grau III', color: 'text-red-600' },
] as const
