import { useState, useMemo } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { DataTable } from '@/components/ui/DataTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PermissionsMatrix } from '@/components/company/users/PermissionsMatrix'
import { Plus, Search, Eye } from 'lucide-react'
import type { Profile, PermissionsMap } from '@/types/permissions.types'
import { toast } from 'sonner'

export default function ProfilesManagerPage() {
  const { allProfiles, canAccess } = useCompanyContext()
  const [profiles, setProfiles] = useState(allProfiles)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !String(p.code).includes(search)) return false
      if (statusFilter === 'active' && !p.isActive) return false
      if (statusFilter === 'inactive' && p.isActive) return false
      return true
    })
  }, [profiles, search, statusFilter])

  const columns = [
    { key: 'code', label: 'Código', sortable: true, render: (p: Profile) => <span className="font-mono text-sm">{p.code}</span> },
    { key: 'name', label: 'Descrição do Perfil', sortable: true, render: (p: Profile) => <span className="font-medium text-foreground">{p.name}</span> },
    { key: 'establishmentId', label: 'Estabelecimento', sortable: true, render: (p: Profile) => <span className="text-sm text-muted-foreground">{p.establishmentId || 'Todos'}</span> },
    { key: 'createdBy', label: 'Criado por', render: (p: Profile) => <span className="text-sm">{p.createdBy === 'admin' ? 'Administrador' : 'Equipe de TI'}</span> },
    { key: 'isActive', label: 'Situação', sortable: true, render: (p: Profile) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${p.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
        {p.isActive ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'actions', label: '', render: (p: Profile) => (
      <button onClick={() => { setEditingProfile(p); setShowForm(true) }} className="rounded p-1 hover:bg-muted"><Eye className="h-4 w-4 text-muted-foreground" /></button>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Perfis</h1>
          <p className="text-sm text-muted-foreground">Cadastro e permissões de perfis de acesso</p>
        </div>
        {canAccess('users', 'create') && (
          <button onClick={() => { setEditingProfile(null); setShowForm(true) }} className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        )}
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="copia">Cópia de Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou código..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {(['active', 'inactive', 'all'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                  {s === 'active' ? 'Ativos' : s === 'inactive' ? 'Inativos' : 'Todos'}
                </button>
              ))}
            </div>
          </div>
          <DataTable data={filtered} columns={columns} pageSize={15} />
        </TabsContent>

        <TabsContent value="copia">
          <ProfileCopyPanel />
        </TabsContent>
      </Tabs>

      {showForm && (
        <ProfileFormModal
          profile={editingProfile}
          onClose={() => setShowForm(false)}
          onSave={(p) => {
            if (editingProfile) {
              setProfiles(prev => prev.map(x => x.id === p.id ? p : x))
            } else {
              setProfiles(prev => [...prev, p])
            }
            setShowForm(false)
            toast.success(editingProfile ? 'Perfil atualizado' : 'Perfil criado')
          }}
        />
      )}
    </div>
  )
}

function ProfileFormModal({ profile, onClose, onSave }: { profile: Profile | null; onClose: () => void; onSave: (p: Profile) => void }) {
  const [name, setName] = useState(profile?.name || '')
  const [description, setDescription] = useState(profile?.description || '')
  const [createdBy, setCreatedBy] = useState<'admin' | 'it_team'>(profile?.createdBy || 'admin')
  const [isActive, setIsActive] = useState(profile?.isActive ?? true)
  const [permissions, setPermissions] = useState<PermissionsMap>(profile?.permissions || {})
  const [activeTab, setActiveTab] = useState('general')

  const handleSave = () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return }
    onSave({
      id: profile?.id || `prof_${Date.now()}`,
      code: profile?.code || Math.floor(1000 + Math.random() * 9000),
      name, description, companyId: 'comp_001',
      permissions, isActive, createdBy,
      createdAt: profile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">{profile ? 'Editar Perfil' : 'Novo Perfil'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-1 px-6">
            {[{ key: 'general', label: 'Dados Gerais' }, { key: 'permissions', label: 'Permissões' }].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {profile && <div className="text-sm text-muted-foreground">Código: <span className="font-mono font-bold">{profile.code}</span></div>}
              <div>
                <label className="text-sm font-medium">Nome do perfil *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Criado por:</label>
                {(['admin', 'it_team'] as const).map(v => (
                  <label key={v} className="flex items-center gap-1.5 text-sm">
                    <input type="radio" checked={createdBy === v} onChange={() => setCreatedBy(v)} className="accent-primary" />
                    {v === 'admin' ? 'Administrador' : 'Equipe de TI'}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-primary" /> Ativo
              </label>
            </div>
          )}

          {activeTab === 'permissions' && (
            <PermissionsMatrix permissions={permissions} onChange={setPermissions} />
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button onClick={handleSave} className="gradient-bg rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90">Salvar</button>
        </div>
      </div>
    </div>
  )
}

function ProfileCopyPanel() {
  const { allUsers } = useCompanyContext()
  const [sourceUser, setSourceUser] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filtered = allUsers.filter(u => !search || u.fullName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Configuração da Cópia</h3>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Usuário referência</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={sourceUser} onChange={e => setSourceUser(e.target.value)} placeholder="Buscar usuário..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Opções</label>
          <div className="grid grid-cols-2 gap-2">
            {['Setor', 'Perfil', 'Parâmetro', 'Caixas liberadas', 'Copiar dados do usuário', 'Grupo usuário', 'Liberação de usuário', 'Estabelecimento', 'Permissões Agenda', 'Filtros', 'Limpar registros'].map(opt => (
              <label key={opt} className="flex items-center gap-1.5 text-xs"><input type="checkbox" className="accent-primary" /> {opt}</label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Observação</label>
          <textarea rows={2} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <button className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white w-full">Copiar</button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Destinatários</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
        </div>
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {filtered.map(u => (
            <label key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
              <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => {
                const next = new Set(selectedIds)
                next.has(u.id) ? next.delete(u.id) : next.add(u.id)
                setSelectedIds(next)
              }} className="accent-primary" />
              <span className="font-medium">{u.fullName}</span>
              <span className="text-xs text-muted-foreground ml-auto">{u.occupation}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
