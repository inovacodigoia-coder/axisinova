import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { DataTable } from '@/components/ui/DataTable'
import { Search, Plus, Users, Edit, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { CreateUserModal } from '@/components/company/users/CreateUserModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

const ROLE_OPTIONS = Object.entries(roleLabelMap).map(([value, label]) => ({ value, label }))

export default function UsersListPage() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null)

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

  const handleToggleActive = async (profile: ProfileRow) => {
    const newStatus = !(profile.is_active !== false)
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erro ao alterar status')
      return
    }
    toast.success(newStatus ? 'Usuário ativado' : 'Usuário desativado')
    fetchProfiles()
  }

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
    { key: 'actions', label: 'Ações', render: (p: ProfileRow) => (
      <div className="flex items-center gap-1">
        <button onClick={() => setEditingUser(p)} className="rounded p-1.5 hover:bg-muted" title="Editar">
          <Edit className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={() => handleToggleActive(p)} className="rounded p-1.5 hover:bg-muted" title={p.is_active !== false ? 'Desativar' : 'Ativar'}>
          {p.is_active !== false
            ? <ToggleRight className="h-4 w-4 text-[hsl(var(--success))]" />
            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          }
        </button>
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

      <EditUserModal
        profile={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => { setEditingUser(null); fetchProfiles() }}
      />
    </div>
  )
}

function EditUserModal({ profile, onClose, onSaved }: { profile: ProfileRow | null; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setCpf(profile.cpf || '')
      setRole(profile.role)
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile || !fullName.trim() || !role) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, cpf: cpf || null, role })
      .eq('id', profile.id)

    if (error) {
      toast.error('Erro ao atualizar usuário')
    } else {
      toast.success('Usuário atualizado')
      onSaved()
    }
    setSaving(false)
  }

  return (
    <Dialog open={!!profile} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input value={cpf} onChange={e => setCpf(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Função *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
