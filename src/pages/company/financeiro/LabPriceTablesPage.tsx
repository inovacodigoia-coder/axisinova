import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  BarChart,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Search as SearchIcon,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOCK_TABLES = [
  { id: 1, name: 'Tabela Particular 2025', type: 'Moeda (R$)', base: '—', updated: '01/01/2025', status: 'Ativa' },
  { id: 2, name: 'Unimed RN 2025', type: 'TUSS', base: '—', updated: '01/03/2025', status: 'Ativa' },
  { id: 3, name: 'AMB Referência', type: 'AMB', base: '2024', updated: '—', status: 'Inativa' },
];

export default function LabPriceTablesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tabelas de Preços</h1>
          <p className="text-sm text-muted-foreground">Gerencie valores de exames por convênio ou particular.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" /> Log de Alterações
          </Button>
          <Button className="gradient-bg gap-2">
            <Plus className="h-4 w-4" /> Nova Tabela
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar tabela..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3">Nome da Tabela</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Última Atualização</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MOCK_TABLES.map((table) => (
                <tr key={table.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-4 py-4 font-bold">{table.name}</td>
                  <td className="px-4 py-4">{table.type}</td>
                  <td className="px-4 py-4 text-muted-foreground">{table.base}</td>
                  <td className="px-4 py-4 text-muted-foreground">{table.updated}</td>
                  <td className="px-4 py-4">
                    <Badge variant={table.status === 'Ativa' ? 'default' : 'secondary'} className={table.status === 'Ativa' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                      {table.status === 'Ativa' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {table.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar Preços" className="h-8 w-8 text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Reajuste em Massa" className="h-8 w-8 text-amber-600">
                        <BarChart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicar Tabela" className="h-8 w-8 text-muted-foreground">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Card className="p-6 border-dashed border-2 border-muted bg-muted/5 flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <BarChart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Reajuste em Massa</h3>
            <p className="text-xs text-muted-foreground">Aplique aumentos ou descontos percentuais em toda uma tabela de uma só vez.</p>
          </div>
          <Button variant="outline" size="sm">Iniciar Reajuste</Button>
        </Card>
        
        <Card className="p-6 border-dashed border-2 border-muted bg-muted/5 flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <Copy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Cópia de Tabela</h3>
            <p className="text-xs text-muted-foreground">Use uma tabela existente como base para criar uma nova para outro convênio.</p>
          </div>
          <Button variant="outline" size="sm">Duplicar Tabela</Button>
        </Card>
      </div>
    </div>
  );
}
