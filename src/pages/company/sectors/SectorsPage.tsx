import { useState, useEffect } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { MOCK_SECTORS } from '@/mocks/company.mock'
import { Plus, Edit, Users, ShieldCheck, Loader2, UserPlus, X, Search } from 'lucide-react'
import type { Sector } from '@/types/permissions.types'
import { toast } from 'sonner'

interface RealUser {
  id: string
  full_name: string
  role: string
  is_active: boolean
}

export default function SectorsPage() {
  const { canAccess, allProfiles } = useCompanyContext()
  const { user } = useAuth()
  const [sectors, setSectors] = useState(MOCK_SECTORS)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Sector | null>(null)
  const [managingSector, setManagingSector] = useState<Sector | null>(null)
  const [realUsers, setRealUsers] = useState<RealUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  // sectorUsers: map of sectorId -> set of userId
  const [sectorUsers, setSectorUsers] = useState<Record<string, Set<string>>>({})

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
  }, [user?.companyId])

  const getUserCountForSector = (sectorId: string) => {
    return sectorUsers[sectorId]?.size || 0
  }

  const handleSave = (s: Sector) => {
    if (editing) {
      setSectors(prev => prev.map(x => x.id === s.id ? s : x))
      toast.success('Setor atualizado')
    } else {
      setSectors(prev => [...prev, s])
      toast.success('Setor criado')
    }
    setShowForm(false)
    setEditing(null)
  }

  const toggleUserInSector = (sectorId: string, userId: string) => {
    setSectorUsers(prev => {
      const current = new Set(prev[sectorId] || [])
      if (current.has(userId)) {
        current.delete(userId)
      } else {
        current.add(userId)
      }
      return { ...prev, [sectorId]: current }
    })
  }

  const saveUserAssignments = () => {
    if (managingSector) {
      const count = getUserCountForSector(managingSector.id)
      toast.success(`${count} usuário(s) vinculado(s) ao setor "${managingSector.name}"`)
      setManagingSector(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setores da Empresa</h1>
          <p className="text-sm text-muted-foreground">Gerencie os setores e suas vinculações</p>
        </div>
        {canAccess('settings', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Setor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.filter(s => s.isActive).map(s => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(123,47,247,0.1)] hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-foreground">{s.name}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setManagingSector(s)} className="rounded p-1 hover:bg-muted" title="Gerenciar usuários">
                  <UserPlus className="h-4 w-4 text-primary" />
                </button>
                <button onClick={() => { setEditing(s); setShowForm(true) }} className="rounded p-1 hover:bg-muted">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {s.allowedProfiles.length} perfis</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {loadingUsers ? <Loader2 className="h-3 w-3 animate-spin" /> : `${getUserCountForSector(s.id)} usuários`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Novo/Editar Setor */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">{editing ? 'Editar Setor' : 'Novo Setor'}</h2>
            <SectorForm sector={editing} profiles={allProfiles} companyId={user?.companyId || ''} onSave={handleSave} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Modal - Gerenciar Usuários do Setor */}
      {managingSector && (
        <ManageUsersModal
          sector={managingSector}
          users={realUsers}
          loading={loadingUsers}
          assignedUsers={sectorUsers[managingSector.id] || new Set()}
          onToggle={(userId) => toggleUserInSector(managingSector.id, userId)}
          onSave={saveUserAssignments}
          onClose={() => setManagingSector(null)}
        />
      )}
    </div>
  )
}

/* ── Modal de Gerenciar Usuários ── */
function ManageUsersModal({
  sector, users, loading, assignedUsers, onToggle, onSave, onClose
}: {
  sector: Sector
  users: RealUser[]
  loading: boolean
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
            <button onClick={onSave} className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white">Salvar</button>
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

  const toggle = (id: string) => {
    const next = new Set(allowed)
    next.has(id) ? next.delete(id) : next.add(id)
    setAllowed(next)
  }

  return (
    <div className="space-y-4">
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
        <div className="max-h-[200px] overflow-y-auto space-y-1">
          {profiles.filter(p => p.isActive).map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted rounded px-2 py-1">
              <input type="checkbox" checked={allowed.has(p.id)} onChange={() => toggle(p.id)} className="accent-primary" />
              {p.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="accent-primary" /> Ativo
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
        <button onClick={() => {
          if (!name.trim()) { toast.error('Nome é obrigatório'); return }
          onSave({ id: sector?.id || `sec_${Date.now()}`, name, description: desc, companyId: companyId || '', isActive: active, allowedProfiles: Array.from(allowed) })
        }} className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white">Salvar</button>
      </div>
    </div>
  )
}
