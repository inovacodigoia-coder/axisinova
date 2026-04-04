import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { MOCK_LOTES } from '@/mocks/billing.mock'
import { toast } from 'sonner'

const LOTE_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Aberto', cls: 'bg-blue-100 text-blue-800' },
  closed: { label: 'Fechado', cls: 'bg-yellow-100 text-yellow-800' },
  submitted: { label: 'Enviado', cls: 'bg-purple-100 text-purple-800' },
  processing: { label: 'Em Processamento', cls: 'bg-sky-100 text-sky-800' },
  finished: { label: 'Finalizado', cls: 'bg-green-100 text-green-800' },
}

const STEPS = ['open', 'closed', 'submitted', 'processing', 'finished']

export default function LotesPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lotes de Cobrança</h1>
          <p className="text-sm text-muted-foreground">{MOCK_LOTES.length} lotes</p>
        </div>
        <GradientButton><Plus className="h-4 w-4 mr-2" /> Novo Lote</GradientButton>
      </div>

      <div className="space-y-4">
        {MOCK_LOTES.map(l => {
          const sc = LOTE_STATUS[l.status]
          const stepIdx = STEPS.indexOf(l.status)
          return (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/faturamento/lotes/${l.id}`)}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{l.number} · {l.convenioName}</h3>
                  <p className="text-sm text-muted-foreground">Competência: {l.competencia}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">R$ {l.totalValue.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">{l.totalGuides} guias</p>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-1 mb-4">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`h-2 flex-1 rounded-full ${i <= stepIdx ? 'bg-primary' : 'bg-muted'}`} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                {STEPS.map(s => <span key={s}>{LOTE_STATUS[s].label}</span>)}
              </div>

              {l.status === 'open' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <button onClick={(e) => { e.stopPropagation(); toast.success('Lote fechado') }} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">Fechar Lote</button>
                  <button onClick={(e) => { e.stopPropagation(); toast.info('XML gerado') }} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">Gerar XML TISS</button>
                </div>
              )}
              {l.protocolNumber && <p className="text-xs text-muted-foreground mt-2">Protocolo: {l.protocolNumber}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
