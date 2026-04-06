import { useState, useMemo } from 'react'
import { Search, CheckCircle, FlaskConical, Filter } from 'lucide-react'
import { useBillingContext } from '@/context/BillingContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useAuth } from '@/context/AuthContext'
import type { ResultStatus } from '@/types/results.types'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<ResultStatus, { label: string; cls: string }> = {
  requested: { label: 'Solicitado', cls: 'bg-muted text-muted-foreground' },
  collected: { label: 'Coletado', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  in_analysis: { label: 'Em Análise', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  partial: { label: 'Parcial', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  available: { label: 'Disponível', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  delivered: { label: 'Entregue', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
}

export default function ResultsListPage() {
  const { results, deliverResult, generateProtocolNumber } = useBillingContext()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [deliveryModal, setDeliveryModal] = useState<string | null>(null)
  const [deliveryForm, setDeliveryForm] = useState({ deliveredTo: '' as 'patient' | 'responsible' | '', responsibleName: '', responsibleDoc: '', relationship: '', verifyMethod: '' })

  const filtered = useMemo(() => {
    return results.filter(r => {
      if (onlyAvailable && r.status !== 'available') return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (!r.patientName.toLowerCase().includes(s) && !(r.patientCpf || '').includes(s) && !r.patientMotherName.toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [search, statusFilter, onlyAvailable, results])

  const { visibleItems, hasMore, showMore, showAll, totalItems } = usePaginatedList(filtered, 10)
  const hasFilters = search || statusFilter !== 'all' || onlyAvailable

  const handleDelivery = () => {
    if (!deliveryForm.deliveredTo) { toast.error('Selecione o destinatário'); return }
    if (deliveryForm.deliveredTo === 'responsible' && (!deliveryForm.responsibleName || !deliveryForm.responsibleDoc)) {
      toast.error('Preencha nome e documento do responsável'); return
    }
    const result = results.find(r => r.id === deliveryModal)
    if (!result) return

    const toName = deliveryForm.deliveredTo === 'patient' ? result.patientName : deliveryForm.responsibleName
    deliverResult(result.id, deliveryForm.deliveredTo, toName, deliveryForm.responsibleDoc || '', user?.id || '')
    const protocol = generateProtocolNumber()
    toast.success(`Resultado entregue. Protocolo: ${protocol}`)
    setDeliveryModal(null)
    setDeliveryForm({ deliveredTo: '', responsibleName: '', responsibleDoc: '', relationship: '', verifyMethod: '' })
  }

  const result = deliveryModal ? results.find(r => r.id === deliveryModal) : null

  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrega de Resultados</h1>
          <p className="text-sm text-muted-foreground">Gerencie a entrega de resultados de exames</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <FlaskConical className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum resultado para entregar</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Os resultados aparecerão aqui quando os exames forem solicitados e processados durante os atendimentos médicos.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrega de Resultados</h1>
          <p className="text-sm text-muted-foreground">{results.length} resultados</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, CPF ou nome da mãe..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); if (e.target.value !== 'all') setOnlyAvailable(false) }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} className="rounded border-input" />
          Apenas disponíveis
        </label>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setOnlyAvailable(false) }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted">Limpar filtros</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhum resultado encontrado</h3>
          <p className="text-sm text-muted-foreground">Nenhum resultado corresponde aos filtros aplicados.</p>
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setOnlyAvailable(false) }} className="mt-3 text-sm text-primary hover:underline">Limpar filtros</button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Paciente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Exame</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Solicitado por</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Data Solic.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Previsão</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleItems.map(r => {
                    const sc = STATUS_CONFIG[r.status]
                    return (
                      <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-foreground font-medium">{r.patientName}</p>
                          <p className="text-xs text-muted-foreground">{r.patientCpf ? r.patientCpf.replace(/(\d{3})\.\d{3}\.\d{3}/, '$1.***.***') : '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{r.examName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.examCode}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{r.doctorName}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{new Date(r.requestedAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{r.expectedAt ? new Date(r.expectedAt).toLocaleDateString('pt-BR') : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.cls} ${r.status === 'available' ? 'animate-pulse' : ''}`} style={r.status === 'available' ? { animationDuration: '2s' } : undefined}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === 'available' && (
                            <button onClick={() => setDeliveryModal(r.id)} className="flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors">
                              <CheckCircle className="h-3.5 w-3.5" /> Entregar
                            </button>
                          )}
                          {r.status === 'delivered' && (
                            <span className="text-xs text-green-600 font-medium">
                              Entregue {r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('pt-BR') : ''}
                              {r.deliveryProtocolNumber && <> · {r.deliveryProtocolNumber}</>}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {hasMore && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Exibindo {visibleItems.length} de {totalItems} resultados</span>
              <div className="flex gap-2">
                <button onClick={showMore} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors">Mostrar mais 10</button>
                <button onClick={showAll} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors">Ver todos ({totalItems})</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delivery Modal */}
      {deliveryModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeliveryModal(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">📋 Protocolo de Entrega</h2>

            <div className="rounded-lg bg-muted p-4 mb-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Paciente:</span> <span className="text-foreground font-medium">{result.patientName}</span></p>
              <p><span className="text-muted-foreground">Exame:</span> <span className="text-foreground">{result.examName}</span></p>
              <p><span className="text-muted-foreground">Solicitado por:</span> <span className="text-foreground">{result.doctorName}</span></p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-2 block">Destinatário *</label>
              <div className="flex gap-3">
                <button onClick={() => setDeliveryForm(p => ({ ...p, deliveredTo: 'patient' }))} className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${deliveryForm.deliveredTo === 'patient' ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:bg-muted'}`}>
                  👤 Próprio paciente
                </button>
                <button onClick={() => setDeliveryForm(p => ({ ...p, deliveredTo: 'responsible' }))} className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${deliveryForm.deliveredTo === 'responsible' ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:bg-muted'}`}>
                  👥 Responsável
                </button>
              </div>
            </div>

            {deliveryForm.deliveredTo === 'responsible' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Nome completo *</label>
                  <input value={deliveryForm.responsibleName} onChange={e => setDeliveryForm(p => ({ ...p, responsibleName: e.target.value }))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Documento (RG/CPF) *</label>
                  <input value={deliveryForm.responsibleDoc} onChange={e => setDeliveryForm(p => ({ ...p, responsibleDoc: e.target.value }))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Parentesco</label>
                  <select value={deliveryForm.relationship} onChange={e => setDeliveryForm(p => ({ ...p, relationship: e.target.value }))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Selecione...</option>
                    <option value="conjuge">Cônjuge</option>
                    <option value="filho">Filho(a)</option>
                    <option value="pai_mae">Pai/Mãe</option>
                    <option value="irmao">Irmão/Irmã</option>
                    <option value="representante">Representante legal</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
            )}

            {deliveryForm.deliveredTo === 'patient' && (
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground">Verificação de identidade</label>
                <select value={deliveryForm.verifyMethod} onChange={e => setDeliveryForm(p => ({ ...p, verifyMethod: e.target.value }))} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  <option value="rg_cpf">RG/CPF apresentado</option>
                  <option value="reconhecimento">Reconhecimento pessoal</option>
                  <option value="carteirinha">Carteirinha do convênio</option>
                </select>
              </div>
            )}

            <div className="rounded-lg bg-muted border border-border p-4 mb-4 text-xs space-y-1 font-mono">
              <p className="font-bold text-foreground">PROTOCOLO DE ENTREGA Nº {generateProtocolNumber()}</p>
              <hr className="border-border" />
              <p>Exame: {result.examName}</p>
              <p>Paciente: {result.patientName}</p>
              <p>Data: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <hr className="border-border" />
              {deliveryForm.deliveredTo === 'patient' && <p>Entregue a: Próprio paciente</p>}
              {deliveryForm.deliveredTo === 'responsible' && <p>Entregue a: {deliveryForm.responsibleName || '___'} ({deliveryForm.relationship || '___'})</p>}
              {deliveryForm.responsibleDoc && <p>Documento: {deliveryForm.responsibleDoc}</p>}
              <hr className="border-border" />
              <p>Recepcionista: {user?.name || '—'}</p>
              <p>Unidade: {user?.companyName || '—'}</p>
              <p>Assinatura: ___________________________</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setDeliveryModal(null)} className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={handleDelivery} className="flex-1 rounded-lg gradient-bg text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">Registrar e Imprimir Protocolo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
