export type ApiPartnerType = 'laboratorio' | 'clinica' | 'convenio' | 'medico'
export type ApiPartnerStatus = 'active' | 'inactive'
export type ApiPartnerAuthorization = 'authorized' | 'pending' | 'blocked'
export type ApiPartnerAuthMethod = 'oauth2'

export interface ApiPartnerCredential {
  method: ApiPartnerAuthMethod
  /** Prefixo/últimos dígitos exibidos de forma mascarada (a chave completa só aparece uma vez) */
  masked: string
  clientId?: string
  createdAt: string
  revokedAt?: string | null
}

export interface ApiPartner {
  id: string
  companyId: string
  type: ApiPartnerType
  name: string
  document: string
  contactName?: string
  contactEmail: string
  contactPhone?: string
  notes?: string
  authMethod: ApiPartnerAuthMethod
  apiAuthorized: boolean
  status: ApiPartnerStatus
  credentials: ApiPartnerCredential[]
  lastSyncAt: string | null
  createdAt: string
}

export const PARTNER_TYPE_LABEL: Record<ApiPartnerType, string> = {
  laboratorio: 'Laboratório',
  clinica: 'Clínica',
  convenio: 'Convênio',
  medico: 'Médico Solicitante',
}

export const PARTNER_TYPE_ICON: Record<ApiPartnerType, string> = {
  laboratorio: 'FlaskConical',
  clinica: 'Building2',
  convenio: 'ShieldCheck',
  medico: 'Stethoscope',
}

export function partnerAuthorizationState(p: ApiPartner): ApiPartnerAuthorization {
  if (p.status === 'inactive') return 'blocked'
  return p.apiAuthorized ? 'authorized' : 'pending'
}
