import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { DataTable } from '@/components/ui/DataTable'
import { Search, Plus, Users, Edit, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CreateUserModal } from '@/components/company/users/CreateUserModal'

interface ProfileRow {
  id: string
  full_name: string
  cpf: string | null
  role: string
  is_active: boolean | null
  company_id: string | null
  created_at: string | null
  updated_at: string | null
}

const roleLabelMap: Record<string, string> = {
  company_admin: 'Administrador',
  doctor: 'Médico',
  receptionist: 'Recepcionista',
  billing: 'Faturista',
  telephonist: 'Telefonista',
  nurse: 'Enfermeiro(a)',
  pharmacist: 'Farmacêutico(a)',
  analyst: 'Analista',
}

export default function UsersListPage() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const companyId = user?.companyId

  const fetchProfiles = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)

    if (error) {
      console.error('Error fetching profiles:', error)
      toast.error('Erro ao carregar usuários')
    }
    setProfiles(data ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const activeProfiles = profiles.filter(p => p.is_active !== false)

  const filtered = activeProfiles.filter(p => {
    if (search && !p.full_name.toLowerCase().includes(search.toLowerCase()) && !(p.cpf ?? '').includes(search)) return false
    return true
  })

  const columns = [
    { key: 'full_name', label: 'Nome completo', sortable: true, render: (p: ProfileRow) => <span className="font-medium text-foreground">{p.full_name}</span> },
    { key: 'cpf', label: 'CPF', render: (p: ProfileRow) => <span className="text-sm text-muted-foreground">{p.cpf || '—'}</span> },
    { key: 'role', label: 'Função', render: (p: ProfileRow) => <span className="text-sm">{roleLabelMap[p.role] || p.role}</span> },
    { key: 'is_active', label: 'Status', render: (p: ProfileRow) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_active !== false ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
        {p.is_active !== false ? 'Ativo' : 'Inativo'}
      </span>
    )},
    { key: 'created_at', label: 'Cadastrado em', render: (p: ProfileRow) => (
      <span className="text-sm text-muted-foreground">
        {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
      </span>
    )},
    { key: 'actions', label: 'Ações', render: (_p: ProfileRow) => (
      <div className="flex items-center gap-1">
        <button className="rounded p-1 hover:bg-muted"><Edit className="h-4 w-4 text-muted-foreground" /></button>
      </div>
    )},
  ]

  const NewUserButton = () => (
    <button
      onClick={() => setShowCreateModal(true)}
      className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
    >
      <Plus className="h-4 w-4" /> Novo Usuário
    </button>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <NewUserButton />
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum usuário cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Os usuários serão exibidos aqui após serem cadastrados no sistema.</p>
          <NewUserButton />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm" />
            </div>
          </div>
          <DataTable data={filtered} columns={columns} pageSize={10} />
        </div>
      )}

      <CreateUserModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreated={fetchProfiles} />
    </div>
  )
}
