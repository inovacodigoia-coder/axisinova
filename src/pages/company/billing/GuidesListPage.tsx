import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Filter } from 'lucide-react'
import { useBillingContext } from '@/context/BillingContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import type { GuideStatus } from '@/types/billing.types'

const STATUS_CONFIG: Record<GuideStatus, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-muted text-muted-foreground' },
  pending_docs: { label: 'Ag. Documentos', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  pending_authorization: { label: 'Ag. Autorização', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  authorized: { label: 'Autorizada', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  submitted: { label: 'Enviada', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  processing: { label: 'Processando', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  paid: { label: 'Paga', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  partial_glosa: { label: 'Glosa Parcial', cls: 'bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300' },
  total_glosa: { label: 'Glosa Total', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  returned_reception: { label: 'Devolvida', cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

export default function GuidesListPage() {
  const navigate = useNavigate()
  const { guides } = useBillingContext()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [convenioFilter, setConvenioFilter] = useState('all')

  const convenios = useMemo(() => {
    const names = [...new Set(guides.map(g => g.convenioName))].sort()
    return names
  }, [guides])

  const filtered = useMemo(() => {
    return guides.filter(g => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      if (convenioFilter !== 'all' && g.convenioName !== convenioFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (!g.patientName.toLowerCase().includes(s) && !g.tissGuideNumber.toLowerCase().includes(s) && !g.doctorName.toLowerCase().includes(s)) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [guides, search, statusFilter, convenioFilter])

  const { visibleItems, hasMore, showMore, showAll, totalItems, remainingCount } = usePaginatedList(filtered, 10)
  const hasFilters = search || statusFilter !== 'all' || convenioFilter !== 'all'

  if (guides.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guias de Faturamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie as guias TISS de faturamento</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <FileText className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma guia de faturamento</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            As guias serão criadas automaticamente após a finalização de atendimentos médicos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Guias de Faturamento</h1>
        <p className="text-sm text-muted-foreground">{guides.length} guias no total</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente, guia ou médico..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={convenioFilter} onChange={e => setConvenioFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os Convênios</option>
          {convenios.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setConvenioFilter('all') }} className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-muted transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma guia encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {hasFilters ? 'Nenhuma guia corresponde aos filtros aplicados.' : 'As guias serão criadas automaticamente após os atendimentos.'}
          </p>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setConvenioFilter('all') }} className="mt-3 text-sm text-primary hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Nº Guia</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Paciente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Convênio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Médico</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Data Atend.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleItems.map(g => {
                    const sc = STATUS_CONFIG[g.status]
                    return (
                      <tr key={g.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/app/faturamento/guias/${g.id}`)}>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">{g.tissGuideNumber}</td>
                        <td className="px-4 py-3 text-foreground font-medium">{g.patientName}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{g.convenioName}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{g.doctorName}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{new Date(g.attendanceDate).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">R$ {g.totalValueSubmitted.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
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
              <span>Exibindo {visibleItems.length} de {totalItems} guias</span>
              <div className="flex gap-2">
                <button onClick={showMore} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                  Mostrar mais 10
                </button>
                <button onClick={showAll} className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors">
                  Ver todas ({totalItems})
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
