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

      {/* Implantação e Treinamento */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Implantação e Treinamento (30 dias)</h2>
        <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold text-foreground">Plano</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Perfil de Cliente</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Esforço de Treinamento</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Valor Sugerido (Setup)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-6 py-4 font-bold text-foreground">Starter</td>
                <td className="px-6 py-4 text-muted-foreground">Consultórios pequenos</td>
                <td className="px-6 py-4 text-muted-foreground">1 médico + até 3 usuários. Foco em agenda e prontuário básico.</td>
                <td className="px-6 py-4 font-semibold text-foreground">R$ 800,00 a R$ 1.200,00</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-6 py-4 font-bold text-foreground">Pro</td>
                <td className="px-6 py-4 text-muted-foreground">Clínicas em crescimento</td>
                <td className="px-6 py-4 text-muted-foreground">Até 15 médicos + usuários ilimitados. Inclui BI e Digitalização.</td>
                <td className="px-6 py-4 font-semibold text-foreground">R$ 2.500,00 a R$ 3.500,00</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-bold text-foreground">Enterprise</td>
                <td className="px-6 py-4 text-muted-foreground">Redes e Hospitais</td>
                <td className="px-6 py-4 text-muted-foreground">Médicos ilimitados, multi-unidades (5 CNPJs) e Integração API.</td>
                <td className="px-6 py-4 font-semibold text-foreground">A partir de R$ 7.000,00</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          * Pagamento: 50% no ato da assinatura e 50% após a entrega do último módulo de treinamento.
        </p>
      </div>
    </div>
  )
}
