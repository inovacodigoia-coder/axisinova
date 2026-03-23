import { useAuth } from '@/context/AuthContext'
import type { PermissionAction, UserRole } from '@/types/auth.types'

const PERMISSION_MAP: Record<UserRole, PermissionAction[]> = {
  super_admin: [
    'view_dashboard', 'manage_users', 'manage_company', 'view_schedule', 'manage_schedule',
    'view_patients', 'manage_patients', 'view_billing', 'manage_billing', 'view_reports',
    'manage_settings', 'view_audit_log', 'manage_plans', 'impersonate',
  ],
  company_admin: [
    'view_dashboard', 'manage_users', 'manage_company', 'view_schedule', 'manage_schedule',
    'view_patients', 'manage_patients', 'view_billing', 'manage_billing', 'view_reports', 'manage_settings',
  ],
  doctor: ['view_dashboard', 'view_schedule', 'manage_schedule', 'view_patients', 'manage_patients', 'view_reports'],
  receptionist: ['view_dashboard', 'view_schedule', 'manage_schedule', 'view_patients'],
  telephonist: ['view_dashboard', 'view_schedule', 'manage_schedule'],
  billing: ['view_dashboard', 'view_billing', 'manage_billing', 'view_reports'],
  employee: ['view_dashboard'],
}

export function usePermissions() {
  const { user } = useAuth()

  const can = (action: PermissionAction): boolean => {
    if (!user) return false
    return PERMISSION_MAP[user.role]?.includes(action) ?? false
  }

  const isSuperAdmin = user?.role === 'super_admin'
  const isCompanyAdmin = user?.role === 'company_admin'

  return { can, isSuperAdmin, isCompanyAdmin }
}
