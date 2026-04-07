import type { ResultStatus } from './results.types'

export interface PatientPortalSession {
  patientId: string
  patientName: string
  patientSocialName?: string
  patientBirthDate: string
  accessToken: string
  expiresAt: string
}

export interface PatientPortalResult {
  id: string
  examName: string
  examCode: string
  doctorName: string
  requestedAt: string
  expectedAt?: string
  status: ResultStatus
  resultFileUrl?: string
  deliveredAt?: string
  observations?: string
  companyName: string
  companyLogo?: string
}
