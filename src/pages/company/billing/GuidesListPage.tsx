import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Zap, Search } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { MOCK_GUIDES } from '@/mocks/billing.mock'
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [convenioFilter, setConvenioFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return MOCK_GUIDES.filter(g => {
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      if (convenioFilter !== 'all' && g.convenioId !== convenioFilter) return false
      if (typeFilter !== 'all' && g.type !== typeFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (!g.patientName.toLowerCase().includes(s) && !g.tissGuideNumber?.toLowerCase().includes(s) && !g.convenioCardNumber.includes(s)) return false
      }
      return true
    })
  }, [search, statusFilter, convenioFilter, typeFilter])

  const convenios = useMemo(() => [...new Set(MOCK_GUIDES.map(g => g.convenioId))].map(id => {
    const g = MOCK_GUIDES.find(x => x.convenioId === id)!
    return { id, name: g.convenioName }
  }), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guias de Faturamento</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} guias encontradas</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Plus className="h-4 w-4" /> Nova Guia Manual
          </button>
          <GradientButton><Zap className="h-4 w-4 mr-2" /> Gerar Guias do Dia</GradientButton>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente, nº guia, carteirinha..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={convenioFilter} onChange={e => setConvenioFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos Convênios</option>
          {convenios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os Tipos</option>
          <option value="consultation">Consulta</option>
          <option value="sadt">SADT</option>
          <option value="hospitalization">Internação</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Guia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Convênio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Médico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Lote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(g => {
                const sc = STATUS_CONFIG[g.status]
                return (
                  <tr key={g.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/app/faturamento/guias/${g.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-foreground">{g.tissGuideNumber}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{g.type === 'consultation' ? 'Consulta' : g.type === 'sadt' ? 'SADT' : g.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{g.patientName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(g.patientBirthDate).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-foreground">{g.convenioName}</p>
                      <p className="text-xs text-muted-foreground">{g.convenioCardNumber || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{g.doctorName}</td>
                    <td className="px-4 py-3 font-medium text-foreground">R$ {g.totalValueSubmitted.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{g.loteId ? MOCK_GUIDES.find(x => x.loteId === g.loteId)?.loteId : 'Sem lote'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
