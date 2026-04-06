import { Company, CompanyUser, Invoice } from '@/types/company.types'
import { AuditEntry, DashboardMetrics, MonthlySignup, PlanConfig, PlanDistribution, SystemAlert } from '@/types/superadmin.types'

export const MOCK_USERS_AUTH = [
  { email: 'superadmin@axisinova.com', password: 'Admin@2025', role: 'super_admin' as const, id: 'u_sa_001', name: 'Rafael Mendes' },
  { email: 'inivacodigoiaadm@inivacodigoia.com.br', password: 'Inov@codigoia2026', role: 'super_admin' as const, id: 'u_sa_002', name: 'Super Admin Inova' },
  { email: 'admin@clinicademo.com', password: 'Admin@2025', role: 'company_admin' as const, id: 'u_ca_001', name: 'Dra. Camila Souza', companyId: 'comp_001', companyName: 'Clínica Vida & Saúde' },
  { email: 'inivacodigoia@inivacodigoia.com.br', password: '111111adm', role: 'company_admin' as const, id: 'u_ca_002', name: 'Admin InovaSoftteste', companyId: 'comp_011', companyName: 'InovaSoftteste' },
  { email: 'medico@clinicademo.com', password: 'Admin@2025', role: 'doctor' as const, id: 'u_doc_001', name: 'Dr. Henrique Lima', companyId: 'comp_001', companyName: 'Clínica Vida & Saúde' },
  { email: 'recepcao@clinicademo.com', password: 'Admin@2025', role: 'receptionist' as const, id: 'u_rec_001', name: 'Juliana Ferreira', companyId: 'comp_001', companyName: 'Clínica Vida & Saúde' },
]

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'comp_001', razaoSocial: 'Clínica Vida & Saúde LTDA', nomeFantasia: 'Clínica Vida & Saúde',
    cnpj: '12.345.678/0001-95', segmento: 'Clínica Médica', telefone: '(11) 3456-7890',
    email: 'contato@vidaesaude.com.br', website: 'https://vidaesaude.com.br',
    endereco: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1578', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' },
    plano: 'Pro', status: 'active', medicosAtivos: 8, medicosLimite: 15, usuariosAtivos: 22, usuariosLimite: 999,
    armazenamentoUsadoGB: 34.2, armazenamentoLimiteGB: 100, valorMensal: 990, criadoEm: '2024-03-15', ultimoAcesso: '2025-01-20',
  },
  {
    id: 'comp_002', razaoSocial: 'OdontoCenter Eireli', nomeFantasia: 'OdontoCenter',
    cnpj: '23.456.789/0001-01', segmento: 'Clínica Odontológica', telefone: '(21) 2345-6789',
    email: 'admin@odontocenter.com.br',
    endereco: { cep: '20040-020', logradouro: 'Rua da Assembleia', numero: '100', bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ' },
    plano: 'Starter', status: 'active', medicosAtivos: 2, medicosLimite: 1, usuariosAtivos: 3, usuariosLimite: 3,
    armazenamentoUsadoGB: 4.1, armazenamentoLimiteGB: 10, valorMensal: 490, criadoEm: '2024-06-01', ultimoAcesso: '2025-01-19',
  },
  {
    id: 'comp_003', razaoSocial: 'Laboratório BioAnalytica SA', nomeFantasia: 'BioAnalytica',
    cnpj: '34.567.890/0001-12', segmento: 'Laboratório', telefone: '(31) 3456-1234',
    email: 'lab@bioanalytica.com.br',
    endereco: { cep: '30130-000', logradouro: 'Av. Afonso Pena', numero: '867', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG' },
    plano: 'Enterprise', status: 'active', medicosAtivos: 25, medicosLimite: 999, usuariosAtivos: 48, usuariosLimite: 999,
    armazenamentoUsadoGB: 287, armazenamentoLimiteGB: 1000, valorMensal: 2490, criadoEm: '2023-11-10', ultimoAcesso: '2025-01-20',
  },
  {
    id: 'comp_004', razaoSocial: 'Clínica Bem Estar ME', nomeFantasia: 'Bem Estar Saúde',
    cnpj: '45.678.901/0001-23', segmento: 'Consultório Particular', telefone: '(41) 3345-6789',
    email: 'contato@bemestar.med.br',
    endereco: { cep: '80010-000', logradouro: 'Rua XV de Novembro', numero: '200', bairro: 'Centro', cidade: 'Curitiba', estado: 'PR' },
    plano: 'Pro', status: 'trial', trialDaysLeft: 7, medicosAtivos: 3, medicosLimite: 15, usuariosAtivos: 5, usuariosLimite: 999,
    armazenamentoUsadoGB: 1.2, armazenamentoLimiteGB: 100, valorMensal: 990, criadoEm: '2025-01-13',
  },
  {
    id: 'comp_005', razaoSocial: 'DiagnostiCenter LTDA', nomeFantasia: 'DiagnostiCenter',
    cnpj: '56.789.012/0001-34', segmento: 'Clínica de Imagem', telefone: '(51) 3232-5678',
    email: 'financeiro@diagnosticenter.com.br',
    endereco: { cep: '90010-000', logradouro: 'Rua dos Andradas', numero: '1001', bairro: 'Centro Histórico', cidade: 'Porto Alegre', estado: 'RS' },
    plano: 'Pro', status: 'overdue', medicosAtivos: 6, medicosLimite: 15, usuariosAtivos: 12, usuariosLimite: 999,
    armazenamentoUsadoGB: 67.8, armazenamentoLimiteGB: 100, valorMensal: 990, criadoEm: '2024-02-20', ultimoAcesso: '2025-01-15',
  },
  {
    id: 'comp_006', razaoSocial: 'Hospital Santa Clara SA', nomeFantasia: 'Hospital Santa Clara',
    cnpj: '67.890.123/0001-45', segmento: 'Hospital/UPA', telefone: '(71) 3456-7890',
    email: 'ti@santaclara.org.br',
    endereco: { cep: '40020-000', logradouro: 'Rua Chile', numero: '35', bairro: 'Comércio', cidade: 'Salvador', estado: 'BA' },
    plano: 'Enterprise', status: 'active', medicosAtivos: 42, medicosLimite: 999, usuariosAtivos: 87, usuariosLimite: 999,
    armazenamentoUsadoGB: 512, armazenamentoLimiteGB: 1000, valorMensal: 2490, criadoEm: '2023-07-01', ultimoAcesso: '2025-01-20',
  },
  {
    id: 'comp_007', razaoSocial: 'Clínica Derma Plus ME', nomeFantasia: 'Derma Plus',
    cnpj: '78.901.234/0001-56', segmento: 'Clínica Médica', telefone: '(61) 3234-5678',
    email: 'atendimento@dermaplus.com.br',
    endereco: { cep: '70070-000', logradouro: 'SBS Quadra 2', numero: 'Bloco E', bairro: 'Asa Sul', cidade: 'Brasília', estado: 'DF' },
    plano: 'Starter', status: 'suspended', medicosAtivos: 0, medicosLimite: 1, usuariosAtivos: 0, usuariosLimite: 3,
    armazenamentoUsadoGB: 2.3, armazenamentoLimiteGB: 10, valorMensal: 490, criadoEm: '2024-08-12',
  },
  {
    id: 'comp_008', razaoSocial: 'FisioVida Eireli', nomeFantasia: 'FisioVida',
    cnpj: '89.012.345/0001-67', segmento: 'Clínica Médica', telefone: '(62) 3345-9876',
    email: 'contato@fisiovida.com.br',
    endereco: { cep: '74015-000', logradouro: 'Av. Goiás', numero: '456', bairro: 'Setor Central', cidade: 'Goiânia', estado: 'GO' },
    plano: 'Starter', status: 'cancelled', medicosAtivos: 0, medicosLimite: 1, usuariosAtivos: 0, usuariosLimite: 3,
    armazenamentoUsadoGB: 0.8, armazenamentoLimiteGB: 10, valorMensal: 490, criadoEm: '2024-04-05',
  },
  {
    id: 'comp_009', razaoSocial: 'NeuroClínica Avançada LTDA', nomeFantasia: 'NeuroClínica',
    cnpj: '90.123.456/0001-78', segmento: 'Clínica Médica', telefone: '(48) 3234-5678',
    email: 'admin@neuroclinica.med.br',
    endereco: { cep: '88010-000', logradouro: 'Rua Felipe Schmidt', numero: '315', bairro: 'Centro', cidade: 'Florianópolis', estado: 'SC' },
    plano: 'Pro', status: 'active', medicosAtivos: 11, medicosLimite: 15, usuariosAtivos: 19, usuariosLimite: 999,
    armazenamentoUsadoGB: 45.6, armazenamentoLimiteGB: 100, valorMensal: 990, criadoEm: '2024-01-22', ultimoAcesso: '2025-01-20',
  },
  {
    id: 'comp_010', razaoSocial: 'Prontomed Saúde Corporativa SA', nomeFantasia: 'Prontomed',
    cnpj: '01.234.567/0001-89', segmento: 'Clínica Médica', telefone: '(85) 3456-7890',
    email: 'gestao@prontomed.com.br',
    endereco: { cep: '60060-000', logradouro: 'Av. Dom Manuel', numero: '1020', bairro: 'Centro', cidade: 'Fortaleza', estado: 'CE' },
    plano: 'Enterprise', status: 'active', medicosAtivos: 30, medicosLimite: 999, usuariosAtivos: 55, usuariosLimite: 999,
    armazenamentoUsadoGB: 380, armazenamentoLimiteGB: 1000, valorMensal: 2490, criadoEm: '2023-09-18', ultimoAcesso: '2025-01-20',
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
