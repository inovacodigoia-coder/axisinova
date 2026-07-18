/**
 * PROMPT 13-F — Orçamentos: Criação, Validade, Conversão em Guia e Importação
 */
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Mail, 
  RefreshCcw, 
  ArrowRightLeft, 
  Trash2,
  Calendar,
  MoreVertical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { LabBudget } from '@/types/lab.types';
import { Skeleton } from '@/components/ui/skeleton';

const MOCK_BUDGETS: LabBudget[] = [
  {
    id: '1',
    budgetNumber: 'ORC-2025-001',
    patientName: 'João da Silva',
    date: '2025-07-07',
    expiryDate: '2025-07-14',
    exams: [{}, {}, {}, {}, {}] as any,
    subtotal: 320,
    total: 320,
    status: 'pending',
    isAnonymous: false,
    convenioId: 'c1',
    convenioName: 'Particular',
    priceTableId: 't1',
    priceTableName: 'Tabela Particular 2025',
    discountType: 'percentage',
    discountValue: 0,
  },
  {
    id: '2',
    budgetNumber: 'ORC-2025-002',
    patientName: 'Maria Costa',
    date: '2025-07-06',
    expiryDate: '2025-07-13',
    exams: [{}, {}, {}] as any,
    subtotal: 180,
    total: 180,
    status: 'converted',
    isAnonymous: false,
    convenioId: 'c1',
    convenioName: 'Particular',
    priceTableId: 't1',
    priceTableName: 'Tabela Particular 2025',
    discountType: 'percentage',
    discountValue: 0,
  },
  {
    id: '3',
    budgetNumber: 'ORC-2025-003',
    patientName: 'Carlos Lima',
    date: '2025-07-01',
    expiryDate: '2025-07-08',
    exams: [{}, {}] as any,
    subtotal: 95,
    total: 95,
    status: 'expired',
    isAnonymous: false,
    convenioId: 'c1',
    convenioName: 'Particular',
    priceTableId: 't1',
    priceTableName: 'Tabela Particular 2025',
    discountType: 'percentage',
    discountValue: 0,
  }
];

export default function LabBudgetsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const getStatusBadge = (status: LabBudget['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-500 text-white border-none">● Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-500 text-white border-none">● Aprovado</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-gray-200 text-gray-600">● Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">● Cancelado</Badge>;
      case 'converted':
        return <Badge className="bg-purple-500 text-white border-none">● Convertido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const budgets = MOCK_BUDGETS.filter(b => {
    const matchesSearch = b.patientName.toLowerCase().includes(search.toLowerCase()) || 
                          b.budgetNumber.includes(search);
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Simule valores de exames e converta orçamentos em atendimentos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/app/bi/financeiro')}>
            <BarChart3 className="h-4 w-4" /> Relatórios
          </Button>
          <Button onClick={() => navigate('/app/orcamentos/novo')} className="gap-2 gradient-bg">
            <Plus className="h-4 w-4" /> Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conversão (30 dias)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-bold text-primary">68%</h3>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px]">+12% vs anterior</Badge>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-2">
            <div className="h-full bg-primary rounded-full" style={{ width: '68%' }}></div>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
          <h3 className="text-2xl font-bold text-foreground">R$ 245,50</h3>
          <p className="text-[10px] text-muted-foreground">Baseado em 128 orçamentos aprovados</p>
        </Card>
        <Card className="p-4 flex flex-col gap-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Pendente</p>
          <h3 className="text-2xl font-bold text-amber-600">R$ 12.450,00</h3>
          <p className="text-[10px] text-muted-foreground">42 orçamentos aguardando aprovação</p>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar por paciente, CPF ou número do orçamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Calendar className="h-4 w-4" /> Período
          </Button>
        </div>
      </div>


      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'approved', 'expired', 'cancelled', 'converted'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
            className="capitalize text-xs h-8 whitespace-nowrap"
          >
            {status === 'all' ? 'Todos' : status}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-4 py-3">Nº Orçamento</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3 text-center">Exames</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : budgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum orçamento encontrado.
                  </td>
                </tr>
              ) : (
                budgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-4 font-mono font-bold text-xs">{budget.budgetNumber}</td>
                    <td className="px-4 py-4 font-medium">{budget.patientName}</td>
                    <td className="px-4 py-4 text-muted-foreground">{new Date(budget.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-4 text-muted-foreground">{new Date(budget.expiryDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-4 text-center">{budget.exams.length}</td>
                    <td className="px-4 py-4 font-bold">R$ {budget.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4">{getStatusBadge(budget.status)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => navigate(`/app/orcamentos/${budget.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {(budget.status === 'pending' || budget.status === 'approved') && (
                              <DropdownMenuItem className="gap-2" onClick={() => navigate(`/app/orcamentos/${budget.id}/editar`)}>
                                <Edit className="h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2">
                              <Mail className="h-4 w-4" /> Enviar por E-mail
                            </DropdownMenuItem>
                            {budget.status === 'expired' && (
                              <DropdownMenuItem className="gap-2">
                                <RefreshCcw className="h-4 w-4" /> Renovar Validade
                              </DropdownMenuItem>
                            )}
                            {(budget.status === 'pending' || budget.status === 'approved') && (
                              <DropdownMenuItem className="gap-2 text-purple-600 font-medium">
                                <ArrowRightLeft className="h-4 w-4" /> Converter em Guia
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="h-4 w-4" /> Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
