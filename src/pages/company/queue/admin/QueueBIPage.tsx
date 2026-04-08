import { useState } from 'react'
import { format } from 'date-fns'
import { Ticket, CheckCircle, XCircle, Clock } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts'
import { useQueueBI } from '@/hooks/useQueueBI'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { cn } from '@/lib/utils'

const COLORS = ['hsl(191,100%,50%)', 'hsl(262,92%,56%)', 'hsl(145,63%,42%)', 'hsl(43,74%,49%)', 'hsl(0,72%,51%)']

export default function QueueBIPage() {
  const { state } = useQueueSystem()
  const [unitId, setUnitId] = useState('all')
  const data = useQueueBI(unitId === 'all' ? undefined : unitId)

  const kpis = [
    { label: 'Fichas Geradas', value: data.totals.generated, icon: Ticket, color: 'text-primary' },
    { label: 'Fichas Atendidas', value: data.totals.attended, icon: CheckCircle, color: 'text-[hsl(var(--success))]' },
    { label: 'Fichas Abandonadas', value: data.totals.abandoned, icon: XCircle, color: 'text-destructive' },
    { label: 'Tempo Médio de Espera', value: `${data.totals.avgWaitMinutes} min`, icon: Clock, color: 'text-secondary' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-foreground">Dashboard de Atendimento (BI)</h1>
        <div className="flex items-center gap-3">
          <select value={unitId} onChange={e => setUnitId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Todas as unidades</option>
            {state.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <k.icon className={cn('h-5 w-5', k.color)} />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Fichas por Dia</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.dailyStats.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => format(new Date(v), 'dd/MM')} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="generated" name="Geradas" fill="hsl(191,100%,50%)" radius={[4,4,0,0]} />
              <Bar dataKey="attended" name="Atendidas" fill="hsl(145,63%,42%)" radius={[4,4,0,0]} />
              <Bar dataKey="abandoned" name="Abandonadas" fill="hsl(0,72%,51%)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Média de Atendimentos</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.dailyStats.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => format(new Date(v), 'dd/MM')} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="attended" stroke="hsl(191,100%,50%)" fill="hsl(191,100%,50%)" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Tempo Médio de Espera por Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.dailyStats.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => format(new Date(v), 'dd/MM')} />
              <YAxis tick={{ fontSize: 10 }} unit=" min" />
              <Tooltip />
              <Area type="monotone" dataKey="avgWaitMinutes" stroke="hsl(262,92%,56%)" fill="hsl(262,92%,56%)" fillOpacity={0.15} name="Tempo médio" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {unitId === 'all' && data.unitMetrics.length > 1 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold text-foreground mb-4">Distribuição por Unidade</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.unitMetrics} dataKey="generated" nameKey="unitName" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {data.unitMetrics.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-4">Classificação de Atendentes</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-muted-foreground font-medium">Posição</th>
              <th className="px-4 py-2 text-left text-muted-foreground font-medium">Atendente</th>
              <th className="px-4 py-2 text-left text-muted-foreground font-medium">Unidade</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">Fichas Atendidas</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">Tempo Médio</th>
              <th className="px-4 py-2 text-right text-muted-foreground font-medium">Finalizadas</th>
            </tr>
          </thead>
          <tbody>
            {data.attendants.map((a, i) => (
              <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-2 text-foreground">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                <td className="px-4 py-2 text-foreground font-medium">{a.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.unitName}</td>
                <td className="px-4 py-2 text-right text-foreground">{a.ticketsAttended}</td>
                <td className="px-4 py-2 text-right text-foreground">{a.avgTimeMinutes} min</td>
                <td className="px-4 py-2 text-right text-foreground">{a.ticketsFinalized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unit Metrics */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4">Métricas por Unidade</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.unitMetrics.map(u => (
            <div key={u.unitId} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h4 className="text-sm font-bold text-foreground">🏢 {u.unitName}</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Geradas: {u.generated} &nbsp; Atendidas: {u.attended} ({u.efficiency}%)</p>
                <p>Abandonadas: {u.abandoned} ({100 - u.efficiency}%)</p>
                <p>Tempo médio: {u.avgWaitMinutes} min</p>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', u.efficiency >= 90 ? 'bg-[hsl(var(--success))]' : u.efficiency >= 70 ? 'bg-[hsl(var(--warning))]' : 'bg-destructive')}
                  style={{ width: `${u.efficiency}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{u.efficiency}% eficiência</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
