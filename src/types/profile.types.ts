export interface Sector {
  id: string
  name: string
  description?: string
}

export interface Permission {
  id: string
  module: ModuleKey
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  label: string
}

export type ModuleKey =
  | 'scheduling'
  | 'reception'
  | 'emr'
  | 'billing'
  | 'results'
  | 'reports'
  | 'bi'
  | 'admin'
  | 'settings'
  | 'totem'
  | 'utilities'

export interface FunctionItem {
  id: string
  label: string
  icon: string
  module: ModuleKey
  route: string
  type: 'function' | 'utility'
}

export interface UserProfile {
  id: string
  code: string
  name: string
  description?: string
  companyId: string
  establishmentId?: string
  sectors: Sector[]
  permissions: Permission[]
  functions: FunctionItem[]
  utilities: FunctionItem[]
  isActive: boolean
  createdBy: 'company_admin' | 'ti_team'
}

export interface UserSession {
  selectedProfile: UserProfile | null
  selectedSector: Sector | null
  availableProfiles: UserProfile[]
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  scheduling: 'Agendamento',
  reception: 'Recepção',
  emr: 'Prontuário',
  billing: 'Faturamento',
  results: 'Resultados',
  reports: 'Relatórios',
  bi: 'BI & Analytics',
  admin: 'Administração',
  settings: 'Configurações',
  totem: 'Totem',
  utilities: 'Utilitários',
}

export const MODULE_ICONS: Record<ModuleKey, string> = {
  scheduling: 'Calendar',
  reception: 'UserCheck',
  emr: 'FileText',
  billing: 'DollarSign',
  results: 'FlaskConical',
  reports: 'BarChart3',
  bi: 'TrendingUp',
  admin: 'Shield',
  settings: 'Settings',
  totem: 'Monitor',
  utilities: 'Wrench',
}

export const ALL_ACTIONS: Permission['action'][] = ['view', 'create', 'edit', 'delete', 'approve', 'export']

export const ACTION_LABELS: Record<Permission['action'], string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  approve: 'Aprovar',
  export: 'Exportar',
}
