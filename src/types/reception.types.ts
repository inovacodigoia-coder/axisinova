export type TicketCategory = 'SP' | 'SN' | 'EX' | 'PR' | 'RE'

export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_reception'
  | 'documents_ok'
  | 'called_doctor'
  | 'in_progress'
  | 'completed'
  | 'absent'

export interface QueueEntry {
  id: string
  ticketNumber: string
  ticketCategory: TicketCategory
  patientId: string
  patientName: string
  patientAge: number
  appointmentId: string
  doctorId: string
  doctorName: string
  appointmentType: 'consultation' | 'exam' | 'procedure'
  convenioId: string
  convenioName: string
  status: QueueStatus
  isPreferential: boolean
  preferentialReason?: string
  checkedInAt?: string
  calledAt?: string
  callCount: number
  documentsValidated: boolean
  observations?: string
  waitingMinutes: number
  room?: string
  createdAt: string
}

export interface ReceptionDocument {
  id: string
  appointmentId: string
  patientId: string
  type: DocumentType
  name: string
  fileUrl: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  isRequired: boolean
  status: 'pending' | 'validated' | 'rejected'
  rejectionReason?: string
}

export type DocumentType =
  | 'convenio_card'
  | 'medical_request'
  | 'id_document'
  | 'authorization'
  | 'sadt_guide'
  | 'medical_report'
  | 'other'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  convenio_card: 'Carteirinha do Convênio',
  medical_request: 'Pedido Médico',
  id_document: 'RG ou CPF',
  authorization: 'Guia de Autorização',
  sadt_guide: 'Guia SADT',
  medical_report: 'Laudo Médico',
  other: 'Outros Documentos',
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  SP: 'Preferencial',
  SN: 'Normal',
  EX: 'Exame',
  PR: 'Procedimento',
  RE: 'Retorno',
}

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Aguardando',
  called: 'Chamado',
  in_reception: 'Na Recepção',
  documents_ok: 'Docs OK',
  called_doctor: 'Chamado Médico',
  in_progress: 'Em Atendimento',
  completed: 'Concluído',
  absent: 'Ausente',
}
