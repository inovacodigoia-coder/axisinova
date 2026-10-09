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
  /** Internação: ação 'approve' = Regulação (aprovar/recusar/confirmar chegada) */
  | 'inpatient'
  /** Apoio / Terceirização: guarda códigos 'apoio.*' (não ações) */
  | 'apoio'
  /** Triagem Lab: guarda códigos 'triagem.*' (não ações) */
  | 'triagem'
  /** Nutrição: view=painel, edit=dieta, approve=conferir (nutricionista), create=marcar servido, export=relatório */
  | 'nutrition'

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
  { key: 'patient_registry', label: 'Cadastro do Cliente (Paciente)', icon: 'UserCog' },
  { key: 'inpatient', label: 'Internação / Regulação', icon: 'BedDouble' },
  { key: 'nutrition', label: 'Nutrição', icon: 'Utensils' },
]


export const ALL_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export', 'approve']

/** Permissões específicas da tela de Digitação de Resultados */
export const RESULT_ENTRY_PERMISSIONS: { action: PermissionAction; label: string; description: string }[] = [
  { action: 'create', label: 'Digitar', description: 'Preencher e concluir a digitação dos resultados' },
  { action: 'approve', label: 'Liberar exame', description: 'Liberar exames digitados' },
  { action: 'edit', label: 'Correção', description: 'Corrigir resultados já digitados ou liberados' },
]

/** Permissões do módulo Apoio / Terceirização (gravadas em permissions.apoio como códigos) */
export const APOIO_PERMISSIONS: { code: string; label: string; description: string }[] = [
  { code: 'apoio.laboratorio.gerenciar', label: 'Gerenciar laboratórios de apoio', description: 'Cadastrar, editar, inativar e excluir laboratórios de apoio' },
  { code: 'apoio.catalogo.gerenciar', label: 'Manter catálogo e preços do apoio', description: 'Atualizar catálogo de referência e tabelas de preço' },
  { code: 'apoio.depara.gerenciar', label: 'Terceirizar exames / De-Para', description: 'Definir quais exames vão para o apoio e o De/Para' },
  { code: 'apoio.remessa.operar', label: 'Montar e transmitir remessas', description: 'Criar remessas, imprimir e enviar ao apoio' },
  { code: 'apoio.remessa.cancelar', label: 'Cancelar remessa no apoio', description: 'Cancelar no Pardini exames de remessa já transmitida' },
  { code: 'apoio.manual.operar', label: 'Operar o modo manual / contingência', description: 'Lançar status e resultados manualmente quando a integração falha' },
  { code: 'apoio.resultado.conferir', label: 'Conferir resultados de apoio', description: 'Conferir resultados, divergências e retificações' },
  { code: 'apoio.kanban.ver', label: 'Ver o Kanban Apoio', description: 'Acompanhar os exames terceirizados no Kanban' },
  { code: 'apoio.relatorios.ver', label: 'Ver relatórios do apoio', description: 'Relatórios de prazos, pendências e produção' },
  { code: 'apoio.financeiro.ver', label: 'Ver custos e margens', description: 'Ver custo previsto, preços e margens' },
  { code: 'apoio.bancada.trocar_cadastro', label: 'Trocar a bancada no cadastro do exame', description: 'Mudar a bancada padrão (interna/apoio) no catálogo' },
  { code: 'apoio.bancada.trocar_pontual', label: 'Trocar a bancada de um exame no pedido', description: 'Mudar a bancada só para um pedido específico' },
]

/** Permissões do WhatsApp (gravadas em permissions.whatsapp; checadas no banco por whatsapp_tem_permissao; administrador tem todas) */
export const WHATSAPP_PERMISSIONS: { code: string; label: string; description: string }[] = [
  { code: 'configuracoes.whatsapp', label: 'Configurar WhatsApp', description: 'Gerenciar números, modelos de mensagem e envio de teste' },
  { code: 'whatsapp.fila', label: 'Ver fila do WhatsApp', description: 'Visualizar a fila e o histórico de envios' },
]

/** Permissões do InovaChat (gravadas em permissions.inovachat; checadas no banco por inovachat_tem_permissao; administrador tem todas) */
export const INOVACHAT_PERMISSIONS: { code: string; label: string; description: string }[] = [
  { code: 'inovachat.visualizar', label: 'Ver o InovaChat', description: 'Ver as conversas da fila e as suas' },
  { code: 'inovachat.gerenciar', label: 'Gerenciar o InovaChat', description: 'Ver todas as conversas e vincular contato a paciente' },
]

/** Permissões do módulo Triagem Lab (gravadas em permissions.triagem como códigos; checadas no banco por triagem_tem_permissao) */
export const TRIAGEM_PERMISSIONS: { code: string; label: string; description: string }[] = [
  { code: 'triagem.config', label: 'Configurar unidades, rotas e critérios', description: 'Papéis das unidades, condições de transporte, rotas e motivos de coleta' },
  { code: 'triagem.malote.despachar', label: 'Montar e despachar malote', description: 'Montar o malote na unidade de coleta e despachar' },
  { code: 'triagem.malote.receber', label: 'Receber malote', description: 'Registrar o recebimento do malote no laboratório' },
  { code: 'triagem.triar', label: 'Triar amostras', description: 'Conferir as amostras recebidas' },
  { code: 'triagem.rejeitar', label: 'Rejeitar amostra', description: 'Rejeitar amostra com motivo (gera recoleta)' },
  { code: 'triagem.ressalva', label: 'Aceitar com ressalva', description: 'Aceitar amostra com ressalva no laudo' },
  { code: 'triagem.aliquota', label: 'Fazer alíquota', description: 'Separar alíquotas na triagem' },
  { code: 'triagem.painel.ver', label: 'Ver painel da triagem', description: 'Acompanhar o painel da Triagem Lab' },
  { code: 'triagem.relatorios.ver', label: 'Ver relatórios da triagem', description: 'Indicadores de rejeição, trânsito e temperatura' },
]

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  approve: 'Aprovar',
}
