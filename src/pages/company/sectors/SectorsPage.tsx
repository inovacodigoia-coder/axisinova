import { useState, useEffect } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { useSectors, useSectorUsers, setSectorUsers as persistSectorUsers, detachProfileFromSectors, hydrateSectorUsers, hydrateSectors, saveSectorUsers, saveSector, deleteSector } from '@/stores/sectorsStore'
import { useProfiles, hydrateProfiles, saveProfile, deleteProfile } from '@/stores/profilesStore'
import { ProfileFormModal } from '@/pages/company/users/ProfilesManagerPage'
import { Plus, Edit, Users, ShieldCheck, Loader2, UserPlus, X, Search, Check, Lock, LayoutList, Trash2 } from 'lucide-react'
import type { Sector, SystemModule, PermissionsMap, PermissionAction, Profile } from '@/types/permissions.types'
import { SYSTEM_MODULES, ALL_ACTIONS, ACTION_LABELS } from '@/types/permissions.types'
import { NAV_SECTIONS } from '@/components/company/CompanySidebar'
import { toast } from 'sonner'

interface RealUser {
  id: string
  full_name: string
  role: string
  is_active: boolean
}

export default function SectorsPage() {
  const { canAccess } = useCompanyContext()
  const { user } = useAuth()
  const sectors = useSectors()
  const allProfiles = useProfiles()
  const sectorUsers = useSectorUsers()
  const [tab, setTab] = useState<'sectors' | 'profiles'>('sectors')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Sector | null>(null)
  const [managingSector, setManagingSector] = useState<Sector | null>(null)
  const [realUsers, setRealUsers] = useState<RealUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      if (!user?.companyId) { setLoadingUsers(false); return }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('company_id', user.companyId)
        .eq('is_active', true)
      if (!error && data) setRealUsers(data)
      setLoadingUsers(false)
    }
    fetchUsers()
    if (user?.companyId) void Promise.all([hydrateProfiles(user.companyId), hydrateSectors(user.companyId), hydrateSectorUsers(user.companyId)])
  }, [user?.companyId])

  const getUserCountForSector = (sectorId: string) => (sectorUsers[sectorId] || []).length

  const handleSave = async (s: Sector) => {
    try {
      await saveSector(s)
      toast.success(editing ? 'Setor atualizado' : 'Setor criado')
      setShowForm(false)
      setEditing(null)
    } catch (error: any) {
      toast.error('Erro ao salvar setor', { description: error?.message })
    }
  }

  const toggleUserInSector = (sectorId: string, userId: string) => {
    const current = new Set(sectorUsers[sectorId] || [])
    current.has(userId) ? current.delete(userId) : current.add(userId)
    persistSectorUsers(sectorId, Array.from(current))
  }

  const [savingUsers, setSavingUsers] = useState(false)

  const saveUserAssignments = async () => {
    if (!managingSector) return
    if (!user?.companyId) { toast.error('Empresa não identificada'); return }
    const ids = sectorUsers[managingSector.id] || []
    setSavingUsers(true)
    try {
      await saveSectorUsers(user.companyId, managingSector.id, ids)
      toast.success(`${ids.length} usuário(s) vinculado(s) ao setor "${managingSector.name}"`)
      setManagingSector(null)
    } catch (e: any) {
      toast.error('Erro ao salvar usuários do setor', { description: e?.message })
    } finally {
      setSavingUsers(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setores da Empresa</h1>
          <p className="text-sm text-muted-foreground">Gerencie os setores, perfis de acesso e suas vinculações</p>
        </div>
        {canAccess('settings', 'create') && (
          tab === 'sectors' ? (
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Setor
            </button>
          ) : (
            <button onClick={() => { setEditingProfile(null); setShowProfileForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Perfil
            </button>
          )
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['sectors', 'Setores'], ['profiles', 'Perfis de Acesso']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sectors' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.filter(s => s.isActive).map(s => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(123,47,247,0.1)] hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-foreground">{s.name}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setManagingSector(s)} className="rounded p-1 hover:bg-muted" title="Gerenciar usuários">
                  <UserPlus className="h-4 w-4 text-primary" />
                </button>
                <button onClick={() => { setEditing(s); setShowForm(true) }} className="rounded p-1 hover:bg-muted" title="Editar setor">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Excluir o setor "${s.name}"?`)) return
                    try {
                      await deleteSector(s.id)
                      toast.success('Setor excluído')
                    } catch (error: any) {
                      toast.error('Erro ao excluir setor', { description: error?.message })
                    }
                  }}
                  className="rounded p-1 hover:bg-destructive/10"
                  title="Excluir setor"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
            {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {s.allowedProfiles.length} perfis</span>
              <span className="flex items-center gap-1"><LayoutList className="h-3.5 w-3.5" /> {countModules(mergePermissions(allProfiles, new Set(s.allowedProfiles)))} módulos</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {loadingUsers ? <Loader2 className="h-3 w-3 animate-spin" /> : `${getUserCountForSector(s.id)} usuários`}
              </span>
            </div>
          </div>
        ))}
      </div>
      )}

      {tab === 'profiles' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProfiles.map(p => {
            const modules = countModules(p.permissions || {})
            const linkedSectors = sectors.filter(s => s.allowedProfiles.includes(p.id)).length
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground truncate">{p.name}</h3>
                    <p className="text-[11px] font-mono text-muted-foreground">Código {p.code}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingProfile(p); setShowProfileForm(true) }} className="rounded p-1 hover:bg-muted" title="Editar perfil">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Excluir o perfil "${p.name}"? Ele será removido dos setores vinculados.`)) return
                        try {
                          await deleteProfile(p.id)
                          detachProfileFromSectors(p.id)
                          await Promise.all(sectors.filter(s => s.allowedProfiles.includes(p.id)).map(s => saveSector({ ...s, allowedProfiles: s.allowedProfiles.filter(id => id !== p.id) })))
                          toast.success('Perfil excluído')
                        } catch (error: any) {
                          toast.error('Erro ao excluir perfil', { description: error?.message })
                        }
                      }}
                      className="rounded p-1 hover:bg-destructive/10"
                      title="Excluir perfil"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><LayoutList className="h-3.5 w-3.5" /> {modules} módulos</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {linkedSectors} setores</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${p.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
                    {p.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal - Novo/Editar Setor */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">{editing ? 'Editar Setor' : 'Novo Setor'}</h2>
            <SectorForm sector={editing} profiles={allProfiles} companyId={user?.companyId || ''} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Modal - Novo/Editar Perfil */}
      {showProfileForm && (
        <ProfileFormModal
          profile={editingProfile}
          onClose={() => setShowProfileForm(false)}
          companyId={user?.companyId || ''}
          onSave={async (p) => {
            try {
              await saveProfile(p)
              setShowProfileForm(false)
              toast.success(editingProfile ? 'Perfil atualizado' : 'Perfil criado')
            } catch (error: any) {
              toast.error('Erro ao salvar perfil', { description: error?.message })
            }
          }}
        />
      )}

      {/* Modal - Gerenciar Usuários do Setor */}
      {managingSector && (
        <ManageUsersModal
          sector={managingSector}
          users={realUsers}
          loading={loadingUsers}
          assignedUsers={new Set(sectorUsers[managingSector.id] || [])}
          onToggle={(userId) => toggleUserInSector(managingSector.id, userId)}
          saving={savingUsers}
          onSave={saveUserAssignments}
          onClose={() => setManagingSector(null)}
        />
      )}
    </div>
  )
}


/* ── Modal de Gerenciar Usuários ── */
function ManageUsersModal({
  sector, users, loading, assignedUsers, onToggle, onSave, onClose, saving
}: {
  sector: Sector
  users: RealUser[]
  loading: boolean
  saving?: boolean
  assignedUsers: Set<string>
  onToggle: (userId: string) => void
  onSave: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const roleLabels: Record<string, string> = {
    company_admin: 'Administrador',
    doctor: 'Médico',
    receptionist: 'Recepcionista',
    billing: 'Faturamento',
    nurse: 'Enfermeiro(a)',
    user: 'Usuário',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Usuários do Setor</h2>
            <p className="text-sm text-muted-foreground">{sector.name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
          ) : (
            filtered.map(u => (
              <label
                key={u.id}
                className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted rounded-lg px-3 py-2.5 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={assignedUsers.has(u.id)}
                  onChange={() => onToggle(u.id)}
                  className="accent-primary h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[u.role] || u.role}</p>
                </div>
                {assignedUsers.has(u.id) && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Vinculado</span>
                )}
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">{assignedUsers.size} usuário(s) selecionado(s)</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
            <button onClick={onSave} disabled={saving} className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Form de Setor ── */
function SectorForm({ sector, profiles, companyId, onSave, onCancel }: { sector: Sector | null; profiles: any[]; companyId: string; onSave: (s: Sector) => void; onCancel: () => void }) {
  const [name, setName] = useState(sector?.name || '')
  const [desc, setDesc] = useState(sector?.description || '')
  const [allowed, setAllowed] = useState<Set<string>>(new Set(sector?.allowedProfiles || []))
  const [active, setActive] = useState(sector?.isActive ?? true)
  const [queueTypes, setQueueTypes] = useState<Set<'internal' | 'external'>>(
    new Set(sector?.allowedQueueTypes && sector.allowedQueueTypes.length ? sector.allowedQueueTypes : ['internal', 'external'])
  )
  const [deadlineProfiles, setDeadlineProfiles] = useState<Set<string>>(new Set(sector?.allowedDeadlineEditProfiles || []))
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, boolean>>(sector?.moduleOverrides || {})

  const handleToggleOverride = (path: string, value: boolean | null) => {
    setModuleOverrides(prev => {
      const next = { ...prev }
      if (value === null) delete next[path]
      else next[path] = value
      return next
    })
  }

  const toggle = (id: string) => {
    const next = new Set(allowed)
    next.has(id) ? next.delete(id) : next.add(id)
    setAllowed(next)
  }

  const toggleDeadline = (id: string) => {
    const next = new Set(deadlineProfiles)
    next.has(id) ? next.delete(id) : next.add(id)
    setDeadlineProfiles(next)
  }

  const toggleQueueType = (t: 'internal' | 'external') => {
    const next = new Set(queueTypes)
    next.has(t) ? next.delete(t) : next.add(t)
    setQueueTypes(next)
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
      <div>
        <label className="text-sm font-medium">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium">Descrição</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Perfis permitidos</label>
        <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-lg p-2">
          {profiles.filter(p => p.isActive).map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
              <input type="checkbox" checked={allowed.has(p.id)} onChange={() => toggle(p.id)} className="accent-primary" />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Perfis permitidos para alterar Datas (Entrega/Coleta)</label>
        <div className="max-h-[150px] overflow-y-auto space-y-1 border rounded-lg p-2">
          {profiles.filter(p => p.isActive).map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
              <input type="checkbox" checked={deadlineProfiles.has(p.id)} onChange={() => toggleDeadline(p.id)} className="accent-primary" />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <SectorAccessPreview
        profiles={profiles}
        allowedIds={allowed}
        overrides={moduleOverrides}
        onToggleOverride={handleToggleOverride}
        onResetOverrides={() => setModuleOverrides({})}
      />

      <div>
        <label className="text-sm font-medium mb-2 block">Tipos de fila visíveis na Recepção</label>
        <p className="text-xs text-muted-foreground mb-2">Controla quais abas de filas (Externa/Interna) este setor poderá visualizar.</p>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
            <input type="checkbox" checked={queueTypes.has('external')} onChange={() => toggleQueueType('external')} className="accent-primary" />
            Fila Externa (Atendimento / Coleta)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
            <input type="checkbox" checked={queueTypes.has('internal')} onChange={() => toggleQueueType('internal')} className="accent-primary" />
            Fila Interna
          </label>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-primary" /> Ativo
      </label>
      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-card">
        <button onClick={onCancel} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
        <button onClick={() => {
          if (!name.trim()) { toast.error('Nome é obrigatório'); return }
          if (queueTypes.size === 0) { toast.error('Selecione ao menos um tipo de fila'); return }
          onSave({
            id: sector?.id || `sec_${Date.now()}`,
            name, description: desc,
            companyId: companyId || '',
            isActive: active,
            allowedProfiles: Array.from(allowed),
            allowedQueueTypes: Array.from(queueTypes),
            allowedDeadlineEditProfiles: Array.from(deadlineProfiles),
            moduleOverrides,
          })
        }} className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md">Salvar</button>
      </div>
    </div>
  )
}


/* ── Prévia de acessos do setor (menu lateral + permissões) ── */
function countModules(perms: PermissionsMap): number {
  return Object.keys(perms).filter(k => {
    const v = (perms as any)[k] as string[] | undefined
    if (!v?.length) return false
    return k === 'apoio' ? true : v.includes('view')
  }).length
}

function mergePermissions(profiles: any[], allowedIds: Set<string>): PermissionsMap {
  const merged: PermissionsMap = {}
  profiles.filter(p => allowedIds.has(p.id)).forEach(p => {
    Object.entries(p.permissions || {}).forEach(([mod, acts]) => {
      const key = mod as SystemModule
      const set = new Set([...(merged[key] || []), ...((acts as PermissionAction[]) || [])])
      merged[key] = Array.from(set) as PermissionAction[]
    })
  })
  return merged
}

export function SectorAccessPreview({ profiles, allowedIds, overrides, onToggleOverride, onResetOverrides }: {
  profiles: any[]
  allowedIds: Set<string>
  overrides?: Record<string, boolean>
  onToggleOverride?: (path: string, value: boolean | null) => void
  onResetOverrides?: () => void
}) {
  const perms = mergePermissions(profiles, allowedIds)
  const ov = overrides || {}
  const baseCan = (m: SystemModule | null) => !m ? true : m === 'apoio' ? ((perms[m]?.length ?? 0) > 0) : (perms[m]?.includes('view') ?? false)
  const can = (path: string, m: SystemModule | null) => {
    if (path in ov) return ov[path]
    return baseCan(m)
  }
  const editable = !!onToggleOverride
  const overrideCount = Object.keys(ov).length

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <LayoutList className="h-4 w-4 text-primary" />
          <label className="text-sm font-medium">Menu lateral liberado para este setor</label>
          {overrideCount > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {overrideCount} ajuste(s) manual(is)
            </span>
          )}
          {editable && overrideCount > 0 && (
            <button type="button" onClick={onResetOverrides} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground underline">
              Restaurar padrão dos perfis
            </button>
          )}
        </div>
        {editable && (
          <p className="text-xs text-muted-foreground mb-2">Marque ou desmarque cada item individualmente para liberar ou remover do menu deste setor.</p>
        )}
        <div className="max-h-[260px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {NAV_SECTIONS.map(section => (
            <div key={section.title} className="p-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{section.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                {section.items.map(item => {
                  const ok = can(item.path, item.module)
                  const manual = item.path in ov
                  return (
                    <label
                      key={item.path}
                      className={`flex items-center gap-2 text-xs py-0.5 rounded px-1 ${editable ? 'cursor-pointer hover:bg-muted' : ''} ${ok ? 'text-foreground' : 'text-muted-foreground/60'}`}
                    >
                      {editable ? (
                        <input
                          type="checkbox"
                          className="accent-primary h-3.5 w-3.5 shrink-0"
                          checked={ok}
                          onChange={() => {
                            const next = !ok
                            onToggleOverride!(item.path, next === baseCan(item.module) ? null : next)
                          }}
                        />
                      ) : (
                        ok ? <Check className="h-3 w-3 text-primary shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                      {manual && <span className="text-[9px] text-primary shrink-0">manual</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>


      <div>
        <label className="text-sm font-medium mb-2 block">Permissões de visualização e ações</label>
        <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-semibold">Módulo</th>
                {ALL_ACTIONS.map(a => <th key={a} className="px-1 py-1.5 font-semibold">{ACTION_LABELS[a]}</th>)}
              </tr>
            </thead>
            <tbody>
              {SYSTEM_MODULES.map(m => (
                <tr key={m.key} className="border-t border-border">
                  <td className="px-2 py-1.5">{m.label}</td>
                  {ALL_ACTIONS.map(a => (
                    <td key={a} className="text-center px-1 py-1.5">
                      {perms[m.key]?.includes(a)
                        ? <Check className="h-3 w-3 text-primary mx-auto" />
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
