import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  CreditCard, 
  Printer, 
  MoreVertical,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOCK_RECEIVABLES = [
  { protocol: 'ATD-2025-000123', patient: 'João da Silva', date: '07/07', value: 320, discount: 32, netValue: 288, status: 'Pendente' },
  { protocol: 'ATD-2025-000119', patient: 'Maria Costa', date: '05/07', value: 180, discount: 0, netValue: 180, status: 'Pago' },
  { protocol: 'ATD-2025-000115', patient: 'Carlos Lima', date: '03/07', value: 95, discount: 0, netValue: 95, status: 'Pago' },
  { protocol: 'ATD-2025-000110', patient: 'Ana Oliveira', date: '01/07', value: 450, discount: 45, netValue: 405, status: 'Atrasado' },
];

const MOCK_CONVENIOS = [
  { name: 'Unimed Natal', sentGuides: 47, sentValue: 28450, approvedValue: 26100, glosas: 2350, status: 'Em processamento' },
  { name: 'Hapvida', sentGuides: 23, sentValue: 12800, approvedValue: 0, glosas: 0, status: 'Aguardando envio' },
  { name: 'SUS', sentGuides: 31, sentValue: 8200, approvedValue: 8200, glosas: 0, status: 'Pago' },
];

export default function LabAccountsReceivablePage() {
  const [activeTab, setActiveTab] = useState('particular');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Gerencie recebimentos de particulares e convênios.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" /> Audit Log
          </Button>
          <Button className="gradient-bg gap-2">
            <Plus className="h-4 w-4" /> Novo Lançamento Manual
          </Button>
        </div>
      </div>

      <Tabs defaultValue="particular" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="particular">Particular</TabsTrigger>
          <TabsTrigger value="convenios">Convênios</TabsTrigger>
          <TabsTrigger value="resumo">Resumo Geral</TabsTrigger>
        </TabsList>

        <TabsContent value="particular" className="space-y-4 pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
                placeholder="Busca por paciente, protocolo ou recibo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Status
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" /> Período
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <CreditCard className="h-4 w-4" /> Forma Pagto.
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Protocolo</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Desconto</th>
                    <th className="px-4 py-3">Líquido</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_RECEIVABLES.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-4 font-mono text-xs font-bold">{item.protocol}</td>
                      <td className="px-4 py-4 font-medium">{item.patient}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.date}</td>
                      <td className="px-4 py-4">R$ {item.value.toFixed(2)}</td>
                      <td className="px-4 py-4 text-destructive">{item.discount > 0 ? `- R$ ${item.discount.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-4 font-bold">R$ {item.netValue.toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <Badge className={
                          item.status === 'Pago' ? 'bg-emerald-500 hover:bg-emerald-600' :
                          item.status === 'Atrasado' ? 'bg-destructive hover:bg-destructive/90' :
                          'bg-amber-500 hover:bg-amber-600'
                        }>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status !== 'Pago' ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrando 4 de 128 lançamentos</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-primary text-primary-foreground">1</Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">2</Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">3</Button>
                <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="convenios" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex flex-col gap-1 border-emerald-100 bg-emerald-50/20">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Recebido</p>
              <h3 className="text-xl font-bold text-emerald-700">R$ 84.320,00</h3>
            </Card>
            <Card className="p-4 flex flex-col gap-1 border-blue-100 bg-blue-50/20">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Aguardando Processamento</p>
              <h3 className="text-xl font-bold text-blue-700">R$ 42.150,00</h3>
            </Card>
            <Card className="p-4 flex flex-col gap-1 border-destructive/10 bg-destructive/5">
              <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Total em Glosas</p>
              <h3 className="text-xl font-bold text-destructive">R$ 5.480,00</h3>
            </Card>
          </div>

          <Card className="overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Convênio</th>
                    <th className="px-4 py-3">Guias Enviadas</th>
                    <th className="px-4 py-3">Valor Enviado</th>
                    <th className="px-4 py-3">Valor Aprovado</th>
                    <th className="px-4 py-3">Glosas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_CONVENIOS.map((c, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-4 font-bold">{c.name}</td>
                      <td className="px-4 py-4">{c.sentGuides}</td>
                      <td className="px-4 py-4">R$ {c.sentValue.toLocaleString()}</td>
                      <td className="px-4 py-4 font-medium text-emerald-600">
                        {c.approvedValue > 0 ? `R$ ${c.approvedValue.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-destructive">
                        {c.glosas > 0 ? `R$ ${c.glosas.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={
                          c.status === 'Pago' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                          c.status === 'Em processamento' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                          'border-amber-500 text-amber-600 bg-amber-50'
                        }>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="pt-4">
          <Card className="p-12 text-center space-y-4">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Relatório Consolidado</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">Gere um resumo financeiro detalhado de todos os recebimentos por período, conciliando particular e convênios.</p>
            </div>
            <Button className="gradient-bg">Gerar Relatório Completo (PDF/Excel)</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
