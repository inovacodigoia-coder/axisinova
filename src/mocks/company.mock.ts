import type { Profile, Sector, MenuFunction, PermissionsMap } from '@/types/permissions.types'
import type { CompanyUser } from '@/types/company-portal.types'

const COMPANY_ID = 'comp_001'

// ── Setores ─────────────────────────────────────────────────
export const MOCK_SECTORS: Sector[] = [
  { id: 'sec_01', name: 'Recepção Operacional', companyId: COMPANY_ID, description: 'Atendimento e acolhimento de pacientes', isActive: true, allowedProfiles: ['prof_01','prof_06','prof_09'] },
  { id: 'sec_02', name: 'Centro Cirúrgico', companyId: COMPANY_ID, description: 'Procedimentos cirúrgicos', isActive: true, allowedProfiles: ['prof_01','prof_07','prof_08'] },
  { id: 'sec_03', name: 'Faturamento', companyId: COMPANY_ID, description: 'Faturamento e convênios', isActive: true, allowedProfiles: ['prof_01','prof_05'] },
  { id: 'sec_04', name: 'Ambulatório', companyId: COMPANY_ID, description: 'Consultas ambulatoriais', isActive: true, allowedProfiles: ['prof_01','prof_02','prof_07','prof_09'] },
  { id: 'sec_05', name: 'UTI', companyId: COMPANY_ID, description: 'Unidade de terapia intensiva', isActive: true, allowedProfiles: ['prof_01','prof_07','prof_08'] },
  { id: 'sec_06', name: 'Pronto Atendimento', companyId: COMPANY_ID, description: 'Urgência e emergência', isActive: true, allowedProfiles: ['prof_01','prof_07','prof_09'] },
  { id: 'sec_07', name: 'Laboratório', companyId: COMPANY_ID, description: 'Análises clínicas', isActive: true, allowedProfiles: ['prof_01','prof_11'] },
  { id: 'sec_08', name: 'Administrativo', companyId: COMPANY_ID, description: 'Gestão administrativa geral', isActive: true, allowedProfiles: ['prof_01','prof_04','prof_10','prof_12'] },
]

// ── Funções do sistema ───────────────────────────────────────
export const ALL_SYSTEM_FUNCTIONS: MenuFunction[] = [
  { id: 'fn_01', label: 'Agendamento', icon: 'Calendar', module: 'scheduling', type: 'function', route: '/app/agendamento' },
  { id: 'fn_02', label: 'Recepção de Pacientes', icon: 'UserCheck', module: 'reception', type: 'function', route: '/app/recepcao' },
  { id: 'fn_03', label: 'Prontuário Eletrônico', icon: 'FileText', module: 'medical_record', type: 'function', route: '/app/prontuario' },
  { id: 'fn_04', label: 'Faturamento TISS', icon: 'DollarSign', module: 'billing', type: 'function', route: '/app/faturamento' },
  { id: 'fn_05', label: 'Resultados de Exames', icon: 'FlaskConical', module: 'results', type: 'function', route: '/app/resultados' },
  { id: 'fn_06', label: 'Relatórios Gerenciais', icon: 'BarChart3', module: 'reports', type: 'function', route: '/app/relatorios' },
  { id: 'fn_07', label: 'BI & Dashboards', icon: 'TrendingUp', module: 'bi', type: 'function', route: '/app/bi' },
  { id: 'fn_08', label: 'Gestão de Usuários', icon: 'Users', module: 'users', type: 'function', route: '/app/usuarios' },
  { id: 'fn_09', label: 'Gestão de Perfis', icon: 'ShieldCheck', module: 'users', type: 'function', route: '/app/configuracoes/perfis' },
  { id: 'fn_10', label: 'Setores', icon: 'Building2', module: 'settings', type: 'function', route: '/app/setores' },
  { id: 'fn_11', label: 'Configurações', icon: 'Settings', module: 'settings', type: 'function', route: '/app/configuracoes' },
  { id: 'fn_12', label: 'Médicos', icon: 'Stethoscope', module: 'registers', type: 'function', route: '/app/cadastros/medicos' },
  { id: 'fn_13', label: 'Convênios', icon: 'Heart', module: 'registers', type: 'function', route: '/app/cadastros/convenios' },
  { id: 'fn_14', label: 'Exames e Procedimentos', icon: 'TestTube', module: 'registers', type: 'function', route: '/app/cadastros/exames' },
  { id: 'fn_15', label: 'Totem de Senhas', icon: 'Monitor', module: 'totem', type: 'function', route: '/app/totem' },
  { id: 'fn_16', label: 'Confirmação de Consultas', icon: 'CheckCircle', module: 'scheduling', type: 'function', route: '/app/confirmacao' },
]

export const ALL_SYSTEM_UTILITIES: MenuFunction[] = [
  { id: 'ut_01', label: 'Cadastros Gerais', icon: 'Database', module: 'registers', type: 'utility', route: '/app/cadastros' },
  { id: 'ut_02', label: 'Comunicação Interna', icon: 'MessageSquare', module: 'settings', type: 'utility', route: '/app/comunicacao' },
  { id: 'ut_03', label: 'Impressão de Relatórios', icon: 'Printer', module: 'reports', type: 'utility', route: '/app/impressao' },
  { id: 'ut_04', label: 'Informações sobre a Função', icon: 'Info', module: 'settings', type: 'utility', route: '/app/info' },
  { id: 'ut_05', label: 'Calculadora Clínica', icon: 'Calculator', module: 'settings', type: 'utility', route: '/app/calculadora' },
]

// ── Helper: permissões completas ──────────────────────────────
function fullPerms(): PermissionsMap {
  return {
    scheduling: ['view','create','edit','delete','export','approve'],
    reception: ['view','create','edit','delete','approve'],
    totem: ['view','create','edit'],
    medical_record: ['view','create','edit','delete','export'],
    billing: ['view','create','edit','delete','approve','export'],
    results: ['view','create','edit','export'],
    reports: ['view','export'],
    bi: ['view','export'],
    users: ['view','create','edit','delete'],
    settings: ['view','edit'],
    registers: ['view','create','edit','delete'],
  }
}

// ── Perfis (15) ───────────────────────────────────────────────
export const MOCK_COMPANY_PROFILES: Profile[] = [
  { id: 'prof_01', code: 2461, name: 'Adm do Sistema – Help Desk', description: 'Acesso completo', companyId: COMPANY_ID, permissions: fullPerms(), isActive: true, createdBy: 'it_team', createdAt: '2024-01-10', updatedAt: '2025-01-15' },
  { id: 'prof_02', code: 2130, name: 'Ambulatório – Ginecologia', companyId: COMPANY_ID, permissions: { scheduling: ['view','create','edit'], medical_record: ['view','create','edit'], reports: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-02-15', updatedAt: '2025-01-10' },
  { id: 'prof_03', code: 3001, name: 'Caicó – Recepção Operacional', companyId: COMPANY_ID, establishmentId: 'est_02', permissions: { scheduling: ['view','create','edit'], reception: ['view','create','edit'], totem: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-03-01', updatedAt: '2025-01-08' },
  { id: 'prof_04', code: 3100, name: 'Compras – Solicitações', companyId: COMPANY_ID, permissions: { reports: ['view','export'], settings: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-03-15', updatedAt: '2024-12-20' },
  { id: 'prof_05', code: 4500, name: 'Faturamento – Operacional', companyId: COMPANY_ID, permissions: { billing: ['view','create','edit','approve','export'], reports: ['view','export'] }, isActive: true, createdBy: 'admin', createdAt: '2024-04-01', updatedAt: '2025-01-12' },
  { id: 'prof_06', code: 5000, name: 'Agendamento – Agenda Integrada', companyId: COMPANY_ID, permissions: { scheduling: ['view','create','edit','delete'], reception: ['view','create'], reports: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-04-15', updatedAt: '2025-01-05' },
  { id: 'prof_07', code: 6000, name: 'Médico – Atendimento', companyId: COMPANY_ID, permissions: { scheduling: ['view','create','edit'], medical_record: ['view','create','edit','delete'], results: ['view','export'], reports: ['view','export'], bi: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-05-01', updatedAt: '2025-01-14' },
  { id: 'prof_08', code: 6100, name: 'Enfermagem – Supervisão', companyId: COMPANY_ID, permissions: { medical_record: ['view','create','edit'], reception: ['view'], scheduling: ['view'], results: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-05-15', updatedAt: '2024-12-28' },
  { id: 'prof_09', code: 7000, name: 'Recepção – Padrão', companyId: COMPANY_ID, permissions: { scheduling: ['view','create','edit'], reception: ['view','create','edit'], totem: ['view','create'] }, isActive: true, createdBy: 'admin', createdAt: '2024-06-01', updatedAt: '2025-01-10' },
  { id: 'prof_10', code: 8000, name: 'BI – Diretoria', companyId: COMPANY_ID, permissions: { reports: ['view','export'], bi: ['view','export'] }, isActive: true, createdBy: 'it_team', createdAt: '2024-06-15', updatedAt: '2024-11-30' },
  { id: 'prof_11', code: 8500, name: 'Farmácia – Operacional', companyId: COMPANY_ID, permissions: { registers: ['view','create','edit'], reports: ['view'] }, isActive: true, createdBy: 'admin', createdAt: '2024-07-01', updatedAt: '2024-12-15' },
  { id: 'prof_12', code: 9000, name: 'TI – Administração', companyId: COMPANY_ID, permissions: fullPerms(), isActive: true, createdBy: 'it_team', createdAt: '2024-07-15', updatedAt: '2025-01-18' },
  { id: 'prof_13', code: 9500, name: 'Telefonista – Central', companyId: COMPANY_ID, permissions: { scheduling: ['view','create','edit'] }, isActive: true, createdBy: 'admin', createdAt: '2024-08-01', updatedAt: '2024-12-10' },
  { id: 'prof_14', code: 1000, name: 'Digitação – Laudos', companyId: COMPANY_ID, permissions: { results: ['view','create','edit'], reports: ['view'] }, isActive: false, createdBy: 'admin', createdAt: '2024-08-15', updatedAt: '2024-10-20' },
  { id: 'prof_15', code: 1100, name: 'Auditoria Médica', companyId: COMPANY_ID, permissions: { billing: ['view','approve'], medical_record: ['view'], reports: ['view','export'] }, isActive: true, createdBy: 'it_team', createdAt: '2024-09-01', updatedAt: '2025-01-02' },
]

// ── Usuários da empresa (15) ──────────────────────────────────
export const MOCK_COMPANY_USERS: CompanyUser[] = [
  { id: 'cu_01', username: 'camila.souza', fullName: 'Dra. Camila Souza', email: 'admin@clinicademo.com', cpf: '123.456.789-00', birthDate: '1985-03-15', phone: '(11) 98765-4321', professionalClass: 'CRM', councilNumber: '123456', councilState: 'SP', occupation: 'Médica Administradora', companyId: COMPANY_ID, profiles: ['prof_01', 'prof_07'], sectors: ['sec_04', 'sec_08'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 08:30', createdAt: '2024-01-15' },
  { id: 'cu_02', username: 'henrique.lima', fullName: 'Dr. Henrique Lima', email: 'medico@clinicademo.com', cpf: '234.567.890-11', birthDate: '1978-07-22', phone: '(11) 97654-3210', professionalClass: 'CRM', councilNumber: '654321', councilState: 'SP', occupation: 'Médico Cardiologista', companyId: COMPANY_ID, profiles: ['prof_07'], sectors: ['sec_02', 'sec_04', 'sec_05'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 09:15', createdAt: '2024-02-01' },
  { id: 'cu_03', username: 'juliana.ferreira', fullName: 'Juliana Ferreira', email: 'recepcao@clinicademo.com', cpf: '345.678.901-22', birthDate: '1992-11-08', phone: '(11) 96543-2109', occupation: 'Recepcionista', companyId: COMPANY_ID, profiles: ['prof_09', 'prof_13'], sectors: ['sec_01', 'sec_04'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 07:45', createdAt: '2024-02-15' },
  { id: 'cu_04', username: 'pedro.almeida', fullName: 'Dr. Pedro Almeida', email: 'pedro@clinicademo.com', cpf: '456.789.012-33', birthDate: '1980-05-30', phone: '(11) 95432-1098', professionalClass: 'CRM', councilNumber: '789012', councilState: 'SP', occupation: 'Médico Ortopedista', companyId: COMPANY_ID, profiles: ['prof_07'], sectors: ['sec_02', 'sec_04', 'sec_06'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-19 14:30', createdAt: '2024-03-01' },
  { id: 'cu_05', username: 'marcos.oliveira', fullName: 'Marcos Oliveira', email: 'faturamento@clinicademo.com', cpf: '567.890.123-44', birthDate: '1988-09-12', phone: '(11) 94321-0987', occupation: 'Faturista', companyId: COMPANY_ID, profiles: ['prof_05'], sectors: ['sec_03'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 10:00', createdAt: '2024-03-15' },
  { id: 'cu_06', username: 'ana.costa', fullName: 'Ana Paula Costa', email: 'telefone@clinicademo.com', cpf: '678.901.234-55', birthDate: '1995-01-25', phone: '(11) 93210-9876', occupation: 'Telefonista', companyId: COMPANY_ID, profiles: ['prof_13'], sectors: ['sec_01'], activeProfileId: null, activeSectorId: null, isActive: false, isBlocked: true, blockedReason: 'Ausência prolongada sem justificativa', blockedAt: '2025-01-10', blockedBy: 'Dra. Camila Souza', lastLogin: '2025-01-10 16:20', createdAt: '2024-04-01' },
  { id: 'cu_07', username: 'roberto.santos', fullName: 'Dr. Roberto Santos', email: 'roberto@clinicademo.com', cpf: '789.012.345-66', birthDate: '1975-12-03', phone: '(11) 92109-8765', professionalClass: 'CRM', councilNumber: '345678', councilState: 'SP', occupation: 'Médico Neurologista', companyId: COMPANY_ID, profiles: ['prof_07'], sectors: ['sec_04', 'sec_05'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 11:00', createdAt: '2024-04-15' },
  { id: 'cu_08', username: 'fernanda.reis', fullName: 'Fernanda Reis', email: 'fernanda@clinicademo.com', cpf: '890.123.456-77', birthDate: '1990-06-18', phone: '(11) 91098-7654', professionalClass: 'COREN', councilNumber: '987654', councilState: 'SP', occupation: 'Enfermeira Chefe', companyId: COMPANY_ID, profiles: ['prof_08'], sectors: ['sec_02', 'sec_05'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 06:50', createdAt: '2024-05-01' },
  { id: 'cu_09', username: 'lucas.silva', fullName: 'Lucas Silva', email: 'lucas@clinicademo.com', cpf: '901.234.567-88', birthDate: '1993-04-07', phone: '(11) 90987-6543', occupation: 'Recepcionista', companyId: COMPANY_ID, profiles: ['prof_09'], sectors: ['sec_01', 'sec_06'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-19 17:00', createdAt: '2024-05-15' },
  { id: 'cu_10', username: 'patricia.gomes', fullName: 'Patrícia Gomes', email: 'patricia@clinicademo.com', cpf: '012.345.678-99', birthDate: '1987-08-20', phone: '(11) 89876-5432', occupation: 'Analista de BI', companyId: COMPANY_ID, profiles: ['prof_10'], sectors: ['sec_08'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-18 09:30', createdAt: '2024-06-01' },
  { id: 'cu_11', username: 'thiago.nascimento', fullName: 'Thiago Nascimento', email: 'thiago@clinicademo.com', cpf: '111.222.333-44', birthDate: '1991-02-14', phone: '(11) 88765-4321', occupation: 'Farmacêutico', companyId: COMPANY_ID, profiles: ['prof_11'], sectors: ['sec_07'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 08:00', createdAt: '2024-06-15' },
  { id: 'cu_12', username: 'amanda.vieira', fullName: 'Amanda Vieira', email: 'amanda@clinicademo.com', cpf: '222.333.444-55', birthDate: '1989-10-30', phone: '(11) 87654-3210', occupation: 'Analista de TI', companyId: COMPANY_ID, profiles: ['prof_12'], sectors: ['sec_08'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 07:30', createdAt: '2024-07-01' },
  { id: 'cu_13', username: 'carla.mendes', fullName: 'Carla Mendes', email: 'carla@clinicademo.com', cpf: '333.444.555-66', birthDate: '1994-07-11', phone: '(11) 86543-2109', occupation: 'Agendadora', companyId: COMPANY_ID, profiles: ['prof_06'], sectors: ['sec_01'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 08:15', createdAt: '2024-07-15' },
  { id: 'cu_14', username: 'rafael.ti', fullName: 'Rafael Mendes (TI)', email: 'rafael.ti@clinicademo.com', cpf: '444.555.666-77', birthDate: '1986-03-25', phone: '(11) 85432-1098', occupation: 'Coordenador de TI', companyId: COMPANY_ID, profiles: ['prof_01', 'prof_12'], sectors: ['sec_08'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-20 07:00', createdAt: '2024-08-01' },
  { id: 'cu_15', username: 'dra.gineco', fullName: 'Dra. Mariana Lopes', email: 'mariana@clinicademo.com', cpf: '555.666.777-88', birthDate: '1982-11-19', phone: '(11) 84321-0987', professionalClass: 'CRM', councilNumber: '111222', councilState: 'SP', occupation: 'Médica Ginecologista', companyId: COMPANY_ID, profiles: ['prof_02', 'prof_07'], sectors: ['sec_04'], activeProfileId: null, activeSectorId: null, isActive: true, isBlocked: false, lastLogin: '2025-01-19 13:00', createdAt: '2024-08-15' },
]

// ── Legacy compat types for scheduling ──────────────────────────
// These are used by scheduling components that still reference old shapes
export interface LegacyDoctor {
  id: string
  fullName: string
  crm: string
  crmState: string
  mainSpecialty: string
  enabledConvenios: string[]
  isActive: boolean
  companyId: string
  consultDuration: number
  consultInterval: number
  schedule: { dayOfWeek: number; startTime: string; endTime: string; active: boolean }[]
}

export interface LegacyConvenio {
  id: string
  name: string
  type: string
  isActive: boolean
  companyId: string
}

export const MOCK_DOCTORS: LegacyDoctor[] = [
  { id: 'doc_01', fullName: 'Dr. Henrique Lima', crm: '654321', crmState: 'SP', mainSpecialty: 'Cardiologia', enabledConvenios: ['conv_01','conv_02','conv_04','conv_06'], isActive: true, companyId: COMPANY_ID, consultDuration: 30, consultInterval: 10, schedule: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00', active: true },{ dayOfWeek: 1, startTime: '14:00', endTime: '18:00', active: true },{ dayOfWeek: 3, startTime: '08:00', endTime: '12:00', active: true },{ dayOfWeek: 5, startTime: '08:00', endTime: '17:00', active: true }] },
  { id: 'doc_02', fullName: 'Dr. Pedro Almeida', crm: '789012', crmState: 'SP', mainSpecialty: 'Ortopedia', enabledConvenios: ['conv_01','conv_03','conv_04'], isActive: true, companyId: COMPANY_ID, consultDuration: 20, consultInterval: 5, schedule: [{ dayOfWeek: 2, startTime: '07:00', endTime: '13:00', active: true },{ dayOfWeek: 4, startTime: '07:00', endTime: '13:00', active: true }] },
  { id: 'doc_03', fullName: 'Dr. Roberto Santos', crm: '345678', crmState: 'SP', mainSpecialty: 'Neurologia', enabledConvenios: ['conv_01','conv_02','conv_05','conv_06'], isActive: true, companyId: COMPANY_ID, consultDuration: 45, consultInterval: 15, schedule: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', active: true },{ dayOfWeek: 2, startTime: '09:00', endTime: '17:00', active: true },{ dayOfWeek: 3, startTime: '09:00', endTime: '17:00', active: true }] },
  { id: 'doc_04', fullName: 'Dra. Mariana Lopes', crm: '111222', crmState: 'SP', mainSpecialty: 'Ginecologia', enabledConvenios: ['conv_01','conv_02','conv_03','conv_04','conv_05','conv_06'], isActive: true, companyId: COMPANY_ID, consultDuration: 30, consultInterval: 10, schedule: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00', active: true },{ dayOfWeek: 2, startTime: '14:00', endTime: '18:00', active: true },{ dayOfWeek: 4, startTime: '08:00', endTime: '18:00', active: true }] },
  { id: 'doc_05', fullName: 'Dra. Camila Souza', crm: '123456', crmState: 'SP', mainSpecialty: 'Clínica Geral', enabledConvenios: ['conv_01','conv_04'], isActive: true, companyId: COMPANY_ID, consultDuration: 20, consultInterval: 5, schedule: [{ dayOfWeek: 3, startTime: '08:00', endTime: '12:00', active: true },{ dayOfWeek: 5, startTime: '14:00', endTime: '18:00', active: true }] },
]

export const MOCK_CONVENIOS: LegacyConvenio[] = [
  { id: 'conv_01', name: 'Unimed', type: 'health_plan', isActive: true, companyId: COMPANY_ID },
  { id: 'conv_02', name: 'Hapvida', type: 'health_plan', isActive: true, companyId: COMPANY_ID },
  { id: 'conv_03', name: 'Bradesco Saúde', type: 'health_plan', isActive: true, companyId: COMPANY_ID },
  { id: 'conv_04', name: 'Particular', type: 'private', isActive: true, companyId: COMPANY_ID },
  { id: 'conv_05', name: 'SUS', type: 'sus', isActive: true, companyId: COMPANY_ID },
  { id: 'conv_06', name: 'Amil', type: 'health_plan', isActive: true, companyId: COMPANY_ID },
]

// ── Legacy exams for scheduling compat ─────────────────────────
export const MOCK_EXAMS = [
  { id: 'ex_01', tussCode: '40301010', name: 'Hemograma Completo', type: 'lab' as const, specialty: 'Clínica Geral', duration: 15, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_02', tussCode: '40302040', name: 'Glicemia de Jejum', type: 'lab' as const, specialty: 'Endocrinologia', duration: 10, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_03', tussCode: '40808010', name: 'Eletrocardiograma', type: 'clinical_procedure' as const, specialty: 'Cardiologia', duration: 20, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_04', tussCode: '40901017', name: 'Raio-X de Tórax', type: 'imaging' as const, specialty: 'Radiologia', duration: 15, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_05', tussCode: '40901050', name: 'Tomografia Computadorizada', type: 'imaging' as const, specialty: 'Radiologia', duration: 45, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_06', tussCode: '40901068', name: 'Ressonância Magnética', type: 'imaging' as const, specialty: 'Neurologia', duration: 60, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_07', tussCode: '40302300', name: 'TSH e T4 Livre', type: 'lab' as const, specialty: 'Endocrinologia', duration: 10, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_08', tussCode: '31003060', name: 'Artroscopia de Joelho', type: 'surgical_procedure' as const, specialty: 'Ortopedia', duration: 90, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_09', tussCode: '10101012', name: 'Consulta Médica', type: 'consultation' as const, specialty: 'Clínica Geral', duration: 30, isActive: true, companyId: COMPANY_ID },
  { id: 'ex_10', tussCode: '40304361', name: 'Ultrassonografia Obstétrica', type: 'imaging' as const, specialty: 'Ginecologia', duration: 30, isActive: true, companyId: COMPANY_ID },
]

// ── Helpers de funções por perfil ─────────────────────────────
export function getFunctionsForProfile(profile: Profile): MenuFunction[] {
  return ALL_SYSTEM_FUNCTIONS.filter(fn => {
    const perms = profile.permissions[fn.module]
    return perms && perms.includes('view')
  })
}

export function getUtilitiesForProfile(profile: Profile): MenuFunction[] {
  return ALL_SYSTEM_UTILITIES.filter(ut => {
    const perms = profile.permissions[ut.module]
    return perms && perms.includes('view')
  })
}
