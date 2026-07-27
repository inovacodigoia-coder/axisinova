import type { Profile, Sector, MenuFunction } from './permissions.types'

export interface CompanyUser {
  id: string
  username: string
  fullName: string
  email: string
  cpf: string
  birthDate: string
  phone: string
  professionalClass?: string
  councilNumber?: string
  councilState?: string
  occupation?: string
  companyId: string
  profiles: string[]
  sectors: string[]
  activeProfileId: string | null
  activeSectorId: string | null
  avatar?: string
  isActive: boolean
  isBlocked: boolean
  blockedReason?: string
  blockedAt?: string
  blockedBy?: string
  lastLogin?: string
  createdAt: string
  gender?: string
  forcePasswordChange?: boolean
}

export interface Establishment {
  id: string
  company_id: string
  name: string
  cnpj?: string
  city?: string
  is_main_branch: boolean
  created_at?: string
  origins?: Origin[]
}

export interface Origin {
  id: string
  company_id: string
  establishment_id: string
  name: string
  internal_code?: string
  created_at?: string
}

export interface OriginPreference {
  origin_id: string
  is_favorite: boolean
  is_default: boolean
}

export interface CompanySession {
  user: CompanyUser
  activeProfile: Profile
  activeSector: Sector | null
  activeOrigin: Origin | null
  availableFunctions: MenuFunction[]
  availableUtilities: MenuFunction[]
}
