import { useState } from 'react'
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  TrendingUp,
  History,
  FileBarChart,
  Warehouse
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const MOCK_DATA = [
  { day: '01/07', entradas: 45, saidas: 32 },
  { day: '05/07', entradas: 12, saidas: 58 },
  { day: '10/07', entradas: 85, saidas: 41 },
  { day: '15/07', entradas: 30, saidas: 72 },
  { day: '20/07', entradas: 65, saidas: 28 },
  { day: '25/07', entradas: 40, saidas: 55 },
  { day: '30/07', entradas: 95, saidas: 62 },
]

const EXPIRING_LOTS = [
  { item: 'Reagente Glicose', lote: 'L2025-001', validade: '30/08/2026', dias: 45, qtd: '12 unidades' },
  { item: 'Tiras de Urina', lote: 'L2025-008', validade: '15/08/2026', dias: 30, qtd: '3 caixas' },
  { item: 'Gel Separador 5mL', lote: 'L2025-015', validade: '05/08/2026', dias: 20, qtd: '50 unidades' },
]

export default function LabStockDashboardPage() {
  const [showAlerta, setShowAlerta] = useState(true)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque e Almoxarifado</h1>
          <p className="text-muted-foreground">quinta-feira, 16 de julho de 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </Button>
          <Button className="gap-2">
            <Package className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {showAlerta && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-bold text-destructive">⚠️ ATENÇÃO — 12 itens abaixo do estoque mínimo</p>
                <p className="text-sm text-destructive/80">
                  Seringas 5mL · Tubos EDTA 4mL · Gel Separador 5mL e mais 9 itens
                </p>
              </div>
            </div>
            <Button variant="link" className="text-destructive font-bold h-auto p-0 underline decoration-2">
              Ver todos os itens críticos →
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Cadastrados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">148</div>
            <p className="text-xs text-muted-foreground">Total de consumíveis ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">12</div>
            <p className="text-xs text-muted-foreground">Abaixo do mínimo configurado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencendo em 30 dias</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">5</div>
            <p className="text-xs text-muted-foreground">Lotes requerendo atenção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <RefreshCw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Aguardando recebimento</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Movimentações dos últimos 30 dias</CardTitle>
            <CardDescription>Comparativo de entradas vs saídas de materiais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="entradas" 
                    name="Entradas"
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saidas" 
                    name="Saídas"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lotes vencendo em breve</CardTitle>
              <CardDescription>Atenção para validade dos insumos</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Ver Todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {EXPIRING_LOTS.map((lot, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{lot.item}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] py-0">{lot.lote}</Badge>
                      <span>Validade: {lot.validade}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xs font-bold",
                      lot.dias <= 30 ? "text-destructive" : "text-warning"
                    )}>
                      {lot.dias} dias restantes
                    </p>
                    <p className="text-[10px] text-muted-foreground">{lot.qtd}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <Warehouse className="h-5 w-5" />
              <span className="text-xs">Tipos de Estoque</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <Package className="h-5 w-5" />
              <span className="text-xs">Cadastrar Itens</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
              <span className="text-xs">Registrar Entrada</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4 gap-2">
              <ArrowDownRight className="h-5 w-5 text-red-500" />
              <span className="text-xs">Registrar Saída</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Lab Suprimentos Ltda</span>
              </div>
              <span className="text-muted-foreground">R$ 1.250,00</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Diagnósticos Tech</span>
              </div>
              <span className="text-muted-foreground">R$ 840,00</span>
            </div>
            <Button variant="ghost" className="w-full text-xs" size="sm">
              Ver todos os pedidos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Previsão de Compras</CardTitle>
            <CardDescription>Próximos 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Seringa 5mL</span>
                <span className="text-destructive font-bold">Urgente</span>
              </div>
              <Progress value={90} className="h-1.5" indicatorClassName="bg-destructive" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Tubo EDTA 4mL</span>
                <span>Normal</span>
              </div>
              <Progress value={45} className="h-1.5" />
            </div>
            <Button variant="outline" className="w-full text-xs gap-2" size="sm">
              <FileBarChart className="h-3 w-3" />
              Relatório Completo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
