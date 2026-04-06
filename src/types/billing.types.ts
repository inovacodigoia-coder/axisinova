export type GuideType =
  | 'consultation'
  | 'sadt'
  | 'hospitalization'
  | 'summary'
  | 'other_expenses'

export type GuideStatus =
  | 'draft'
  | 'pending_docs'
  | 'pending_authorization'
  | 'authorized'
  | 'submitted'
  | 'processing'
  | 'paid'
  | 'partial_glosa'
  | 'total_glosa'
  | 'returned_reception'
  | 'cancelled'

export type GlosaType =
  | 'technical'
  | 'administrative'
  | 'authorization'
  | 'duplicate'
  | 'value'

export type GlosaStatus =
  | 'pending'
  | 'in_analysis'
  | 'recurso_submitted'
  | 'accepted'
  | 'reversed'
  | 'partial_reversed'

export interface GuideProcedure {
  id: string
  tussCode: string
  description: string
  quantity: number
  unitValue: number
  totalValue: number
  reduction?: number
  glosaValue?: number
  glosaReason?: string
}

export interface GuideAuditEntry {
  id: string
  action: string
  performedBy: string
  performedByName: string
  previousStatus?: GuideStatus
  newStatus?: GuideStatus
  notes?: string
  timestamp: string
}

export interface Guide {
  id: string
  companyId: string
  appointmentId: string
  patientId: string
  patientName: string
  patientBirthDate: string
  patientMotherName?: string
  convenioId: string
  convenioName: string
  convenioAnsCode?: string
  convenioCardNumber: string
  doctorId: string
  doctorName: string
  doctorCRM: string
  doctorCRMState?: string
  type: GuideType
  status: GuideStatus
  tissGuideNumber: string
  convenioGuideNumber?: string
  authorizationNumber?: string
  authorizationExpiry?: string
  attendanceDate: string
  attendanceType: string
  procedures: GuideProcedure[]
  totalValueSubmitted: number
  totalValueApproved?: number
  totalValueGlosa?: number
  documents: string[]
  loteId?: string
  returnedReason?: string
  returnedAt?: string
  returnedBy?: string
  correctedAt?: string
  billerNotes?: string
  auditLog: GuideAuditEntry[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Glosa {
  id: string
  guideId: string
  companyId: string
  convenioId: string
  convenioName: string
  patientName: string
  type: GlosaType
  status: GlosaStatus
  value: number
  recoveredValue?: number
  reason: string
  identifiedAt: string
  analystId?: string
  recursoText?: string
  recursoSentAt?: string
  recursoDeadline?: string
  resolvedAt?: string
  attachments?: string[]
  notes?: string
}

export interface Lote {
  id: string
  companyId: string
  convenioId: string
  convenioName: string
  number: string
  competencia: string
  status: 'open' | 'closed' | 'submitted' | 'processing' | 'finished'
  guides: string[]
  totalGuides: number
  totalValue: number
  submittedAt?: string
  protocolNumber?: string
  createdBy: string
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  action: string
  targetType: string
  targetId: string
  details: string
  timestamp: string
}
