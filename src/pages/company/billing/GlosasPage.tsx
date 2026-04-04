import { useState, useMemo } from 'react'
import { AlertTriangle, Search, FileSearch, Send, CheckCircle, XCircle } from 'lucide-react'
import { MOCK_GLOSAS } from '@/mocks/billing.mock'
import type { GlosaStatus, GlosaType } from '@/types/billing.types'
import { toast } from 'sonner'

const TYPE_LABELS: Record<GlosaType, string> = {
  technical: 'Técnica', administrative: 'Administrativa', authorization: 'Autorização', duplicate: 'Duplicidade', value: 'Valor',
}
const STATUS_CONFIG: Record<GlosaStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
  in_analysis: { label: 'Em Análise', cls: 'bg-blue-100 text-blue-800' },
  recurso_submitted: { label: 'Recurso Enviado', cls: 'bg-purple-100 text-purple-800' },
  accepted: { label: 'Aceita', cls: 'bg-red-100 text-red-800' },
  reversed: { label: 'Revertida', cls: 'bg-green-100 text-green-800' },
  partial_reversed: { label: 'Rev. Parcial', cls: 'bg-orange-100 text-orange-800' },
}

export default function GlosasPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [recursoGuideId, setRecursoGuideId] = useState<string | null>(null)
  const [recursoText, setRecursoText] = useState('')

  const glosas = MOCK_GLOSAS
  const filtered = useMemo(() => glosas.filter(g => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    if (search && !g.patientName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [glosas, search, statusFilter])

  const totalPending = useMemo(() => glosas.filter(g => g.status === 'pending' || g.status === 'in_analysis').reduce((s, g) => s + g.value, 0), [glosas])
  const totalRecurso = useMemo(() => glosas.filter(g => g.status === 'recurso_submitted').reduce((s, g) => s + g.value, 0), [glosas])
  const totalReversed = useMemo(() => glosas.filter(g => g.status === 'reversed' || g.status === 'partial_reversed').reduce((s, g) => s + (g.recoveredValue || 0), 0), [glosas])
  const reversalRate = glosas.length > 0 ? ((glosas.filter(g => g.status === 'reversed').length / glosas.length) * 100) : 0

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Glosas</h1>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-yellow-600">R$ {totalPending.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">Total pendente</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-purple-600">R$ {totalRecurso.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">Em recurso</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-green-600">R$ {totalReversed.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">Revertido este mês</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xl font-bold text-foreground">{reversalRate.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">Taxa de reversão</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..." className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="all">Todos os Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Glosa Cards */}
      <div className="space-y-4">
        {filtered.map(g => {
          const sc = STATUS_CONFIG[g.status]
          const days = getDaysRemaining(g.recursoDeadline)
          const deadlineColor = days === null ? 'text-muted-foreground' : days < 8 ? 'text-destructive' : days < 15 ? 'text-yellow-600' : 'text-green-600'
          const isUrgent = days !== null && days < 8

          return (
            <div key={g.id} className={`rounded-2xl border bg-card p-6 shadow-sm ${isUrgent ? 'border-destructive/50 animate-pulse' : 'border-border'}`} style={isUrgent ? { animationDuration: '3s' } : undefined}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${g.type === 'technical' ? 'text-orange-600' : g.type === 'administrative' ? 'text-yellow-600' : 'text-red-600'}`} />
                  <span className="text-sm font-bold text-foreground">GLOSA {TYPE_LABELS[g.type].toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-destructive">R$ {g.value.toLocaleString('pt-BR')}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                </div>
              </div>

              <div className="text-sm space-y-1 mb-3">
                <p className="text-muted-foreground">Guia: <span className="text-foreground">{g.guideId}</span> · {g.convenioName}</p>
                <p className="text-muted-foreground">Paciente: <span className="text-foreground font-medium">{g.patientName}</span></p>
              </div>

              <div className="rounded-lg bg-muted p-3 mb-3">
                <p className="text-sm text-foreground">Motivo: "{g.reason}"</p>
              </div>

              {g.recursoDeadline && (
                <p className={`text-xs mb-3 ${deadlineColor} font-medium`}>
                  📅 Prazo para recurso: {new Date(g.recursoDeadline).toLocaleDateString('pt-BR')} ({days} dias restantes)
                </p>
              )}

              <div className="flex gap-2 pt-3 border-t border-border">
                <button className="flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"><FileSearch className="h-3.5 w-3.5" /> Analisar</button>
                <button onClick={() => { setRecursoGuideId(g.id); setRecursoText('') }} className="flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"><Send className="h-3.5 w-3.5" /> Enviar Recurso</button>
                <button onClick={() => toast.info('Glosa aceita')} className="flex items-center gap-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"><CheckCircle className="h-3.5 w-3.5" /> Aceitar</button>
              </div>

              {/* Recurso inline */}
              {recursoGuideId === g.id && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Enviar Recurso</h4>
                  <textarea value={recursoText} onChange={e => setRecursoText(e.target.value)} placeholder="Fundamentação do recurso (mínimo 200 caracteres)..." className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{recursoText.length}/200 caracteres</span>
                    <div className="flex gap-2">
                      <button onClick={() => setRecursoGuideId(null)} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-muted transition-colors">Cancelar</button>
                      <button onClick={() => { toast.success('Recurso registrado'); setRecursoGuideId(null) }} disabled={recursoText.length < 200} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">Registrar Recurso</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
