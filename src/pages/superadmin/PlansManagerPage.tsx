import { MOCK_PLANS } from '@/mocks/superadmin.mock'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function PlansManagerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Planos e Preços</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {MOCK_PLANS.map((plan) => (
          <div key={plan.id} className={`rounded-2xl border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${plan.isPopular ? 'border-secondary ring-2 ring-secondary/20' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              {plan.isPopular && <StatusBadge variant="info">Mais Popular</StatusBadge>}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">R$ {plan.priceMonthly}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
              <p className="text-xs text-muted-foreground mt-1">Anual: R$ {plan.priceAnnual}/mês</p>
            </div>
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Empresas</span><span className="font-medium">{plan.companiesCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Médicos</span><span className="font-medium">{plan.maxDoctors ?? '∞'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Armazenamento</span><span className="font-medium">{plan.storageGB >= 1000 ? '1 TB' : `${plan.storageGB} GB`}</span></div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {plan.features.slice(0, 5).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                  <span className="text-[hsl(var(--success))]">✅</span> {f}
                </li>
              ))}
              {plan.features.length > 5 && <li className="text-xs text-muted-foreground">+{plan.features.length - 5} recursos</li>}
            </ul>
            <div className="flex items-center gap-2 text-xs">
              <StatusBadge variant={plan.isVisible ? 'success' : 'neutral'}>{plan.isVisible ? 'Visível' : 'Oculto'}</StatusBadge>
              <StatusBadge variant={plan.acceptingSignups ? 'success' : 'warning'}>{plan.acceptingSignups ? 'Aceitando' : 'Fechado'}</StatusBadge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
