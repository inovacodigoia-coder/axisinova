import { Users, Calendar, DollarSign, TrendingUp, TrendingDown, Clock, Activity, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { AttendanceHeatmap } from '@/components/lab/dashboard/AttendanceHeatmap'
import { useCompanyDashboardData } from '@/hooks/useCompanyDashboardData'
import { LAB_STATUS_META } from '@/hooks/useLabDashboardMetrics'

export default function CompanyDashboard() {
  const { loading, stats, heatmap, heatmapZoom, setHeatmapZoom } = useCompanyDashboardData()

  const metrics = [
    {
      label: 'Atendimentos Hoje',
      value: stats.todayCount.toLocaleString('pt-BR'),
      change: stats.change,
      icon: Activity,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Pacientes Cadastrados',
      value: stats.patientsCount.toLocaleString('pt-BR'),
      change: null,
      icon: Users,
      color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
    },
    {
      label: 'Agenda da Semana',
      value: stats.weekAppointments.toLocaleString('pt-BR'),
      change: null,
      icon: Calendar,
      color: 'bg-secondary/10 text-secondary',
    },
    {
      label: 'Faturamento Mensal',
      value: stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      change: null,
      icon: DollarSign,
      color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
    },
  ]

  const hasWeekly = stats.weeklyChartData.some(d => d.atendimentos > 0)
  const hasRevenue = stats.monthlyRevenueData.some(d => d.valor > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua clínica</p>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              {m.change !== null && m.change !== undefined && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    m.change >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'
                  }`}
                >
                  {m.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {m.change > 0 ? '+' : ''}{m.change.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <AttendanceHeatmap
        columns={heatmap.columns}
        rows={heatmap.rows}
        max={heatmap.max}
        peak={heatmap.peak}
        zoom={heatmapZoom}
        onZoomChange={setHeatmapZoom}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-foreground mb-4">Atendimentos da Semana</h3>
          {hasWeekly ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="atendimentos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-xs text-muted-foreground">Nenhum atendimento registrado nesta semana.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento (Particular)</h3>
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }}
                  formatter={(v: number) => [v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Faturamento']}
                />
                <Line type="monotone" dataKey="valor" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: 'hsl(var(--secondary))' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-xs text-muted-foreground">Sem faturamento particular registrado nos últimos 6 meses.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Últimos Atendimentos</h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        {stats.recent.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            {loading ? 'Carregando atendimentos...' : 'Nenhum atendimento registrado ainda.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Data / Hora</th>
                  <th className="pb-3 font-medium">Paciente</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Médico</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Tipo</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recent.map((a, i) => {
                  const meta = LAB_STATUS_META[a.status]
                  return (
                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium text-foreground whitespace-nowrap">{a.time}</td>
                      <td className="py-3 text-foreground">{a.patient}</td>
                      <td className="py-3 text-muted-foreground hidden sm:table-cell">{a.doctor}</td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell">{a.type}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${meta ? `${meta.bg} ${meta.text}` : 'bg-muted text-muted-foreground'}`}>
                          {meta?.label || a.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
