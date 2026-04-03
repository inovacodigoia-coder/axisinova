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

export interface CompanySession {
  user: CompanyUser
  activeProfile: Profile
  activeSector: Sector | null
  availableFunctions: MenuFunction[]
  availableUtilities: MenuFunction[]
}
