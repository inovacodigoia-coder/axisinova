import { useState, useEffect } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { supabase } from '@/integrations/supabase/client'
import { Eye, Building2 } from 'lucide-react'
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
      // Get all profiles and join with companies
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(name)')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const mapped: SystemUser[] = data.map((p: any) => ({
          id: p.id,
          name: p.full_name || 'Sem nome',
          email: p.email || '',
          role: p.role || 'user',
          isActive: true, // Profiles table doesn't have an active field yet, assuming true
          lastAccess: p.updated_at ? new Date(p.updated_at).toLocaleString('pt-BR') : 'Nunca',
          companyId: p.company_id,
          companyName: p.companies?.name || 'Sistema (AxisInova)',
        }))
        setUsers(mapped)
      }
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + err.message)
    } finally {
      setLoading(false)
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
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => navigate(`/superadmin/usuarios/${m.id}`)}
                        className="p-2 hover:bg-muted rounded-full transition-colors inline-flex items-center gap-1 text-primary"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs font-medium">Ver</span>
                      </button>
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
