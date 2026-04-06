import type { UserProfile, Sector, Permission, FunctionItem } from '@/types/profile.types'

// ── Setores ───────────────────────────────────────────────
export const MOCK_SECTORS: Sector[] = [
  { id: 'sec_001', name: 'Recepção', description: 'Atendimento e acolhimento de pacientes' },
  { id: 'sec_002', name: 'Centro Cirúrgico', description: 'Procedimentos cirúrgicos' },
  { id: 'sec_003', name: 'Faturamento', description: 'Faturamento e convênios' },
  { id: 'sec_004', name: 'Ambulatório', description: 'Consultas ambulatoriais' },
  { id: 'sec_005', name: 'Pronto Atendimento', description: 'Urgência e emergência' },
  { id: 'sec_006', name: 'Administração', description: 'Gestão administrativa' },
  { id: 'sec_007', name: 'Laboratório', description: 'Análises clínicas' },
  { id: 'sec_008', name: 'Farmácia', description: 'Dispensação de medicamentos' },
]

// ── Funções padrão do sistema ─────────────────────────────
const ALL_FUNCTIONS: FunctionItem[] = [
  { id: 'fn_01', label: 'Agendamento', icon: 'Calendar', module: 'scheduling', route: '/app/agendamento', type: 'function' },
  { id: 'fn_02', label: 'Recepção de Pacientes', icon: 'UserCheck', module: 'reception', route: '/app/recepcao', type: 'function' },
  { id: 'fn_03', label: 'Prontuário Eletrônico', icon: 'FileText', module: 'emr', route: '/app/prontuario', type: 'function' },
  { id: 'fn_04', label: 'Faturamento TISS', icon: 'DollarSign', module: 'billing', route: '/app/faturamento', type: 'function' },
  { id: 'fn_05', label: 'Resultados de Exames', icon: 'FlaskConical', module: 'results', route: '/app/resultados', type: 'function' },
  { id: 'fn_06', label: 'Relatórios Gerenciais', icon: 'BarChart3', module: 'reports', route: '/app/relatorios', type: 'function' },
  { id: 'fn_07', label: 'BI & Dashboards', icon: 'TrendingUp', module: 'bi', route: '/app/bi', type: 'function' },
  { id: 'fn_08', label: 'Administração do Sistema', icon: 'Shield', module: 'admin', route: '/app/admin', type: 'function' },
  { id: 'fn_09', label: 'Gerenciamento de Setores', icon: 'Building2', module: 'admin', route: '/app/setores', type: 'function' },
  { id: 'fn_10', label: 'Cadastro Pessoa Física', icon: 'UserPlus', module: 'admin', route: '/app/cadastro-pf', type: 'function' },
  { id: 'fn_11', label: 'Fornecedores', icon: 'Truck', module: 'admin', route: '/app/fornecedores', type: 'function' },
  { id: 'fn_12', label: 'Totem de Senhas', icon: 'Monitor', module: 'totem', route: '/app/totem', type: 'function' },
  { id: 'fn_13', label: 'Confirmação de Consultas', icon: 'CheckCircle', module: 'scheduling', route: '/app/confirmacao', type: 'function' },
  { id: 'fn_14', label: 'Relatório de Faltosos', icon: 'UserX', module: 'reports', route: '/app/faltosos', type: 'function' },
  { id: 'fn_15', label: 'Atendimento Lote', icon: 'Layers', module: 'admin', route: '/app/atendimento-lote', type: 'function' },
  { id: 'fn_16', label: 'Gerenciamento de Relatórios', icon: 'FileBarChart', module: 'reports', route: '/app/gerenciar-relatorios', type: 'function' },
  { id: 'fn_17', label: 'Configurações do Sistema', icon: 'Settings', module: 'settings', route: '/app/configuracoes', type: 'function' },
  { id: 'fn_18', label: 'Gestão de Perfis', icon: 'ShieldCheck', module: 'admin', route: '/app/configuracoes/perfis', type: 'function' },
]

const ALL_UTILITIES: FunctionItem[] = [
  { id: 'ut_01', label: 'Cadastros Gerais', icon: 'Database', module: 'utilities', route: '/app/cadastros', type: 'utility' },
  { id: 'ut_02', label: 'Comunicação Interna', icon: 'MessageSquare', module: 'utilities', route: '/app/comunicacao', type: 'utility' },
  { id: 'ut_03', label: 'Impressão de Relatórios', icon: 'Printer', module: 'utilities', route: '/app/impressao', type: 'utility' },
  { id: 'ut_04', label: 'Informações sobre a Função', icon: 'Info', module: 'utilities', route: '/app/info', type: 'utility' },
  { id: 'ut_05', label: 'Particular', icon: 'Lock', module: 'utilities', route: '/app/particular', type: 'utility' },
  { id: 'ut_06', label: 'Calculadora Clínica', icon: 'Calculator', module: 'utilities', route: '/app/calculadora', type: 'utility' },
]

// ── Helpers de permissão ──────────────────────────────────
function makePerms(module: Permission['module'], actions: Permission['action'][]): Permission[] {
  return actions.map(a => ({ id: `perm_${module}_${a}`, module, action: a, label: `${module}.${a}` }))
}

// ── Perfis ────────────────────────────────────────────────
export const MOCK_PROFILES: UserProfile[] = [
  {
    id: 'prof_001',
    code: '2461',
    name: 'Adm do Sistema – Help Desk',
    description: 'Acesso completo a todos os módulos e configurações do sistema',
    companyId: 'comp_001',
    sectors: [MOCK_SECTORS[0], MOCK_SECTORS[2], MOCK_SECTORS[5]],
    permissions: [
      ...makePerms('scheduling', ['view', 'create', 'edit', 'delete', 'export']),
      ...makePerms('reception', ['view', 'create', 'edit', 'delete', 'approve']),
      ...makePerms('emr', ['view', 'create', 'edit', 'delete', 'export']),
      ...makePerms('billing', ['view', 'create', 'edit', 'delete', 'approve', 'export']),
      ...makePerms('results', ['view', 'create', 'edit', 'export']),
      ...makePerms('reports', ['view', 'export']),
      ...makePerms('bi', ['view', 'export']),
      ...makePerms('admin', ['view', 'create', 'edit', 'delete']),
      ...makePerms('settings', ['view', 'edit']),
    ],
    functions: [ALL_FUNCTIONS[0], ALL_FUNCTIONS[7], ALL_FUNCTIONS[8], ALL_FUNCTIONS[9], ALL_FUNCTIONS[10], ALL_FUNCTIONS[14], ALL_FUNCTIONS[15], ALL_FUNCTIONS[16], ALL_FUNCTIONS[17]],
    utilities: [ALL_UTILITIES[0], ALL_UTILITIES[1], ALL_UTILITIES[2], ALL_UTILITIES[3], ALL_UTILITIES[4]],
    isActive: true,
    createdBy: 'ti_team',
  },
  {
    id: 'prof_002',
    code: '1150',
    name: 'Recepção Operacional',
    description: 'Agendamento, recepção e confirmação de consultas',
    companyId: 'comp_001',
    sectors: [MOCK_SECTORS[0], MOCK_SECTORS[3]],
    permissions: [
      ...makePerms('scheduling', ['view', 'create', 'edit']),
      ...makePerms('reception', ['view', 'create', 'edit']),
      ...makePerms('emr', ['view']),
      ...makePerms('reports', ['view']),
    ],
    functions: [ALL_FUNCTIONS[0], ALL_FUNCTIONS[1], ALL_FUNCTIONS[11], ALL_FUNCTIONS[12], ALL_FUNCTIONS[13]],
    utilities: [ALL_UTILITIES[1], ALL_UTILITIES[2]],
    isActive: true,
    createdBy: 'company_admin',
  },
  {
    id: 'prof_003',
    code: '3200',
    name: 'Médico Assistente',
    description: 'Acesso a prontuário, agendamento e resultados de exames',
    companyId: 'comp_001',
    sectors: [MOCK_SECTORS[1], MOCK_SECTORS[3], MOCK_SECTORS[4]],
    permissions: [
      ...makePerms('scheduling', ['view', 'create', 'edit']),
      ...makePerms('emr', ['view', 'create', 'edit', 'delete']),
      ...makePerms('results', ['view', 'export']),
      ...makePerms('reports', ['view', 'export']),
      ...makePerms('bi', ['view']),
    ],
    functions: [ALL_FUNCTIONS[0], ALL_FUNCTIONS[2], ALL_FUNCTIONS[4], ALL_FUNCTIONS[5], ALL_FUNCTIONS[6]],
    utilities: [ALL_UTILITIES[1], ALL_UTILITIES[2], ALL_UTILITIES[5]],
    isActive: true,
    createdBy: 'company_admin',
  },
  {
    id: 'prof_004',
    code: '4500',
    name: 'Faturista',
    description: 'Gestão de faturamento TISS e convênios',
    companyId: 'comp_001',
    sectors: [MOCK_SECTORS[2]],
    permissions: [
      ...makePerms('billing', ['view', 'create', 'edit', 'approve', 'export']),
      ...makePerms('reports', ['view', 'export']),
    ],
    functions: [ALL_FUNCTIONS[3], ALL_FUNCTIONS[5], ALL_FUNCTIONS[15]],
    utilities: [ALL_UTILITIES[0], ALL_UTILITIES[2]],
    isActive: true,
    createdBy: 'company_admin',
  },
  {
    id: 'prof_005',
    code: '5000',
    name: 'Telefonista',
    description: 'Agendamento e confirmação de consultas por telefone',
    companyId: 'comp_001',
    sectors: [MOCK_SECTORS[0]],
    permissions: [
      ...makePerms('scheduling', ['view', 'create', 'edit']),
    ],
    functions: [ALL_FUNCTIONS[0], ALL_FUNCTIONS[12]],
    utilities: [ALL_UTILITIES[1]],
    isActive: true,
    createdBy: 'company_admin',
  },
]

// ── Mapeamento de perfis por usuário ──────────────────────
// userId → profileIds
export const MOCK_USER_PROFILES: Record<string, string[]> = {
  'u_ca_001': ['prof_001', 'prof_003'],      // Dra. Camila: Admin + Médico
  'u_doc_001': ['prof_003'],                  // Dr. Henrique: Médico
  'u_rec_001': ['prof_002', 'prof_005'],      // Juliana: Recepção + Telefonista
  'u_bil_001': ['prof_004'],                  // Marcos: Faturista (single profile)
  'u_tel_001': ['prof_005'],                  // Ana Paula: Telefonista (single profile)
  'u_sa_001': ['prof_001'],                   // Super admin gets admin profile
  'u_sa_002': ['prof_001'],                   // Super Admin Inova
  'u_ca_010': ['prof_001'],                   // Admin InovaSoftteste
}

export function getProfilesForUser(userId: string): UserProfile[] {
  const profileIds = MOCK_USER_PROFILES[userId] || []
  return MOCK_PROFILES.filter(p => profileIds.includes(p.id))
}
