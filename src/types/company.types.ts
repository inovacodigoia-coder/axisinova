export type CompanyStatus = 'active' | 'trial' | 'overdue' | 'suspended' | 'cancelled'
export type PlanType = 'Starter' | 'Pro' | 'Enterprise'

export interface Company {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  segmento: string
  telefone: string
  email: string
  website?: string
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    estado: string
  }
  plano: PlanType
  status: CompanyStatus
  trialDaysLeft?: number
  medicosAtivos: number
  medicosLimite: number
  usuariosAtivos: number
  usuariosLimite: number
  armazenamentoUsadoGB: number
  armazenamentoLimiteGB: number
  valorMensal: number
  /** ID sequencial por ordem de criação no sistema */
  sequenceId?: number
  criadoEm: string
  ultimoAcesso?: string
}

export interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastAccess: string
  companyId: string
}

export interface Invoice {
  id: string
  reference: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  paidAt?: string
  companyId: string
}
