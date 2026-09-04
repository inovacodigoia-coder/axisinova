export type PartnerOrderStatus = 'received' | 'processed' | 'error'

export interface PartnerOrderExam {
  code: string
  name: string
  recognized: boolean
}

export interface PartnerOrderPatient {
  name: string
  cpf: string
  birthDate: string
  sex: 'M' | 'F' | string
  phone?: string
}

export interface PartnerOrder {
  id: string
  companyId: string
  partnerId: string
  /** Protocolo enviado pelo parceiro (opcional no payload) */
  partnerProtocol?: string
  receivedAt: string
  status: PartnerOrderStatus
  patient: PartnerOrderPatient
  /** Indica se o paciente já existia na base ou foi criado automaticamente */
  patientExisted: boolean
  exams: PartnerOrderExam[]
  requestingDoctor?: string
  insurance?: string
  insuranceGuide?: string
  /** Protocolo interno do atendimento gerado (apenas quando processado) */
  attendanceProtocol?: string
  attendanceId?: string
  errorMessage?: string
  rawPayload: Record<string, unknown>
}

export const PARTNER_ORDER_STATUS_LABEL: Record<PartnerOrderStatus, string> = {
  received: 'Recebido',
  processed: 'Processado',
  error: 'Erro',
}

export function maskCpf(cpf: string): string {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`
}
