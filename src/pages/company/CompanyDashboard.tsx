import { BarChart3, Users, Calendar, DollarSign, TrendingUp, Clock, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const metrics = [
  { label: 'Atendimentos Hoje', value: '24', change: '+12%', icon: Activity, color: 'bg-primary/10 text-primary' },
  { label: 'Pacientes Ativos', value: '1.847', change: '+5%', icon: Users, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  { label: 'Agenda da Semana', value: '156', change: '+8%', icon: Calendar, color: 'bg-secondary/10 text-secondary' },
  { label: 'Faturamento Mensal', value: 'R$ 87.500', change: '+15%', icon: DollarSign, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
]

const weeklyData = [
  { day: 'Seg', atendimentos: 32 },
  { day: 'Ter', atendimentos: 28 },
  { day: 'Qua', atendimentos: 45 },
  { day: 'Qui', atendimentos: 38 },
  { day: 'Sex', atendimentos: 41 },
  { day: 'Sáb', atendimentos: 15 },
]

const monthlyRevenue = [
  { month: 'Jan', valor: 72000 },
  { month: 'Fev', valor: 75000 },
  { month: 'Mar', valor: 78500 },
  { month: 'Abr', valor: 82000 },
  { month: 'Mai', valor: 85000 },
  { month: 'Jun', valor: 87500 },
]

const upcomingAppointments = [
  { time: '08:00', patient: 'Maria Silva', doctor: 'Dr. Carlos', type: 'Consulta', status: 'confirmed' },
  { time: '08:30', patient: 'João Santos', doctor: 'Dra. Ana', type: 'Retorno', status: 'confirmed' },
  { time: '09:00', patient: 'Pedro Oliveira', doctor: 'Dr. Carlos', type: 'Exame', status: 'waiting' },
  { time: '09:30', patient: 'Ana Costa', doctor: 'Dr. Roberto', type: 'Consulta', status: 'confirmed' },
  { time: '10:00', patient: 'Lucia Ferreira', doctor: 'Dra. Ana', type: 'Primeira vez', status: 'pending' },
]

const statusColors: Record<string, string> = {
  confirmed: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  waiting: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
  pending: 'bg-muted text-muted-foreground',
}

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  waiting: 'Aguardando',
  pending: 'Pendente',
}

export default function CompanyDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua clínica</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--success))]">
                <TrendingUp className="h-3 w-3" /> {m.change}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-foreground mb-4">Atendimentos da Semana</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="atendimentos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento Mensal</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Faturamento']} />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: 'hsl(var(--secondary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Próximos Agendamentos</h3>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-3 font-medium">Horário</th>
                <th className="pb-3 font-medium">Paciente</th>
                <th className="pb-3 font-medium hidden sm:table-cell">Médico</th>
                <th className="pb-3 font-medium hidden md:table-cell">Tipo</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {upcomingAppointments.map((a, i) => (
                <tr key={i} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 font-medium text-foreground">{a.time}</td>
                  <td className="py-3 text-foreground">{a.patient}</td>
                  <td className="py-3 text-muted-foreground hidden sm:table-cell">{a.doctor}</td>
                  <td className="py-3 text-muted-foreground hidden md:table-cell">{a.type}</td>
                  <td className="py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[a.status]}`}>
                      {statusLabels[a.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
