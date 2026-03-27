import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Eye, Shield, ChevronDown, Check, X } from 'lucide-react'
import { MOCK_PROFILES, MOCK_SECTORS, MOCK_COMPANY_USERS } from '@/mocks/profiles.mock'
import { MOCK_COMPANY_USERS as AUTH_USERS } from '@/mocks/superadmin.mock'
import type { UserProfile, Permission, ModuleKey, FunctionItem } from '@/types/profile.types'
import { MODULE_LABELS, MODULE_ICONS, ALL_ACTIONS, ACTION_LABELS } from '@/types/profile.types'
import { icons } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

type TabKey = 'cadastro' | 'copia'

export default function ProfilesManagerPage() {
  const [tab, setTab] = useState<TabKey>('cadastro')
  const [profiles, setProfiles] = useState(MOCK_PROFILES)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null)

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search)
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? p.isActive : !p.isActive)
    return matchSearch && matchStatus
  })

  const handleAdd = () => {
    setEditingProfile(null)
    setEditorOpen(true)
  }

  const handleEdit = (p: UserProfile) => {
    setEditingProfile(p)
    setEditorOpen(true)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id))
      toast.success(`Perfil "${deleteTarget.name}" excluído`)
      setDeleteTarget(null)
    }
  }

  const handleSave = (profile: UserProfile) => {
    if (editingProfile) {
      setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p))
      toast.success('Perfil atualizado com sucesso')
    } else {
      setProfiles(prev => [...prev, profile])
      toast.success('Perfil criado com sucesso')
    }
    setEditorOpen(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Perfis</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure perfis de acesso, permissões e funções do sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 mb-6 max-w-sm">
        {([['cadastro', 'Cadastro de Perfil'], ['copia', 'Cópia de Perfil']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
              tab === key ? 'gradient-bg text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'cadastro' ? (
        <div className="space-y-4">
          {/* Filters + Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar perfil..."
                  className="rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
            <button onClick={handleAdd} className="gradient-bg text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:shadow-lg transition-all active:scale-[0.97]">
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Código</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descrição do Perfil</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Criado por</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden sm:table-cell">Situação</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{p.code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{p.createdBy === 'ti_team' ? 'Equipe TI' : 'Admin Empresa'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', p.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-destructive/10 text-destructive')}>
                          {p.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEdit(p)} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Editar">
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Nenhum perfil encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <ProfileCopyTab />
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <ProfileEditorModal
          profile={editingProfile}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir perfil?"
        description={`O perfil "${deleteTarget?.name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  )
}

// ── Profile Editor Modal ──────────────────────────────────

function ProfileEditorModal({ profile, onClose, onSave }: { profile: UserProfile | null; onClose: () => void; onSave: (p: UserProfile) => void }) {
  const isNew = !profile
  const [activeTab, setActiveTab] = useState<'geral' | 'permissoes' | 'funcoes' | 'setores'>('geral')
  const [name, setName] = useState(profile?.name || '')
  const [description, setDescription] = useState(profile?.description || '')
  const [createdBy, setCreatedBy] = useState<'company_admin' | 'ti_team'>(profile?.createdBy || 'company_admin')
  const [isActive, setIsActive] = useState(profile?.isActive ?? true)
  const [permissions, setPermissions] = useState<Permission[]>(profile?.permissions || [])
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>(profile?.functions.map(f => f.id) || [])
  const [selectedUtilities, setSelectedUtilities] = useState<string[]>(profile?.utilities.map(u => u.id) || [])
  const [selectedSectors, setSelectedSectors] = useState<string[]>(profile?.sectors.map(s => s.id) || [])

  const code = profile?.code || String(Math.floor(1000 + Math.random() * 9000))

  const modules: ModuleKey[] = ['scheduling', 'reception', 'emr', 'billing', 'results', 'reports', 'bi', 'admin', 'settings']

  const hasModuleActive = (mod: ModuleKey) => permissions.some(p => p.module === mod)

  const toggleModule = (mod: ModuleKey, on: boolean) => {
    if (on) {
      setPermissions(prev => [...prev, { id: `perm_${mod}_view`, module: mod, action: 'view', label: `${mod}.view` }])
    } else {
      setPermissions(prev => prev.filter(p => p.module !== mod))
    }
  }

  const toggleAction = (mod: ModuleKey, action: Permission['action'], on: boolean) => {
    if (on) {
      setPermissions(prev => [...prev, { id: `perm_${mod}_${action}`, module: mod, action, label: `${mod}.${action}` }])
    } else {
      setPermissions(prev => prev.filter(p => !(p.module === mod && p.action === action)))
    }
  }

  const hasAction = (mod: ModuleKey, action: Permission['action']) => permissions.some(p => p.module === mod && p.action === action)

  const totalPerms = permissions.length
  const maxPerms = modules.length * ALL_ACTIONS.length

  const handleSave = () => {
    if (!name.trim()) { toast.error('Nome do perfil é obrigatório'); return }
    onSave({
      id: profile?.id || `prof_${Date.now()}`,
      code,
      name,
      description,
      companyId: profile?.companyId || 'comp_001',
      sectors: MOCK_SECTORS.filter(s => selectedSectors.includes(s.id)),
      permissions,
      functions: [],
      utilities: [],
      isActive,
      createdBy,
    })
  }

  const tabs = [
    { key: 'geral' as const, label: 'Dados Gerais' },
    { key: 'permissoes' as const, label: 'Permissões' },
    { key: 'funcoes' as const, label: 'Funções' },
    { key: 'setores' as const, label: 'Setores' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] rounded-2xl bg-card shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{isNew ? 'Novo Perfil' : 'Editar Perfil'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'geral' && (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Código</label>
                <input value={`#${code}`} readOnly className="rounded-lg border border-border bg-muted px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Nome do perfil *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="rounded-lg border border-border bg-card px-3 py-2 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Criado por</label>
                <div className="flex gap-4">
                  {(['company_admin', 'ti_team'] as const).map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={createdBy === v} onChange={() => setCreatedBy(v)} className="accent-primary" />
                      {v === 'company_admin' ? 'Admin da Empresa' : 'Equipe de TI'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
                <label className="text-sm font-medium text-foreground">Perfil ativo</label>
              </div>
            </div>
          )}

          {activeTab === 'permissoes' && (
            <div>
              <p className="text-xs text-muted-foreground mb-4">{totalPerms} permissões ativas de {maxPerms} disponíveis</p>
              <Accordion type="multiple" className="space-y-2">
                {modules.map(mod => {
                  const IconComp = (icons as any)[MODULE_ICONS[mod]] || icons.Circle
                  const active = hasModuleActive(mod)
                  return (
                    <AccordionItem key={mod} value={mod} className="border rounded-xl px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <IconComp className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{MODULE_LABELS[mod]}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleModule(mod, !active) }}
                            className={cn(
                              'ml-auto mr-4 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors',
                              active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {active ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-wrap gap-3 py-2">
                          {ALL_ACTIONS.map(action => (
                            <label key={action} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <Checkbox
                                checked={hasAction(mod, action)}
                                disabled={!active}
                                onCheckedChange={(v) => toggleAction(mod, action, !!v)}
                              />
                              {ACTION_LABELS[action]}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => ALL_ACTIONS.forEach(a => !hasAction(mod, a) && toggleAction(mod, a, true))} className="text-[10px] text-primary hover:underline">Marcar tudo</button>
                          <button onClick={() => setPermissions(prev => prev.filter(p => p.module !== mod))} className="text-[10px] text-destructive hover:underline">Desmarcar tudo</button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          )}

          {activeTab === 'funcoes' && (
            <div className="text-sm text-muted-foreground">
              <p className="mb-4">Selecione as funções e utilitários disponíveis para este perfil.</p>
              <p className="text-xs italic">Funcionalidade de drag-and-drop será implementada em versão futura. Por enquanto, as funções são atribuídas automaticamente com base nas permissões.</p>
            </div>
          )}

          {activeTab === 'setores' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">Selecione os setores permitidos para este perfil:</p>
              {MOCK_SECTORS.map(s => (
                <label key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedSectors.includes(s.id)}
                    onCheckedChange={(v) => {
                      setSelectedSectors(prev => v ? [...prev, s.id] : prev.filter(id => id !== s.id))
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={handleSave} className="gradient-bg text-white rounded-lg px-6 py-2 text-sm font-semibold hover:shadow-lg transition-all active:scale-[0.97]">Salvar</button>
        </div>
      </div>
    </div>
  )
}

// ── Profile Copy Tab ──────────────────────────────────────

function ProfileCopyTab() {
  const [sourceUser, setSourceUser] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [observation, setObservation] = useState('')
  const [targetSearch, setTargetSearch] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])

  const copyOptions = [
    'Setor', 'Perfil', 'Parâmetro', 'Caixas liberadas',
    'Copiar dados do usuário', 'Grupo usuário', 'Liberação de usuário',
    'Estabelecimento', 'Permissões de agenda', 'Filtros',
  ]

  const users = AUTH_USERS.filter(u => u.companyId === 'comp_001')
  const filteredTargets = users.filter(u =>
    u.id !== sourceUser && (!targetSearch || u.name.toLowerCase().includes(targetSearch.toLowerCase()))
  )

  const handleCopy = () => {
    if (!sourceUser) { toast.error('Selecione um usuário de referência'); return }
    if (selectedTargets.length === 0) { toast.error('Selecione ao menos um usuário de destino'); return }
    toast.success(`Configurações copiadas para ${selectedTargets.length} usuário(s)`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Source */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Usuário de referência</label>
          <select
            value={sourceUser}
            onChange={e => setSourceUser(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Opções de cópia</label>
          <div className="grid grid-cols-2 gap-2">
            {copyOptions.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedOptions.includes(opt)}
                  onCheckedChange={(v) => setSelectedOptions(prev => v ? [...prev, opt] : prev.filter(o => o !== opt))}
                />
                {opt}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 text-destructive">
            <Checkbox
              checked={selectedOptions.includes('limpar')}
              onCheckedChange={(v) => setSelectedOptions(prev => v ? [...prev, 'limpar'] : prev.filter(o => o !== 'limpar'))}
            />
            Limpar registros antes de copiar
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Observação</label>
          <textarea
            value={observation}
            onChange={e => setObservation(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button onClick={handleCopy} className="gradient-bg text-white rounded-lg px-6 py-2.5 text-sm font-semibold hover:shadow-lg transition-all active:scale-[0.97]">
          Copiar
        </button>
      </div>

      {/* Right: Targets */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">Usuários de destino</label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={targetSearch}
            onChange={e => setTargetSearch(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Nome</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground hidden sm:table-cell">Função</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTargets.map(u => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selectedTargets.includes(u.id)}
                      onCheckedChange={(v) => setSelectedTargets(prev => v ? [...prev, u.id] : prev.filter(id => id !== u.id))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground capitalize hidden sm:table-cell">{u.role.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
