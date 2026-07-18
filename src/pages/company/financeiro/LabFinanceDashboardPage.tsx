import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Calendar,
  Filter,
  Download,
  DollarSign,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const BAR_DATA = [
  { name: 'Jan', faturado: 42000, recebido: 38000, glosado: 2100 },
  { name: 'Fev', faturado: 45000, recebido: 39000, glosado: 2500 },
  { name: 'Mar', faturado: 48000, recebido: 42000, glosado: 1800 },
  { name: 'Abr', faturado: 44000, recebido: 41000, glosado: 2200 },
  { name: 'Mai', faturado: 51000, recebido: 44000, glosado: 3100 },
  { name: 'Jun', faturado: 48320, recebido: 39840, glosado: 2450 },
];

const PIE_DATA = [
  { name: 'Unimed', value: 28450 },
  { name: 'Hapvida', value: 12800 },
  { name: 'Particular', value: 15200 },
  { name: 'SUS', value: 8200 },
  { name: 'Outros', value: 4500 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const LINE_DATA = [
  { name: 'Jan', inadimplencia: 4.2 },
  { name: 'Fev', inadimplencia: 3.8 },
  { name: 'Mar', inadimplencia: 4.5 },
  { name: 'Abr', inadimplencia: 3.2 },
  { name: 'Mai', inadimplencia: 4.8 },
  { name: 'Jun', inadimplencia: 4.1 },
];

export default function LabFinanceDashboardPage() {
  const [dateRange, setDateRange] = useState('Este Mês');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">quinta-feira, 16 de julho de 2026</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" /> {dateRange}
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Todos Convênios
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Faturamento do Mês</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold">R$ 48.320,00</h3>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">vs mês anterior</p>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recebido no Mês</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold">R$ 39.840,00</h3>
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +8%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Liquidez imediata</p>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">A Receber</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold">R$ 8.480,00</h3>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-[10px] text-muted-foreground italic">Em aberto</p>
        </Card>
        <Card className="p-4 space-y-2 border-destructive/20">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-destructive">Em Atraso</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-destructive">R$ 2.130,00</h3>
            <span className="text-xs font-medium text-destructive flex items-center gap-0.5">
              <TrendingDown className="h-3 w-3" /> -5%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Ações de cobrança pendentes</p>
        </Card>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-2 bg-muted/20">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Contas a Pagar (mês)</p>
          <h3 className="text-xl font-bold">R$ 12.400,00</h3>
        </Card>
        <Card className="p-4 space-y-2 bg-muted/20">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pago no Mês</p>
          <h3 className="text-xl font-bold">R$ 10.800,00</h3>
        </Card>
        <Card className="p-4 space-y-2 bg-muted/20">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">A Pagar</p>
          <h3 className="text-xl font-bold">R$ 1.600,00</h3>
        </Card>
        <Card className="p-4 space-y-2 bg-destructive/5 border-destructive/10">
          <p className="text-xs font-bold text-destructive uppercase tracking-wider">Despesas Vencidas</p>
          <h3 className="text-xl font-bold text-destructive">R$ 320,00</h3>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold mb-6">Faturado vs Recebido vs Glosado (6 meses)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BAR_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="faturado" fill="#00D4FF" radius={[4, 4, 0, 0]} name="Faturado" />
                <Bar dataKey="recebido" fill="#7B2FF7" radius={[4, 4, 0, 0]} name="Recebido" />
                <Bar dataKey="glosado" fill="#EF4444" radius={[4, 4, 0, 0]} name="Glosado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold mb-6">Distribuição por Convênio</h3>
            <div className="flex items-center gap-4">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={PIE_DATA}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {PIE_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {PIE_DATA.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-bold">R$ {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold mb-6">Evolução da Inadimplência (%)</h3>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LINE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} hide />
                  <YAxis fontSize={10} hide />
                  <Tooltip />
                  <Line type="monotone" dataKey="inadimplencia" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">Percentual do faturamento em atraso por mês</p>
          </Card>
        </div>
      </div>

      {/* Quick summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="text-sm font-bold">Próximos Pagamentos & Alertas</h3>
            <Button variant="ghost" size="sm" className="h-7 text-primary gap-1">
              Ver tudo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {[
              { desc: 'Reagentes EDTA', provider: 'Lab Suprimentos', due: 'Amanhã', value: 1200, status: 'warning', alert: 'In-app + Email' },
              { desc: 'Energia Elétrica', provider: 'COSERN', due: '20/07', value: 480, status: 'pending', alert: 'In-app' },
              { desc: 'Manutenção Equip.', provider: 'BioTech', due: '22/07', value: 850, status: 'pending', alert: 'In-app' },
              { desc: 'Internet Fibra', provider: 'Telecom', due: '25/07', value: 199, status: 'pending', alert: 'Email' },
            ].map((p, i) => (
              <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${p.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{p.desc}</p>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{p.alert}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">R$ {p.value.toLocaleString()}</p>
                  <p className={`text-[10px] font-medium ${p.status === 'warning' ? 'text-amber-600' : 'text-muted-foreground'}`}>{p.due}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="text-sm font-bold">Conciliação & Divergências</h3>
            <Badge variant="destructive" className="h-5 text-[10px]">4 pendências</Badge>
          </div>
          <div className="divide-y divide-border">
            {[
              { item: 'Unimed Natal', ref: 'LOTE-2025-001', value: 12450, received: 12000, diff: 450, type: 'Parcial' },
              { item: 'João da Silva', ref: 'REC-2026-042', value: 320, received: 300, diff: 20, type: 'Divergente' },
              { item: 'Hapvida', ref: 'LOTE-2024-088', value: 8200, received: 0, diff: 8200, type: 'Pendente' },
            ].map((f, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${f.received > 0 ? 'bg-amber-100 text-amber-600' : 'bg-destructive/10 text-destructive'}`}>
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{f.item}</p>
                    <p className="text-[10px] text-muted-foreground">{f.ref} • {f.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">R$ {f.value.toLocaleString()}</p>
                  <p className="text-[10px] font-medium text-destructive">Dif: R$ {f.diff.toLocaleString()}</p>
                </div>
              </div>
            ))}
            <div className="p-4 bg-muted/10 text-center">
              <Button variant="outline" size="sm" className="text-xs w-full">Abrir Tela de Conciliação</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
