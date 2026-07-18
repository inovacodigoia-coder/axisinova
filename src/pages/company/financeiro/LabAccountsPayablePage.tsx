import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  DollarSign, 
  Printer, 
  MoreVertical,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Building,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOCK_PAYABLES = [
  { id: 1, description: 'Reagentes EDTA', provider: 'Lab Suprimentos', costCenter: 'Bioquímica', dueDate: '15/07/2026', value: 1200, status: '⚠️ Amanhã' },
  { id: 2, description: 'Energia Elétrica', provider: 'COSERN', costCenter: 'Administrativo', dueDate: '20/07/2026', value: 480, status: 'Pendente' },
  { id: 3, description: 'Aluguel Imóvel XYZ', provider: 'Administrativo', costCenter: 'Administrativo', dueDate: '05/07/2026', value: 2800, status: 'Pago' },
  { id: 4, description: 'Manutenção Equip.', provider: 'BioTech', costCenter: 'Bioquímica', dueDate: '22/07/2026', value: 850, status: 'Pendente' },
  { id: 5, description: 'Internet Fibra', provider: 'Telecom', costCenter: 'TI', dueDate: '25/07/2026', value: 199, status: 'Pendente' },
];

export default function LabAccountsPayablePage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Controle de despesas, fornecedores e vencimentos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" /> Histórico
          </Button>
          <Button className="gradient-bg gap-2">
            <Plus className="h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total a Pagar (Mês)</p>
          <h3 className="text-xl font-bold">R$ 12.400,00</h3>
        </Card>
        <Card className="p-4 flex flex-col gap-1 border-emerald-100 bg-emerald-50/20">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Pago</p>
          <h3 className="text-xl font-bold text-emerald-700">R$ 10.800,00</h3>
        </Card>
        <Card className="p-4 flex flex-col gap-1 border-amber-100 bg-amber-50/20">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendentes</p>
          <h3 className="text-xl font-bold text-amber-700">R$ 1.600,00</h3>
        </Card>
        <Card className="p-4 flex flex-col gap-1 border-destructive/10 bg-destructive/5">
          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Vencidas</p>
          <h3 className="text-xl font-bold text-destructive">R$ 320,00</h3>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Busca por fornecedor, descrição ou nota fiscal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Status
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" /> Vencimento
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Building className="h-4 w-4" /> Centro de Custo
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Centro de Custo</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_PAYABLES.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-4 text-center text-muted-foreground font-mono text-xs">{item.id}</td>
                  <td className="px-4 py-4 font-medium">{item.description}</td>
                  <td className="px-4 py-4 text-muted-foreground">{item.provider}</td>
                  <td className="px-4 py-4">
                    <Badge variant="secondary" className="font-normal text-[10px]">{item.costCenter}</Badge>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{item.dueDate}</td>
                  <td className="px-4 py-4 font-bold">R$ {item.value.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <Badge className={
                      item.status === 'Pago' ? 'bg-emerald-500 hover:bg-emerald-600' :
                      item.status.includes('Amanhã') ? 'bg-amber-500 hover:bg-amber-600' :
                      'bg-blue-500 hover:bg-blue-600'
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
                          <DollarSign className="h-4 w-4" />
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
          <span className="text-xs text-muted-foreground">Mostrando 5 de 42 lançamentos</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">2</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">3</Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
