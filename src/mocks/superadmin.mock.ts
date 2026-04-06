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
  { id: 'u_ca_001', name: 'Dra. Camila Souza', email: 'admin@clinicademo.com', role: 'company_admin', isActive: true, lastAccess: '2025-01-20 08:30', companyId: 'comp_001' },
  { id: 'u_doc_001', name: 'Dr. Henrique Lima', email: 'medico@clinicademo.com', role: 'doctor', isActive: true, lastAccess: '2025-01-20 09:15', companyId: 'comp_001' },
  { id: 'u_rec_001', name: 'Juliana Ferreira', email: 'recepcao@clinicademo.com', role: 'receptionist', isActive: true, lastAccess: '2025-01-20 07:45', companyId: 'comp_001' },
  { id: 'u_doc_002', name: 'Dr. Pedro Almeida', email: 'pedro@clinicademo.com', role: 'doctor', isActive: true, lastAccess: '2025-01-19 14:30', companyId: 'comp_001' },
  { id: 'u_bil_001', name: 'Marcos Oliveira', email: 'faturamento@clinicademo.com', role: 'billing', isActive: true, lastAccess: '2025-01-20 10:00', companyId: 'comp_001' },
  { id: 'u_tel_001', name: 'Ana Paula Costa', email: 'telefone@clinicademo.com', role: 'telephonist', isActive: false, lastAccess: '2025-01-10 16:20', companyId: 'comp_001' },
  { id: 'u_ca_002', name: 'Dr. Roberto Santos', email: 'admin@odontocenter.com.br', role: 'company_admin', isActive: true, lastAccess: '2025-01-19 11:00', companyId: 'comp_002' },
  { id: 'u_doc_003', name: 'Dra. Fernanda Reis', email: 'fernanda@odontocenter.com.br', role: 'doctor', isActive: true, lastAccess: '2025-01-18 09:30', companyId: 'comp_002' },
  { id: 'u_ca_003', name: 'Amanda Vieira', email: 'amanda@bioanalytica.com.br', role: 'company_admin', isActive: true, lastAccess: '2025-01-20 07:00', companyId: 'comp_003' },
  { id: 'u_doc_004', name: 'Dr. Thiago Nascimento', email: 'thiago@bioanalytica.com.br', role: 'doctor', isActive: true, lastAccess: '2025-01-20 08:45', companyId: 'comp_003' },
  { id: 'u_ca_010', name: 'Admin InovaSoftteste', email: 'inivacodigoia@inivacodigoia.com.br', role: 'company_admin', isActive: true, lastAccess: '2025-04-06 10:00', companyId: 'comp_011' },
]

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv_001', reference: 'Jan/2025', amount: 990, status: 'paid', paidAt: '2025-01-05', companyId: 'comp_001' },
  { id: 'inv_002', reference: 'Dez/2024', amount: 990, status: 'paid', paidAt: '2024-12-03', companyId: 'comp_001' },
  { id: 'inv_003', reference: 'Nov/2024', amount: 990, status: 'paid', paidAt: '2024-11-05', companyId: 'comp_001' },
  { id: 'inv_004', reference: 'Jan/2025', amount: 990, status: 'overdue', companyId: 'comp_005' },
  { id: 'inv_005', reference: 'Jan/2025', amount: 2490, status: 'paid', paidAt: '2025-01-02', companyId: 'comp_003' },
]

export const MOCK_DASHBOARD_METRICS: DashboardMetrics = {
  totalCompanies: 147,
  mrr: 98450,
  activeUsersToday: 312,
  attendancesLast24h: 1847,
  companiesGrowth: 12.3,
  mrrGrowth: 8.7,
  usersGrowth: -2.1,
  attendancesGrowth: 15.4,
}

export const MOCK_MONTHLY_SIGNUPS: MonthlySignup[] = [
  { month: 'Ago', count: 12 },
  { month: 'Set', count: 18 },
  { month: 'Out', count: 15 },
  { month: 'Nov', count: 22 },
  { month: 'Dez', count: 19 },
  { month: 'Jan', count: 27 },
]

export const MOCK_PLAN_DISTRIBUTION: PlanDistribution[] = [
  { name: 'Starter', value: 42, color: 'hsl(191, 100%, 50%)' },
  { name: 'Pro', value: 78, color: 'hsl(262, 92%, 56%)' },
  { name: 'Enterprise', value: 27, color: 'hsl(145, 63%, 42%)' },
]

export const MOCK_SYSTEM_ALERTS: SystemAlert[] = [
  { id: 'alert_1', type: 'warning', message: 'DiagnostiCenter com fatura em atraso há 5 dias', actionLabel: 'Ver empresa', createdAt: '2025-01-20 10:00' },
  { id: 'alert_2', type: 'info', message: 'Bem Estar Saúde — novo cadastro aguardando ativação', actionLabel: 'Ativar', createdAt: '2025-01-20 08:30' },
  { id: 'alert_3', type: 'error', message: 'Armazenamento do Hospital Santa Clara acima de 51% (512 GB / 1 TB)', actionLabel: 'Configurar', createdAt: '2025-01-19 14:00' },
  { id: 'alert_4', type: 'info', message: 'Atualização do módulo TISS v3.05 disponível para deploy', createdAt: '2025-01-18 09:00' },
]

export const MOCK_AUDIT_LOG: AuditEntry[] = [
  { id: 'aud_001', timestamp: '2025-01-20 10:32:15', userId: 'u_sa_001', userName: 'Rafael Mendes', userEmail: 'superadmin@axisinova.com', companyName: null, action: 'Login realizado', details: 'Acesso ao painel Super Admin', severity: 'info' },
  { id: 'aud_002', timestamp: '2025-01-20 10:15:00', userId: 'u_sa_001', userName: 'Rafael Mendes', userEmail: 'superadmin@axisinova.com', companyName: 'DiagnostiCenter', action: 'Impersonação', details: 'Acessou como admin da empresa DiagnostiCenter', severity: 'warning', payload: { companyId: 'comp_005', reason: 'Suporte técnico' } },
  { id: 'aud_003', timestamp: '2025-01-20 09:45:00', userId: 'u_ca_001', userName: 'Dra. Camila Souza', userEmail: 'admin@clinicademo.com', companyName: 'Clínica Vida & Saúde', action: 'Alteração de usuário', details: 'Desativou acesso de Ana Paula Costa', severity: 'info' },
  { id: 'aud_004', timestamp: '2025-01-19 16:00:00', userId: 'u_sa_001', userName: 'Rafael Mendes', userEmail: 'superadmin@axisinova.com', companyName: 'Derma Plus', action: 'Conta suspensa', details: 'Empresa suspensa por inadimplência — 3 faturas em atraso', severity: 'critical' },
  { id: 'aud_005', timestamp: '2025-01-19 14:30:00', userId: 'u_sa_001', userName: 'Rafael Mendes', userEmail: 'superadmin@axisinova.com', companyName: 'NeuroClínica', action: 'Troca de plano', details: 'Plano alterado de Starter para Pro', severity: 'warning', payload: { oldPlan: 'Starter', newPlan: 'Pro' } },
  { id: 'aud_006', timestamp: '2025-01-19 11:20:00', userId: 'u_ca_003', userName: 'Amanda Vieira', userEmail: 'amanda@bioanalytica.com.br', companyName: 'BioAnalytica', action: 'Download de dados', details: 'Exportou relatório de faturamento mensal', severity: 'info' },
  { id: 'aud_007', timestamp: '2025-01-18 09:00:00', userId: 'u_sa_001', userName: 'Rafael Mendes', userEmail: 'superadmin@axisinova.com', companyName: null, action: 'Alteração de configurações', details: 'Atualizou templates de e-mail transacional', severity: 'info' },
  { id: 'aud_008', timestamp: '2025-01-17 17:45:00', userId: 'u_sa_001', userName: 'Rafael Mendes', userEmail: 'superadmin@axisinova.com', companyName: 'FisioVida', action: 'Conta cancelada', details: 'Empresa solicitou cancelamento — dados serão retidos por 90 dias', severity: 'critical' },
]

export const MOCK_PLANS: PlanConfig[] = [
  {
    id: 'plan_starter', name: 'Starter', description: 'Para consultórios e clínicas pequenas',
    priceMonthly: 490, priceAnnual: 392, isPopular: false, isVisible: true, acceptingSignups: true,
    features: ['Até 3 usuários simultâneos', '1 médico cadastrado', 'Agendamento e recepção', 'Prontuário básico', 'Relatórios essenciais', 'Suporte via chat', 'Armazenamento: 10 GB'],
    maxDoctors: 1, maxUsers: 3, storageGB: 10, companiesCount: 42,
  },
  {
    id: 'plan_pro', name: 'Pro', description: 'Para clínicas em crescimento',
    priceMonthly: 990, priceAnnual: 792, isPopular: true, isVisible: true, acceptingSignups: true,
    features: ['Usuários ilimitados', 'Até 15 médicos', 'Todos os módulos', 'BI com dashboards em tempo real', 'Digitalização de guias ilimitada', 'Integração com convênios', 'Suporte prioritário', 'Armazenamento: 100 GB'],
    maxDoctors: 15, maxUsers: null, storageGB: 100, companiesCount: 78,
  },
  {
    id: 'plan_enterprise', name: 'Enterprise', description: 'Para redes e hospitais',
    priceMonthly: 2490, priceAnnual: 1992, isPopular: false, isVisible: true, acceptingSignups: true,
    features: ['Médicos ilimitados', 'Multi-unidades (até 5 CNPJs)', 'Tudo do Pro +', 'API de integração', 'Onboarding dedicado', 'SLA 99,9%', 'Treinamento incluso', 'Armazenamento: 1 TB', 'Suporte 24/7'],
    maxDoctors: null, maxUsers: null, storageGB: 1000, companiesCount: 27,
  },
]
