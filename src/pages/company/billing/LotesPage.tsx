import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { useBillingContext } from '@/context/BillingContext'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

const LOTE_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Aberto', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  closed: { label: 'Fechado', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  submitted: { label: 'Enviado', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  processing: { label: 'Em Processamento', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  finished: { label: 'Finalizado', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
}

export default function LotesPage() {
  const navigate = useNavigate()
  const { lotes, guides, addLote, generateLoteNumber } = useBillingContext()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [selectedConvenio, setSelectedConvenio] = useState('')
  const [selectedGuides, setSelectedGuides] = useState<string[]>([])
  const [competencia, setCompetencia] = useState('')

  // Convênios with authorized guides not in any lote
  const eligibleConvenios = useMemo(() => {
    const ids = [...new Set(
      guides.filter(g => g.status === 'authorized' && !g.loteId).map(g => g.convenioName)
    )]
    return ids
  }, [guides])

  const eligibleGuides = useMemo(() => {
    return guides.filter(g =>
      g.status === 'authorized' && !g.loteId && g.convenioName === selectedConvenio
    )
  }, [guides, selectedConvenio])

  const handleCreateLote = () => {
    if (!selectedConvenio || selectedGuides.length === 0 || !competencia) {
      toast.error('Preencha todos os campos e selecione pelo menos uma guia')
      return
    }
    const conv = guides.find(g => g.convenioName === selectedConvenio)
    const totalValue = selectedGuides.reduce((sum, id) => {
      const g = guides.find(x => x.id === id)
      return sum + (g?.totalValueSubmitted || 0)
    }, 0)

    addLote({
      id: crypto.randomUUID(),
      companyId: user?.companyId || '',
      convenioId: conv?.convenioId || '',
      convenioName: selectedConvenio,
      number: generateLoteNumber(),
      competencia,
      status: 'open',
      guides: selectedGuides,
      totalGuides: selectedGuides.length,
      totalValue,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString(),
    })
    toast.success('Lote criado com sucesso!')
    setShowModal(false)
    setSelectedConvenio('')
    setSelectedGuides([])
    setCompetencia('')
  }

  if (lotes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lotes de Cobrança</h1>
            <p className="text-sm text-muted-foreground">Gerencie os lotes de faturamento</p>
          </div>
          {eligibleConvenios.length > 0 && (
            <GradientButton onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" /> Novo Lote</GradientButton>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Package className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lote criado ainda</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {eligibleConvenios.length > 0
              ? 'Crie um lote para agrupar guias e enviar para o convênio.'
              : 'Para criar um lote você precisa ter guias com status "Autorizada".'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lotes de Cobrança</h1>
          <p className="text-sm text-muted-foreground">{lotes.length} lotes</p>
        </div>
        <GradientButton onClick={() => setShowModal(true)} disabled={eligibleConvenios.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Novo Lote
        </GradientButton>
      </div>

      <div className="space-y-4">
        {lotes.map(l => {
          const sc = LOTE_STATUS[l.status] || LOTE_STATUS.open
          return (
            <div key={l.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/app/faturamento/lotes/${l.id}`)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-base font-bold text-foreground">{l.number}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">R$ {l.totalValue.toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{l.convenioName}</span>
                <span>·</span>
                <span>Comp.: {l.competencia}</span>
                <span>·</span>
                <span>{l.totalGuides} guias</span>
                {l.protocolNumber && <><span>·</span><span>Protocolo: {l.protocolNumber}</span></>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Lote Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">📦 Novo Lote de Cobrança</h2>

            {eligibleConvenios.length === 0 ? (
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-4 text-sm text-yellow-800 dark:text-yellow-400">
                ⚠️ Nenhuma guia autorizada disponível para criação de lote. Autorize as guias antes de criar um lote.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Convênio *</label>
                  <select value={selectedConvenio} onChange={e => { setSelectedConvenio(e.target.value); setSelectedGuides([]) }} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione o convênio</option>
                    {eligibleConvenios.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Competência * (MM/AAAA)</label>
                  <input value={competencia} onChange={e => setCompetencia(e.target.value)} placeholder="04/2026" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                {selectedConvenio && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Guias autorizadas ({eligibleGuides.length})</label>
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                      {eligibleGuides.map(g => (
                        <label key={g.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                          <input type="checkbox" checked={selectedGuides.includes(g.id)} onChange={e => {
                            setSelectedGuides(prev => e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id))
                          }} className="rounded border-input" />
                          <span className="text-foreground flex-1">{g.patientName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{g.tissGuideNumber}</span>
                          <span className="text-xs font-medium text-foreground">R$ {g.totalValueSubmitted.toLocaleString('pt-BR')}</span>
                        </label>
                      ))}
                    </div>
                    {selectedGuides.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedGuides.length} guias · Total: R$ {selectedGuides.reduce((sum, id) => sum + (guides.find(g => g.id === id)?.totalValueSubmitted || 0), 0).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={handleCreateLote} className="flex-1 rounded-lg gradient-bg text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">Criar Lote</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
