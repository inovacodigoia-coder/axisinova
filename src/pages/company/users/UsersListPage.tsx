import { useState } from 'react'
import { useCompanyContext } from '@/context/CompanyContext'
import { DataTable } from '@/components/ui/DataTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, Ban, Unlock, Edit, Users } from 'lucide-react'
import type { CompanyUser } from '@/types/company-portal.types'
import { toast } from 'sonner'

export default function UsersListPage() {
  const { allProfiles, allSectors, allUsers, canAccess } = useCompanyContext()
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [profileFilter, setProfileFilter] = useState('')
  const [users, setUsers] = useState<CompanyUser[]>(allUsers)

  const activeUsers = users.filter(u => !u.isBlocked)
  const blockedUsers = users.filter(u => u.isBlocked)

  const filtered = activeUsers.filter(u => {
    if (search && !u.fullName.toLowerCase().includes(search.toLowerCase()) && !u.username.toLowerCase().includes(search.toLowerCase())) return false
    if (sectorFilter && !u.sectors.includes(sectorFilter)) return false
    if (profileFilter && !u.profiles.includes(profileFilter)) return false
    return true
  })

  const handleBlock = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: true, blockedReason: 'Bloqueado pelo administrador', blockedAt: new Date().toISOString() } : u))
    toast.success('Usuário bloqueado')
  }

  const handleUnblock = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: false, blockedReason: undefined } : u))
    toast.success('Usuário desbloqueado')
  }

  const getSectorName = (ids: string[]) => allSectors.filter(s => ids.includes(s.id)).map(s => s.name).join(', ') || '—'

  const columns = [
    { key: 'username', label: 'Nome (login)', sortable: true, render: (u: CompanyUser) => <span className="font-medium text-foreground">{u.username}</span> },
    { key: 'fullName', label: 'Nome completo', sortable: true, render: (u: CompanyUser) => <span>{u.fullName}</span> },
    { key: 'sectors', label: 'Setor', render: (u: CompanyUser) => <span className="text-sm text-muted-foreground">{getSectorName(u.sectors)}</span> },
    { key: 'professionalClass', label: 'Classe', render: (u: CompanyUser) => <span className="text-sm">{u.professionalClass || '—'}</span> },
    { key: 'occupation', label: 'Ocupação', render: (u: CompanyUser) => <span className="text-sm text-muted-foreground">{u.occupation || '—'}</span> },
    { key: 'isActive', label: 'Status', render: (u: CompanyUser) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${u.isActive ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
        {u.isActive ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'actions', label: 'Ações', render: (u: CompanyUser) => (
      <div className="flex items-center gap-1">
        <button className="rounded p-1 hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
        <button onClick={() => handleBlock(u.id)} className="rounded p-1 hover:bg-destructive/10"><Ban className="h-4 w-4 text-muted-foreground" /></button>
      </div>
    )},
  ]

  const blockedColumns = [
    { key: 'fullName', label: 'Nome', sortable: true, render: (u: CompanyUser) => <span className="font-medium">{u.fullName}</span> },
    { key: 'username', label: 'Login', render: (u: CompanyUser) => <span>{u.username}</span> },
    { key: 'blockedReason', label: 'Motivo', render: (u: CompanyUser) => <span className="text-sm text-muted-foreground">{u.blockedReason || '—'}</span> },
    { key: 'blockedAt', label: 'Bloqueado em', render: (u: CompanyUser) => <span className="text-sm">{u.blockedAt || '—'}</span> },
    { key: 'actions', label: '', render: (u: CompanyUser) => (
      <button onClick={() => handleUnblock(u.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
        <Unlock className="h-3 w-3" /> Desbloquear
      </button>
    )},
  ]

  if (allUsers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gestão de usuários da empresa</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum usuário cadastrado</h3>
          <p className="text-sm text-muted-foreground">Os usuários serão exibidos aqui após serem cadastrados no sistema.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gestão de usuários da empresa</p>
        </div>
        {canAccess('users', 'create') && (
          <button className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="h-4 w-4" /> Novo Usuário
          </button>
        )}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Usuários ({activeUsers.length})</TabsTrigger>
          <TabsTrigger value="blocked">Bloqueados ({blockedUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
            </div>
            <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Todos os setores</option>
              {allSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={profileFilter} onChange={e => setProfileFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Todos os perfis</option>
              {allProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <DataTable data={filtered} columns={columns} pageSize={10} />
        </TabsContent>

        <TabsContent value="blocked">
          <DataTable data={blockedUsers} columns={blockedColumns} pageSize={10} emptyMessage="Nenhum usuário bloqueado" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
