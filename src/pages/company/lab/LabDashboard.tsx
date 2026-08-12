import { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { useLabDashboardData } from '@/hooks/useLabDashboardData';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-500',
  waiting_collection: 'bg-amber-500/10 text-amber-500',
  collection_done: 'bg-emerald-500/10 text-emerald-500',
  completed: 'bg-emerald-500/10 text-emerald-500',
  waiting: 'bg-amber-500/10 text-amber-500',
  pending: 'bg-slate-500/10 text-slate-500',
};

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  waiting_collection: 'Aguardando Coleta',
  collection_done: 'Coleta Realizada',
  completed: 'Concluído',
  waiting: 'Aguardando',
  pending: 'Pendente',
};

const metricIcons = {
  today: Activity,
  patients: Users,
  agenda: Calendar,
  revenue: DollarSign,
};

const metricColors = {
  today: 'bg-blue-500/10 text-blue-500',
  patients: 'bg-emerald-500/10 text-emerald-500',
  agenda: 'bg-purple-500/10 text-purple-500',
  revenue: 'bg-amber-500/10 text-amber-500',
};

  /* Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.
                                        
                                            
                                            I have approved the plan */
export default function LabDashboard() {
  const { stats, loading } = useLabDashboardData();
  const navigate = useNavigate();

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] rounded-2xl" />
          <Skeleton className="h-[300px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Laboratorial</h1>
          <p className="text-sm text-muted-foreground">Visão geral da operação técnica e financeira</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/app/recepcao/cadastro-direto')} className="gradient-bg border-none">
            <Plus className="h-4 w-4 mr-2" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.metrics.map((m) => {
          const Icon = metricIcons[m.type as keyof typeof metricIcons];
          const colorClass = metricColors[m.type as keyof typeof metricColors];
          
          return (
            <div key={m.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> {m.change}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-foreground">Atendimentos da Semana</h3>
            <Badge variant="outline" className="text-[10px] font-normal">Últimos 7 dias</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                contentStyle={{ 
                  borderRadius: 12, 
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
              />
              <Bar dataKey="atendimentos" radius={[6, 6, 0, 0]}>
                {stats.weeklyChartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === stats.weeklyChartData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.6)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-foreground">Faturamento Mensal (Lab)</h3>
            <Badge variant="outline" className="text-[10px] font-normal">Semestre</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: 12, 
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--card))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }} 
                formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']} 
              />
              <Line 
                type="monotone" 
                dataKey="valor" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={3} 
                dot={{ fill: 'hsl(var(--secondary))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Atendimentos Pendentes</h3>
            <p className="text-xs text-muted-foreground">Aguardando início ou coleta</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/lab/coleta')} className="text-primary hover:text-primary hover:bg-primary/10">
            Ver Fila de Coleta <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="pb-3 font-semibold">Horário</th>
                <th className="pb-3 font-semibold">Paciente</th>
                <th className="pb-3 font-semibold hidden sm:table-cell">Solicitante</th>
                <th className="pb-3 font-semibold hidden md:table-cell">Setor</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.upcoming.length > 0 ? (
                stats.upcoming.map((a, i) => (
                  <tr key={i} className="group hover:bg-muted/30 transition-colors">
                    <td className="py-4 font-medium text-foreground">{a.time}</td>
                    <td className="py-4">
                      <div className="font-medium text-foreground">{a.patient}</div>
                    </td>
                    <td className="py-4 text-muted-foreground hidden sm:table-cell">{a.doctor}</td>
                    <td className="py-4 text-muted-foreground hidden md:table-cell">{a.type}</td>
                    <td className="py-4">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        statusColors[a.status] || 'bg-slate-500/10 text-slate-500'
                      )}>
                        {statusLabels[a.status] || a.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum atendimento pendente para hoje.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
