import { StatusBadge } from '@/components/ui/StatusBadge'

const teamMembers = [
  { id: 'tm_1', name: 'Rafael Mendes', email: 'superadmin@axisinova.com', level: 'super_admin_master', isActive: true, lastAccess: '2025-01-20 10:32' },
  { id: 'tm_2', name: 'Larissa Campos', email: 'larissa@axisinova.com', level: 'super_admin_support', isActive: true, lastAccess: '2025-01-20 09:15' },
  { id: 'tm_3', name: 'Gustavo Pinto', email: 'gustavo@axisinova.com', level: 'super_admin_finance', isActive: true, lastAccess: '2025-01-19 17:30' },
]

const levelLabels: Record<string, string> = {
  super_admin_master: 'Acesso Total',
  super_admin_support: 'Suporte (visualização)',
  super_admin_finance: 'Financeiro',
}

export default function SuperAdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Usuários do Sistema</h1>
        <button className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition-all active:scale-[0.97]">
          Convidar Membro
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nível</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3"><StatusBadge variant="info">{levelLabels[m.level]}</StatusBadge></td>
                <td className="px-4 py-3"><StatusBadge variant={m.isActive ? 'success' : 'neutral'}>{m.isActive ? 'Ativo' : 'Inativo'}</StatusBadge></td>
                <td className="px-4 py-3 text-muted-foreground">{m.lastAccess}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
