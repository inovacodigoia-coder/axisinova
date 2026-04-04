import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, FileText, AlertTriangle, TrendingUp, CheckCircle, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { MOCK_GUIDES, MOCK_GLOSAS, MOCK_LOTES } from '@/mocks/billing.mock'
import type { GuideStatus } from '@/types/billing.types'

const GUIDE_STATUS_CONFIG: Record<GuideStatus, { label: string; cls: string }> = {
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

export default function BillingDashboardPage() {
  const navigate = useNavigate()
  const guides = MOCK_GUIDES
  const glosas = MOCK_GLOSAS
  const lotes = MOCK_LOTES

  const pendingGlosas = useMemo(() => glosas.filter(g => g.status === 'pending' || g.status === 'in_analysis'), [glosas])
  const totalGlosaValue = useMemo(() => pendingGlosas.reduce((s, g) => s + g.value, 0), [pendingGlosas])
  const urgentGlosas = useMemo(() => {
    const now = new Date()
    return pendingGlosas.filter(g => {
      if (!g.recursoDeadline) return false
      const diff = (new Date(g.recursoDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diff < 7
    })
  }, [pendingGlosas])

  const submitted = useMemo(() => guides.filter(g => ['submitted', 'processing', 'paid', 'partial_glosa', 'total_glosa'].includes(g.status)).reduce((s, g) => s + g.totalValueSubmitted, 0), [guides])
  const received = useMemo(() => guides.filter(g => g.status === 'paid').reduce((s, g) => s + (g.totalValueApproved || 0), 0), [guides])
  const glosaTotal = useMemo(() => guides.reduce((s, g) => s + (g.totalValueGlosa || 0), 0), [guides])
  const glosaRate = submitted > 0 ? ((glosaTotal / submitted) * 100) : 0
  const pendingGuides = useMemo(() => guides.filter(g => ['draft', 'pending_docs', 'pending_authorization'].includes(g.status)), [guides])

  const barData = [
    { month: 'Out', faturado: 12400, recebido: 11800, glosado: 600 },
    { month: 'Nov', faturado: 9800, recebido: 9200, glosado: 600 },
    { month: 'Dez', faturado: 14200, recebido: 13000, glosado: 1200 },
    { month: 'Jan', faturado: 11500, recebido: 10800, glosado: 700 },
    { month: 'Fev', faturado: 8200, recebido: 7600, glosado: 600 },
    { month: 'Mar', faturado: submitted, recebido: received, glosado: glosaTotal },
  ]

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {}
    guides.forEach(g => { counts[g.status] = (counts[g.status] || 0) + 1 })
    return Object.entries(counts).map(([status, value]) => ({
      name: GUIDE_STATUS_CONFIG[status as GuideStatus]?.label || status,
      value,
    }))
  }, [guides])

  const PIE_COLORS = ['hsl(var(--muted-foreground))', 'hsl(45,93%,47%)', 'hsl(24,95%,53%)', 'hsl(217,91%,60%)', 'hsl(271,91%,65%)', 'hsl(199,89%,48%)', 'hsl(142,71%,45%)', 'hsl(24,100%,50%)', 'hsl(0,84%,60%)', 'hsl(0,72%,51%)', 'hsl(215,14%,34%)']

  const metrics = [
    { label: 'Faturado no Mês', value: `R$ ${submitted.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Recebido no Mês', value: `R$ ${received.toLocaleString('pt-BR')}`, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Glosas do Mês', value: `R$ ${glosaTotal.toLocaleString('pt-BR')}`, icon: AlertTriangle, color: glosaRate > 5 ? 'text-destructive' : 'text-yellow-600' },
    { label: 'Taxa de Glosa', value: `${glosaRate.toFixed(1)}%`, icon: TrendingUp, color: glosaRate > 8 ? 'text-destructive' : glosaRate > 3 ? 'text-yellow-600' : 'text-green-600' },
    { label: 'Guias Pendentes', value: String(pendingGuides.length), icon: FileText, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Glosa Alert Banner */}
      {pendingGlosas.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-destructive bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">
            Você tem <strong>{pendingGlosas.length} glosas pendentes</strong> totalizando <strong>R$ {totalGlosaValue.toLocaleString('pt-BR')}</strong>
            {urgentGlosas.length > 0 && <> · <strong>{urgentGlosas.length} com prazo de recurso vencendo em menos de 7 dias</strong></>}
          </p>
          <button onClick={() => navigate('/app/faturamento/glosas')} className="shrink-0 text-sm font-medium text-destructive underline hover:no-underline">Ver glosas agora</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
          <p className="text-sm text-muted-foreground">Painel geral de faturamento e cobrança</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <m.icon className={`h-5 w-5 ${m.color}`} />
            <p className="mt-2 text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento vs Recebido (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-muted-foreground" tick={{ fontSize: 12 }} />
              <YAxis className="text-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
              <Bar dataKey="faturado" fill="hsl(var(--primary))" name="Faturado" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recebido" fill="hsl(142,71%,45%)" name="Recebido" radius={[4, 4, 0, 0]} />
              <Bar dataKey="glosado" fill="hsl(0,84%,60%)" name="Glosado" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Guias por Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending guides & open lotes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Guias Pendentes</h3>
            <button onClick={() => navigate('/app/faturamento/guias')} className="text-xs text-primary hover:underline">Ver todas</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingGuides.slice(0, 8).map(g => {
              const sc = GUIDE_STATUS_CONFIG[g.status]
              const daysOpen = Math.floor((Date.now() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={g.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/app/faturamento/guias/${g.id}`)}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{g.patientName}</p>
                    <p className="text-xs text-muted-foreground">{g.convenioName} · {g.tissGuideNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{daysOpen}d</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Lotes em Aberto</h3>
            <button onClick={() => navigate('/app/faturamento/lotes')} className="text-xs text-primary hover:underline">Ver todos</button>
          </div>
          <div className="space-y-2">
            {lotes.filter(l => l.status !== 'finished').map(l => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/app/faturamento/lotes/${l.id}`)}>
                <div>
                  <p className="text-sm font-medium text-foreground">{l.number} · {l.convenioName}</p>
                  <p className="text-xs text-muted-foreground">Competência: {l.competencia} · {l.totalGuides} guias</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">R$ {l.totalValue.toLocaleString('pt-BR')}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${l.status === 'open' ? 'bg-blue-100 text-blue-800' : l.status === 'submitted' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {l.status === 'open' ? 'Aberto' : l.status === 'submitted' ? 'Enviado' : l.status === 'closed' ? 'Fechado' : l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
