export type SystemModule =
  | 'dashboard'
  | 'scheduling'
  | 'reception'
  | 'totem'
  | 'medical_record'
  | 'billing'
  | 'results'
  | 'reports'
  | 'bi'
  | 'users'
  | 'settings'
  | 'registers'
  | 'lab_technical'
  | 'lab_registers'
  | 'finance'
  | 'inventory'
  | 'pharmacy'
  | 'serotheque'
  | 'portals'
  | 'result_entry'
  | 'patient_registry'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve'

export type PermissionsMap = Partial<Record<SystemModule, PermissionAction[]>>

export interface Profile {
  id: string
  code: number
  name: string
  description?: string
  companyId: string
  establishmentId?: string
  permissions: PermissionsMap
  isActive: boolean
  createdBy: 'admin' | 'it_team'
  createdAt: string
  updatedAt: string
}

export interface Sector {
  id: string
  name: string
  companyId: string
  description?: string
  isActive: boolean
  allowedProfiles: string[]
  /** Tipos de fila que este setor pode visualizar na Recepção. Se vazio/indefinido = ambos. */
  allowedQueueTypes?: ('internal' | 'external')[]
  /** Perfis que possuem permissão para alterar datas no modal de Alterar Previsão de Entrega */
  allowedDeadlineEditProfiles?: string[]
  /** Ajuste manual do menu lateral por item (rota): true (liberado) / false (bloqueado), sobrepõe os perfis */
  moduleOverrides?: Record<string, boolean>
}

export interface MenuFunction {
  id: string
  label: string
  icon: string
  module: SystemModule
  type: 'function' | 'utility'
  route: string
}

export const SYSTEM_MODULES: { key: SystemModule; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'Home' },
  { key: 'scheduling', label: 'Agendamento', icon: 'Calendar' },
  { key: 'reception', label: 'Recepção', icon: 'UserCheck' },
  { key: 'totem', label: 'Totem e Chamada', icon: 'Monitor' },
  { key: 'medical_record', label: 'Prontuário Eletrônico', icon: 'FileText' },
  { key: 'billing', label: 'Faturamento / Glosas', icon: 'DollarSign' },
  { key: 'results', label: 'Entrega de Resultados', icon: 'FlaskConical' },
  { key: 'reports', label: 'Relatórios', icon: 'BarChart3' },
  { key: 'bi', label: 'BI Estratégico', icon: 'TrendingUp' },
  { key: 'users', label: 'Usuários', icon: 'Users' },
  { key: 'settings', label: 'Configurações', icon: 'Settings' },
  { key: 'registers', label: 'Cadastros Base', icon: 'Database' },
  { key: 'lab_technical', label: 'Setor Técnico (Laboratório)', icon: 'Beaker' },
  { key: 'lab_registers', label: 'Cadastros do Laboratório', icon: 'FlaskConical' },
  { key: 'finance', label: 'Financeiro', icon: 'DollarSign' },
  { key: 'inventory', label: 'Estoque e Almoxarifado', icon: 'Warehouse' },
  { key: 'pharmacy', label: 'Farmácia Hospitalar', icon: 'Pill' },
  { key: 'serotheque', label: 'Soroteca', icon: 'Database' },
  { key: 'portals', label: 'Portais Externos', icon: 'Users' },
]


export const ALL_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export', 'approve']

/** Permissões específicas da tela de Digitação de Resultados */
export const RESULT_ENTRY_PERMISSIONS: { action: PermissionAction; label: string; description: string }[] = [
  { action: 'create', label: 'Digitar', description: 'Preencher e concluir a digitação dos resultados' },
  { action: 'approve', label: 'Liberar exame', description: 'Liberar exames digitados' },
  { action: 'edit', label: 'Correção', description: 'Corrigir resultados já digitados ou liberados' },
]

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  approve: 'Aprovar',
}
