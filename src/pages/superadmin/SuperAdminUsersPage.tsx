import { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { supabase } from '@/integrations/supabase/client'
import { Eye, Building2, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastAccess: string
  companyId?: string
  companyName?: string
  lockId?: string
  lockExpiresAt?: string
}

interface ActiveLock {
  id: string
  lock_key: string
  expires_at: string
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Admin Empresa',
  doctor: 'Médico',
  receptionist: 'Recepção',
  billing: 'Faturamento',
  lab_technician: 'Técnico Lab',
  pharmacy: 'Farmácia',
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      // Get all profiles, companies and active login lockouts
      const [profilesRes, locksRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, companies!inner(name, status)')
          .neq('companies.status', 'deleted')
          .order('created_at', { ascending: false }),
        supabase
          .from('auth_lockouts')
          .select('id, lock_key, expires_at')
          .eq('lock_type', 'identifier')
          .is('released_at', null)
          .gt('expires_at', new Date().toISOString()),
      ])

      if (profilesRes.error) throw profilesRes.error

      const locks = (locksRes.data as ActiveLock[]) ?? []

      if (profilesRes.data) {
        // Resolve e-mails (auth.users) in parallel — needed to match lockouts,
        // since lock_key is the identifier typed at login (usually the e-mail)
        const mapped: SystemUser[] = await Promise.all(
          profilesRes.data.map(async (p: any) => {
            let email: string | null = p.email ?? null
            if (!email) {
              try {
                const { data: mail } = await supabase.functions.invoke('get-user-email', {
                  body: { user_id: p.id },
                })
                email = mail?.email ?? null
              } catch {
                email = null
              }
            }

            const identifiers = [email, p.cpf]
              .filter(Boolean)
              .map((v: string) => v.toLowerCase())
            const lock = locks.find((l) => identifiers.includes(l.lock_key.toLowerCase()))

            return {
              id: p.id,
              name: p.full_name || 'Sem nome',
              email: email || (p.cpf ? `CPF: ${p.cpf}` : 'Sem e-mail vinculado'),
              role: p.role || 'user',
              isActive: p.is_active !== false,
              lastAccess: p.updated_at ? new Date(p.updated_at).toLocaleString('pt-BR') : 'Nunca',
              companyId: p.company_id,
              companyName: p.companies?.name || 'Sistema (AxisInova)',
              lockId: lock?.id,
              lockExpiresAt: lock?.expires_at,
            }
          })
        )
        setUsers(mapped)
      }
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function unlockUser(user: SystemUser) {
    if (!user.lockId) return
    try {
      const { error } = await supabase.rpc('auth_release_lockout', { _lockout_id: user.lockId })
      if (error) throw error
      toast.success(`Acesso de ${user.name} desbloqueado`)
      fetchUsers()
    } catch (err: any) {
      toast.error('Erro ao desbloquear: ' + err.message)
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`)
      fetchUsers()
    } catch (err: any) {
      toast.error('Erro ao alterar status: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie todos os usuários e suas associações empresariais</p>
        </div>
        <button className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all active:scale-[0.97]">
          Convidar Membro
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Usuário</th>
                <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Associação</th>
                <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Nível / Cargo</th>
                <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Último acesso</th>
                <th className="px-4 py-4 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-4 text-center font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando usuários...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado</td>
                </tr>
              ) : (
                users.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-medium text-foreground/80">{m.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={m.role === 'super_admin' ? 'warning' : 'info'}>
                        {roleLabels[m.role] || m.role}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{m.lastAccess}</td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={m.isActive ? 'success' : 'error'}>
                        {m.isActive ? 'Ativo' : 'Inativo'}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => navigate(`/superadmin/usuarios/${m.id}`)}
                          className="p-2 hover:bg-muted rounded-full transition-colors inline-flex items-center gap-1 text-primary"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="text-xs font-medium">Ver</span>
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(m.id, m.isActive)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            m.isActive 
                              ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {m.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
