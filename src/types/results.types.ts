export type ResultStatus =
  | 'requested'
  | 'collected'
  | 'in_analysis'
  | 'available'
  | 'delivered'
  | 'partial'

export interface ExamResult {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  patientCpf?: string
  patientMotherName: string
  examId: string
  examName: string
  examCode: string
  doctorId: string
  doctorName: string
  requestedAt: string
  expectedAt?: string
  expectedAtObservation?: string
  status: ResultStatus
  resultFileUrl?: string
  collectedAt?: string
  analysisNotes?: string
  receptionNotes?: string
  deliveredAt?: string
  deliveredTo: 'patient' | 'responsible' | null
  deliveredToName?: string
  deliveredToDocument?: string
  deliveredBy: string
  companyId: string
}
