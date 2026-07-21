import { Building2, DollarSign, Users, ClipboardList, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { MetricCard } from '@/components/superadmin/MetricCard'
import { useSuperAdminStats } from '@/hooks/useSuperAdminStats'
import { MOCK_COMPANIES } from '@/mocks/superadmin.mock'
import { CompanyStatusBadge } from '@/components/superadmin/CompanyStatusBadge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useNavigate } from 'react-router-dom'

export default function SuperAdminDashboard() {
  const { metrics, monthlySignups, planDistribution, alerts } = useSuperAdminStats()
  const navigate = useNavigate()
  const [dbCompanies, setDbCompanies] = useState<any[]>([])

  useEffect(() => {
    async function fetchRecent() {
      const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false }).limit(5)
      if (data) setDbCompanies(data)
    }
    fetchRecent()
  }, [])

  const recentCompanies = useMemo(() => {
    if (dbCompanies.length > 0) {
      return dbCompanies.map(c => ({
        id: c.id,
        nomeFantasia: c.nome_fantasia || c.name,
        cnpj: c.cnpj,
        status: c.status || 'active',
        criadoEm: c.created_at
      }))
    }
    return [...MOCK_COMPANIES].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5)
  }, [dbCompanies])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard Geral</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total de Empresas Ativas" value={String(metrics.totalCompanies)} change={metrics.companiesGrowth} icon={Building2} iconBg="bg-primary/10" iconColor="text-primary" />
        <MetricCard title="MRR" value={`R$ ${metrics.mrr.toLocaleString('pt-BR')}`} change={metrics.mrrGrowth} icon={DollarSign} iconBg="bg-[hsl(var(--success))]/10" iconColor="text-[hsl(var(--success))]" />
        <MetricCard title="Usuários Ativos Hoje" value={String(metrics.activeUsersToday)} change={metrics.usersGrowth} icon={Users} iconBg="bg-secondary/10" iconColor="text-secondary" />
        <MetricCard title="Atendimentos 24h" value={metrics.attendancesLast24h.toLocaleString('pt-BR')} change={metrics.attendancesGrowth} icon={ClipboardList} iconBg="bg-[hsl(33,100%,50%)]/10" iconColor="text-[hsl(33,100%,50%)]" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Novas empresas por mês</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlySignups}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(191, 100%, 50%)" />
                  <stop offset="100%" stopColor="hsl(262, 92%, 56%)" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Distribuição por plano</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={4}>
                {planDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent companies + Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Empresas Recentes</h3>
          <div className="space-y-3">
            {recentCompanies.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.nomeFantasia}</p>
                  <p className="text-xs text-muted-foreground">{c.cnpj}</p>
                </div>
                <div className="flex items-center gap-3">
                  <CompanyStatusBadge status={c.status} trialDaysLeft={(c as any).trialDaysLeft} />
                  <button onClick={() => navigate(`/superadmin/empresas/${c.id}`)} className="text-xs font-medium text-primary hover:underline">
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Alertas do Sistema</h3>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${a.type === 'error' ? 'text-destructive' : a.type === 'warning' ? 'text-[hsl(var(--warning))]' : 'text-primary'}`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{a.message}</p>
                  {a.actionLabel && <button className="mt-1 text-xs font-medium text-primary hover:underline">{a.actionLabel}</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
