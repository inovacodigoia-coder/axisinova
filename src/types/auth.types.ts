export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'receptionist'
  | 'telephonist'
  | 'billing'
  | 'doctor'
  | 'employee'

export type SuperAdminLevel = 'super_admin_master' | 'super_admin_support' | 'super_admin_finance'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string | null
  companyName: string | null
  avatar?: string
  lastLogin: string
  isActive: boolean
  /** Quando true, o usuário precisa redefinir a senha no primeiro acesso */
  mustChangePassword?: boolean
  /** Atribuição de administrador (ADM) concedida pelo administrador da empresa */
  isAdmin?: boolean
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export type PermissionAction =
  | 'view_dashboard'
  | 'manage_users'
  | 'manage_company'
  | 'view_schedule'
  | 'manage_schedule'
  | 'view_patients'
  | 'manage_patients'
  | 'view_billing'
  | 'manage_billing'
  | 'view_reports'
  | 'manage_settings'
  | 'view_audit_log'
  | 'manage_plans'
  | 'impersonate'
