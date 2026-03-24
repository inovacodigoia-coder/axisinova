import { useState } from 'react'
import { DollarSign, FileText, Download, Filter, TrendingUp, AlertTriangle, CheckCircle, Clock, Send } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { SearchInput } from '@/components/ui/SearchInput'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const metrics = [
  { label: 'Faturamento TISS Mensal', value: 'R$ 145.800', icon: DollarSign, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  { label: 'Guias Enviadas', value: '342', icon: Send, color: 'bg-primary/10 text-primary' },
  { label: 'Guias Aprovadas', value: '298', icon: CheckCircle, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  { label: 'Guias com Glosa', value: '18', icon: AlertTriangle, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
]

const pieData = [
  { name: 'Aprovadas', value: 298, color: 'hsl(var(--success))' },
  { name: 'Pendentes', value: 26, color: 'hsl(var(--warning))' },
  { name: 'Glosadas', value: 18, color: 'hsl(var(--destructive))' },
]

type GuideStatus = 'approved' | 'pending' | 'rejected' | 'sent'

interface TissGuide {
  id: string; number: string; patient: string; procedure: string; operator: string
  value: number; sentDate: string; status: GuideStatus; glosaReason?: string
}

const mockGuides: TissGuide[] = [
  { id: '1', number: 'TISS-2026-001542', patient: 'Maria Silva', procedure: 'Consulta Médica - Clínico Geral', operator: 'Unimed', value: 250, sentDate: '22/03/2026', status: 'approved' },
  { id: '2', number: 'TISS-2026-001543', patient: 'João Santos', procedure: 'Ultrassonografia Abdominal', operator: 'Bradesco Saúde', value: 480, sentDate: '22/03/2026', status: 'approved' },
  { id: '3', number: 'TISS-2026-001544', patient: 'Ana Oliveira', procedure: 'Ressonância Magnética Lombar', operator: 'SulAmérica', value: 1200, sentDate: '21/03/2026', status: 'pending' },
  { id: '4', number: 'TISS-2026-001545', patient: 'Pedro Costa', procedure: 'Eletrocardiograma', operator: 'Amil', value: 180, sentDate: '20/03/2026', status: 'rejected', glosaReason: 'Código do procedimento divergente' },
  { id: '5', number: 'TISS-2026-001546', patient: 'Lucia Ferreira', procedure: 'Hemograma Completo', operator: 'Unimed', value: 85, sentDate: '20/03/2026', status: 'sent' },
  { id: '6', number: 'TISS-2026-001547', patient: 'Carlos Almeida', procedure: 'Raio-X Tórax', operator: 'Bradesco Saúde', value: 150, sentDate: '19/03/2026', status: 'approved' },
  { id: '7', number: 'TISS-2026-001548', patient: 'Fernanda Lima', procedure: 'Consulta Médica - Cardiologia', operator: 'SulAmérica', value: 350, sentDate: '19/03/2026', status: 'rejected', glosaReason: 'Prazo de envio excedido' },
]

const statusConfig: Record<GuideStatus, { label: string; class: string }> = {
  approved: { label: 'Aprovada', class: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
  pending: { label: 'Pendente', class: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  rejected: { label: 'Glosada', class: 'bg-destructive/10 text-destructive' },
  sent: { label: 'Enviada', class: 'bg-primary/10 text-primary' },
}

export default function BillingTissPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = mockGuides.filter((g) => {
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    if (search && !g.patient.toLowerCase().includes(search.toLowerCase()) && !g.number.includes(search)) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento TISS</h1>
          <p className="text-sm text-muted-foreground">Gestão de guias e faturamento de convênios</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Exportar XML
          </button>
          <GradientButton><FileText className="h-4 w-4 mr-2" /> Nova Guia TISS</GradientButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="w-full sm:w-64">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar guia ou paciente..." />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="approved">Aprovadas</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Glosadas</option>
              <option value="sent">Enviadas</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Nº Guia</th>
                  <th className="pb-3 font-medium">Paciente</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Procedimento</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Operadora</th>
                  <th className="pb-3 font-medium">Valor</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-mono text-xs text-foreground">{g.number}</td>
                    <td className="py-3 text-foreground">{g.patient}</td>
                    <td className="py-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">{g.procedure}</td>
                    <td className="py-3 text-muted-foreground hidden lg:table-cell">{g.operator}</td>
                    <td className="py-3 font-medium text-foreground">R$ {g.value.toLocaleString('pt-BR')}</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusConfig[g.status].class}`}>
                        {statusConfig[g.status].label}
                      </span>
                      {g.glosaReason && <p className="text-[10px] text-destructive mt-0.5">{g.glosaReason}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Guias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
