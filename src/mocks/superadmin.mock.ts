import { Company, CompanyUser, Invoice } from '@/types/company.types'
import { AuditEntry, DashboardMetrics, MonthlySignup, PlanConfig, PlanDistribution, SystemAlert } from '@/types/superadmin.types'

export const MOCK_USERS_AUTH = [
  { email: 'inovacodigoiaadm@inovacodigoia.com.br', password: 'Inov@codigoia2026', role: 'super_admin' as const, id: 'super_admin_001', name: 'Super Administrador' },
  { email: 'admin@clinicademo.com.br', password: 'Admin@2025', role: 'company_admin' as const, id: 'company_admin_001', name: 'Administrador Demo', companyId: 'comp_001', companyName: 'Clínica Demo Ltda' },
  { email: 'medico@clinicademo.com.br', password: 'Medico@2025', role: 'doctor' as const, id: 'doctor_001', name: 'Dr. Carlos Lima', companyId: 'comp_001', companyName: 'Clínica Demo Ltda' },
  { email: 'recepcao@clinicademo.com.br', password: 'Recepcao@2025', role: 'receptionist' as const, id: 'receptionist_001', name: 'Carla Souza', companyId: 'comp_001', companyName: 'Clínica Demo Ltda' },
  { email: 'faturamento@clinicademo.com.br', password: 'Fatura@2025', role: 'billing' as const, id: 'billing_001', name: 'Ana Lima', companyId: 'comp_001', companyName: 'Clínica Demo Ltda' },
]

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'comp_001', razaoSocial: 'Clínica Demo Ltda', nomeFantasia: 'Clínica Demo Ltda',
    cnpj: '00.000.000/0001-00', segmento: 'Clínica Médica', telefone: '(11) 3456-7890',
    email: 'admin@clinicademo.com.br', website: '',
    endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1578', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' },
    plano: 'Pro', status: 'active', medicosAtivos: 2, medicosLimite: 15, usuariosAtivos: 5, usuariosLimite: 999,
    armazenamentoUsadoGB: 1.5, armazenamentoLimiteGB: 100, valorMensal: 990, criadoEm: '2025-04-01', ultimoAcesso: '2025-04-06',
  },
]

export const MOCK_COMPANY_USERS: CompanyUser[] = [
  { id: 'company_admin_001', name: 'Administrador Demo', email: 'admin@clinicademo.com.br', role: 'company_admin', isActive: true, lastAccess: '2025-04-06 08:30', companyId: 'comp_001' },
  { id: 'doctor_001', name: 'Dr. Carlos Lima', email: 'medico@clinicademo.com.br', role: 'doctor', isActive: true, lastAccess: '2025-04-06 09:15', companyId: 'comp_001' },
  { id: 'receptionist_001', name: 'Carla Souza', email: 'recepcao@clinicademo.com.br', role: 'receptionist', isActive: true, lastAccess: '2025-04-06 07:45', companyId: 'comp_001' },
  { id: 'billing_001', name: 'Ana Lima', email: 'faturamento@clinicademo.com.br', role: 'billing', isActive: true, lastAccess: '2025-04-06 10:00', companyId: 'comp_001' },
]

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv_001', reference: 'Abr/2025', amount: 990, status: 'paid', paidAt: '2025-04-05', companyId: 'comp_001' },
]

export const MOCK_DASHBOARD_METRICS: DashboardMetrics = {
  totalCompanies: 1,
  mrr: 990,
  activeUsersToday: 5,
  attendancesLast24h: 0,
  companiesGrowth: 0,
  mrrGrowth: 0,
  usersGrowth: 0,
  attendancesGrowth: 0,
}

export const MOCK_MONTHLY_SIGNUPS: MonthlySignup[] = [
  { month: 'Abr', count: 1 },
]

export const MOCK_PLAN_DISTRIBUTION: PlanDistribution[] = [
  { name: 'Pro', value: 1, color: 'hsl(262, 92%, 56%)' },
]

export const MOCK_SYSTEM_ALERTS: SystemAlert[] = []

export const MOCK_AUDIT_LOG: AuditEntry[] = [
  { id: 'aud_001', timestamp: '2025-04-06 10:00:00', userId: 'super_admin_001', userName: 'Super Administrador', userEmail: 'inovacodigoiaadm@inovacodigoia.com.br', companyName: null, action: 'Login realizado', details: 'Acesso ao painel Super Admin', severity: 'info' },
]

export const MOCK_PLANS: PlanConfig[] = [
  {
    id: 'plan_starter', name: 'Starter', description: 'Para consultórios e clínicas pequenas',
    priceMonthly: 490, priceAnnual: 392, isPopular: false, isVisible: true, acceptingSignups: true,
    features: ['Até 3 usuários simultâneos', '1 médico cadastrado', 'Agendamento e recepção', 'Prontuário básico', 'Relatórios essenciais', 'Suporte via chat', 'Armazenamento: 10 GB'],
    maxDoctors: 1, maxUsers: 3, storageGB: 10, companiesCount: 0,
  },
  {
    id: 'plan_pro', name: 'Pro', description: 'Para clínicas em crescimento',
    priceMonthly: 990, priceAnnual: 792, isPopular: true, isVisible: true, acceptingSignups: true,
    features: ['Usuários ilimitados', 'Até 15 médicos', 'Todos os módulos', 'BI com dashboards em tempo real', 'Digitalização de guias ilimitada', 'Integração com convênios', 'Suporte prioritário', 'Armazenamento: 100 GB'],
    maxDoctors: 15, maxUsers: null, storageGB: 100, companiesCount: 1,
  },
  {
    id: 'plan_enterprise', name: 'Enterprise', description: 'Para redes e hospitais',
    priceMonthly: 2490, priceAnnual: 1992, isPopular: false, isVisible: true, acceptingSignups: true,
    features: ['Médicos ilimitados', 'Multi-unidades (até 5 CNPJs)', 'Tudo do Pro +', 'API de integração', 'Onboarding dedicado', 'SLA 99,9%', 'Treinamento incluso', 'Armazenamento: 1 TB', 'Suporte 24/7'],
    maxDoctors: null, maxUsers: null, storageGB: 1000, companiesCount: 0,
  },
]
