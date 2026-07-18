import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const MOCK_RENTABILIDADE = [
  { convenio: 'Particular', atendimentos: 145, faturado: 32000, recebido: 31200, glosas: 800, percentGlosa: 2.5, ticket: 220.69, rentabilidade: 'Alta' },
  { convenio: 'Unimed', atendimentos: 200, faturado: 48000, recebido: 43200, glosas: 4800, percentGlosa: 10, ticket: 240.00, rentabilidade: 'Média' },
  { convenio: 'SUS', atendimentos: 310, faturado: 18000, recebido: 18000, glosas: 0, percentGlosa: 0, ticket: 58.06, rentabilidade: 'Baixa' },
];

const RENTABILIDADE_CHART = [
  { name: 'Particular', rent: 92 },
  { name: 'Unimed', rent: 78 },
  { name: 'SUS', rent: 35 },
  { name: 'Hapvida', rent: 65 },
];

export default function LabFinancialIndicatorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Indicadores Financeiros</h1>
          <p className="text-sm text-muted-foreground">Análise de rentabilidade, glosas e ticket médio.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" /> Período
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Exportar BI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 space-y-6">
          <h3 className="font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Índice de Rentabilidade
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={RENTABILIDADE_CHART} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="rent" fill="#7B2FF7" radius={[0, 4, 4, 0]} name="Rentabilidade %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
              <Info className="h-3 w-3" /> Insights
            </div>
            <p className="text-xs text-muted-foreground italic">
              O convênio <strong>Particular</strong> apresenta a melhor rentabilidade líquida (+92%), enquanto o <strong>SUS</strong> opera com margem reduzida, servindo como base de volume operacional.
            </p>
          </div>
        </Card>

        <Card className="p-0 lg:col-span-2 overflow-hidden border-border flex flex-col">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="text-sm font-bold">Rentabilidade por Convênio</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">Convênio</th>
                  <th className="px-4 py-3 text-center">Atend.</th>
                  <th className="px-4 py-3">Faturado</th>
                  <th className="px-4 py-3">Glosas</th>
                  <th className="px-4 py-3">% Glosa</th>
                  <th className="px-4 py-3">Ticket Médio</th>
                  <th className="px-4 py-3">Rentabilidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_RENTABILIDADE.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4 font-bold">{item.convenio}</td>
                    <td className="px-4 py-4 text-center">{item.atendimentos}</td>
                    <td className="px-4 py-4 font-medium">R$ {item.faturado.toLocaleString()}</td>
                    <td className="px-4 py-4 text-destructive">R$ {item.glosas.toLocaleString()}</td>
                    <td className="px-4 py-4 font-bold text-destructive">{item.percentGlosa}%</td>
                    <td className="px-4 py-4">R$ {item.ticket.toFixed(2)}</td>
                    <td className="px-4 py-4">
                      <Badge className={
                        item.rentabilidade === 'Alta' ? 'bg-emerald-500 hover:bg-emerald-600' :
                        item.rentabilidade === 'Média' ? 'bg-amber-500 hover:bg-amber-600' :
                        'bg-blue-500 hover:bg-blue-600'
                      }>
                        {item.rentabilidade === 'Alta' ? <TrendingUp className="h-3 w-3 mr-1" /> : item.rentabilidade === 'Média' ? <TrendingUp className="h-3 w-3 mr-1" /> : <Info className="h-3 w-3 mr-1" />}
                        {item.rentabilidade}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold">Análise de Apoio (Terceirização)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor pago a parceiros:</span>
              <span className="font-bold text-destructive">R$ 4.250,00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Faturamento desses exames:</span>
              <span className="font-bold text-emerald-600">R$ 8.900,00</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '47%' }}></div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-wider">Margem Bruta sobre Terceirizados: 52,3%</p>
          </div>
        </Card>

        <Card className="p-6 space-y-4 bg-muted/20">
          <h3 className="font-bold">Projeção de Glosas Evitáveis</h3>
          <p className="text-xs text-muted-foreground">65% das glosas deste mês poderiam ser evitadas com a validação obrigatória dos campos TISS na recepção.</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-20 w-full flex items-end gap-1">
                {[40, 60, 30, 80, 50, 90, 45].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/20 hover:bg-primary transition-colors rounded-t" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">R$ 3.120</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Recuperável</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
