import type { Patient } from './patient.types'

export type AttendanceServiceType = 'consultation' | 'exam' | 'procedure'
export type AttendancePaymentType = 'convenio' | 'private' | 'free'

export interface AttendanceAttachment {
  id: string
  orderId: string
  documentType: string
  fileName: string
  fileSize: number
  fileUrl: string
  storagePath?: string
  isRequired: boolean
  attachmentRuleId?: string
  observation?: string
  uploadedAt: string
  uploadedBy: string
}

export interface AttendanceOrder {
  id: string
  orderNumber: string
  patientId: string
  patientName: string
  companyId: string
  unitId: string
  ticketId?: string
  ticketCode?: string
  
  // Lab specific
  originId?: string
  originCode?: number
  originName?: string
  protocol?: string
  hash?: string
  examMode?: 'clinic' | 'lab'
  deliveryDate?: string
  labGuides?: any[]


  serviceType: AttendanceServiceType
  paymentType: AttendancePaymentType

  doctorId?: string
  doctorName?: string
  doctorCRM?: string
  specialty?: string
  requestingDoctor?: string

  procedureId?: string
  procedureName?: string
  procedureCode?: string
  procedureDescription?: string

  convenioId?: string
  convenioName?: string
  cardNumber?: string
  cardExpiry?: string

  authorizationCode?: string
  authorizationDate?: string
  authorizationExpiry?: string
  authorizationPassword?: string

  billingCode?: string
  billingTable?: 'TUSS' | 'AMB' | 'CBHPM' | 'OTHER'
  quantity?: number
  participationDegree?: string
  cnes?: string
  cbo?: string

  privateValue?: number
  freeReason?: string

  attachments: AttendanceAttachment[]
  attachmentRulesSatisfied: boolean
  attachmentOverrideReason?: string

  status: 'waiting' | 'waiting_collection' | 'collection_done' | 'in_analysis' | 'validation' | 'released' | 'cancelled' | 'open' | 'authorized' | 'completed'
  scheduledAppointmentId?: string
  registeredBy: string
  registeredByName?: string
  registeredAt: string
  updatedAt: string
}

export const SERVICE_TYPE_LABELS: Record<AttendanceServiceType, string> = {
  consultation: 'Consulta',
  exam: 'Exame',
  procedure: 'Procedimento',
}

export const PAYMENT_TYPE_LABELS: Record<AttendancePaymentType, string> = {
  convenio: 'Convênio',
  private: 'Particular',
  free: 'Cortesia',
}

export interface AttendanceSearchResult {
  type: 'patient' | 'order'
  patient?: Patient
  order?: AttendanceOrder
}

export interface QuickPatientInput {
  fullName: string
  birthDate: string
  motherName: string
  phone1: string
  cpf?: string
  email?: string
  gender?: 'male' | 'female' | 'other' | 'not_informed'
  rg?: string
  convenioId?: string
  cardNumber?: string
  cardExpiry?: string
}
