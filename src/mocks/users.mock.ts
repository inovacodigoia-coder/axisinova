// Demo/mock credentials were removed for security: authentication is handled
// exclusively by the backend (Supabase Auth) with server-verified roles.


export function getRedirectByRole(role: string): string {
  switch (role) {
    case 'super_admin':
      return '/superadmin/dashboard'
    case 'company_admin':
      return '/app/dashboard'
    case 'doctor':
      return '/app/medico'
    case 'receptionist':
      return '/app/recepcao'
    case 'billing':
      return '/app/faturamento'
    case 'telephonist':
      return '/app/agendamento'
    default:
      return '/app/dashboard'
  }
}
