import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MOCK_LOTES, MOCK_GUIDES } from '@/mocks/billing.mock'
import { toast } from 'sonner'

const STEPS = ['open', 'closed', 'submitted', 'processing', 'finished']
const STEP_LABELS: Record<string, string> = { open: 'Aberto', closed: 'Fechado', submitted: 'Enviado', processing: 'Em Processamento', finished: 'Finalizado' }

export default function LoteDetailPage() {
  const { loteId } = useParams()
  const navigate = useNavigate()
  const lote = useMemo(() => MOCK_LOTES.find(l => l.id === loteId), [loteId])
  const loteGuides = useMemo(() => MOCK_GUIDES.filter(g => g.loteId === loteId), [loteId])

  if (!lote) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Lote não encontrado</p></div>

  const stepIdx = STEPS.indexOf(lote.status)
  const pendingGuides = loteGuides.filter(g => ['pending_docs', 'pending_authorization'].includes(g.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{lote.number}</h1>
          <p className="text-sm text-muted-foreground">{lote.convenioName} · Competência: {lote.competencia}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1 gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${i <= stepIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
              <span className={`text-xs ${i <= stepIdx ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{STEP_LABELS[step]}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < stepIdx ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{lote.totalGuides}</p>
          <p className="text-xs text-muted-foreground">Total de guias</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">R$ {lote.totalValue.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">Valor total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-orange-600">{pendingGuides.length}</p>
          <p className="text-xs text-muted-foreground">Guias com pendência</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-bold text-foreground">{lote.protocolNumber || '—'}</p>
          <p className="text-xs text-muted-foreground">Protocolo</p>
        </div>
      </div>

      {/* Guides table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Guias do Lote</h3>
          <button className="text-xs text-primary hover:underline">+ Adicionar guias</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Nº Guia</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Paciente</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Procedimento</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loteGuides.map(g => (
                <tr key={g.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/app/faturamento/guias/${g.id}`)}>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{g.tissGuideNumber}</td>
                  <td className="px-4 py-2 text-foreground">{g.patientName}</td>
                  <td className="px-4 py-2 text-muted-foreground">{g.procedures[0]?.description}</td>
                  <td className="px-4 py-2 text-right font-medium text-foreground">R$ {g.totalValueSubmitted.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lote.status === 'open' && (
        <div className="flex gap-3">
          <button onClick={() => toast.success('Lote fechado com sucesso')} className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Fechar Lote</button>
          <button onClick={() => toast.info('XML TISS gerado')} className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Gerar XML TISS</button>
          <button onClick={() => toast.success('Lote marcado como enviado')} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Marcar como Enviado</button>
        </div>
      )}
    </div>
  )
}
