import type { AuthUser } from '@/types/auth.types'

export interface MockCredential {
  email: string
  password: string
  user: AuthUser
}

export const MOCK_CREDENTIALS: MockCredential[] = [
  // Super Administrador
  {
    email: 'inovacodigoiaadm@inovacodigoia.com.br',
    password: 'Inov@codigoia2026',
    user: {
      id: 'super_admin_001',
      name: 'Super Administrador',
      email: 'inovacodigoiaadm@inovacodigoia.com.br',
      role: 'super_admin',
      companyId: null,
      companyName: null,
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
  // Clínica Demo — Admin
  {
    email: 'admin@clinicademo.com.br',
    password: 'Admin@2025',
    user: {
      id: 'company_admin_001',
      name: 'Administrador Demo',
      email: 'admin@clinicademo.com.br',
      role: 'company_admin',
      companyId: 'comp_001',
      companyName: 'Clínica Demo Ltda',
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
  // Clínica Demo — Médico
  {
    email: 'medico@clinicademo.com.br',
    password: 'Medico@2025',
    user: {
      id: 'doctor_001',
      name: 'Dr. Carlos Lima',
      email: 'medico@clinicademo.com.br',
      role: 'doctor',
      companyId: 'comp_001',
      companyName: 'Clínica Demo Ltda',
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
  // Clínica Demo — Recepção
  {
    email: 'recepcao@clinicademo.com.br',
    password: 'Recepcao@2025',
    user: {
      id: 'receptionist_001',
      name: 'Carla Souza',
      email: 'recepcao@clinicademo.com.br',
      role: 'receptionist',
      companyId: 'comp_001',
      companyName: 'Clínica Demo Ltda',
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
  // Clínica Demo — Faturamento
  {
    email: 'faturamento@clinicademo.com.br',
    password: 'Fatura@2025',
    user: {
      id: 'billing_001',
      name: 'Ana Lima',
      email: 'faturamento@clinicademo.com.br',
      role: 'billing',
      companyId: 'comp_001',
      companyName: 'Clínica Demo Ltda',
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
  // Legacy — keep old superadmin working
  {
    email: 'superadmin@axisinova.com',
    password: 'Admin@2025',
    user: {
      id: 'u_sa_001',
      name: 'Rafael Mendes',
      email: 'superadmin@axisinova.com',
      role: 'super_admin',
      companyId: null,
      companyName: null,
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
  // InovaSoftteste
  {
    email: 'inivacodigoia@inivacodigoia.com.br',
    password: '111111adm',
    user: {
      id: 'u_ca_010',
      name: 'Admin InovaSoftteste',
      email: 'inivacodigoia@inivacodigoia.com.br',
      role: 'company_admin',
      companyId: 'comp_011',
      companyName: 'InovaSoftteste',
      isActive: true,
      lastLogin: new Date().toISOString(),
    },
  },
]

export function authenticateUser(email: string, password: string): MockCredential | null {
  return (
    MOCK_CREDENTIALS.find(
      (c) => c.email.toLowerCase().trim() === email.toLowerCase().trim() && c.password === password
    ) || null
  )
}

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
