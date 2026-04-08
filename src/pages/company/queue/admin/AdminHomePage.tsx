import { useNavigate } from 'react-router-dom'
import { Building2, BarChart3 } from 'lucide-react'

export default function AdminHomePage() {
  const navigate = useNavigate()

  const cards = [
    { label: 'Locais / Unidades', icon: Building2, path: '/app/filas/admin/unidades', desc: 'Gerenciar unidades, filas e guichês' },
    { label: 'Dashboard', icon: BarChart3, path: '/app/filas/admin/bi', desc: 'Métricas e BI de filas' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <button
            key={c.path}
            onClick={() => navigate(c.path)}
            className="rounded-xl border border-border bg-card p-6 text-left hover:border-secondary hover:shadow-lg transition-all space-y-2"
          >
            <c.icon className="h-8 w-8 text-primary" />
            <h3 className="text-base font-bold text-foreground">{c.label}</h3>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
