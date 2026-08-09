import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Beaker, 
  Clock, 
  User,
  FlaskConical,
  ClipboardCheck,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Edit3,
  Check,
  Download,
  ShieldCheck,
  Construction,
  Filter,
  ChevronDown,
  Calendar as CalendarIcon,
  Trash2,
  Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { LabAttendanceOrder } from '@/types/lab.types';
import { toast } from 'sonner';
import { useRegisters } from '@/context/RegistersContext';
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro';
import { useCompanyContext } from '@/context/CompanyContext';
import { ResultEntryModal } from '@/components/lab/analise/ResultEntryModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SUB_TABS = [
  { id: 'mapa', label: 'Mapa de Trabalho' },
  { id: 'analise', label: 'Digitação de Resultados' },
  { id: 'urgentes', label: 'Guias Urgentes' },
  { id: 'bloqueados', label: 'Exames Bloqueados' },
  { id: 'indicadores', label: 'Guia com Indicadores' },
  { id: 'assinatura', label: 'Assinatura de Resultado' },
  { id: 'certificacao', label: 'Certificação Digital de Laudos' },
];

export default function LabAnalisePage() {
  const [activeTab, setActiveTab] = useState('analise');
  const { orders } = useAttendanceCadastro();
  const { workbenches } = useRegisters();
  const { availableOrigins: establishments } = useCompanyContext();
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [protocolSearch, setProtocolSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  
  // Filtros
  const [period, setPeriod] = useState('hoje');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedWorkbenches, setSelectedWorkbenches] = useState<string[]>([]);
  const [selectedEstablishments, setSelectedEstablishments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filtragem de exames (Coleta Realizada)
  const filteredExams = useMemo(() => {
    const allExams: any[] = [];
    
    (orders || []).forEach(order => {
      const exams = (order.labGuides || []).flatMap(guide => 
        (guide.exams || []).map((e: any) => ({
          ...e,
          orderId: order.id,
          protocol: order.protocol,
          patientName: order.patientName,
          patientBirthDate: order.patientBirthDate,
          patientGender: order.patientGender,
          registeredAt: order.registeredAt,
          collectionDate: order.updatedAt, // Assumindo updatedAt como data da coleta se status for collection_done
          originId: order.originId,
          originName: order.originName,
          status: e.status || 'pending'
        }))
      );
      
      // Filtro por Status: Apenas exames com coleta realizada ou em análise
      exams.forEach(exam => {
        if (exam.status === 'collection_done' || (exam.status as string) === 'processing' || order.status === 'collection_done' || (order.status as string) === 'in_analysis') {
          allExams.push(exam);
        }
      });
    });

    return allExams.filter(exam => {
      const matchesSearch = exam.patientName.toLowerCase().includes(search.toLowerCase()) || 
                            exam.protocol.includes(search);
      
      const matchesProtocol = protocolSearch === '' || exam.protocol.includes(protocolSearch);
      
      // Filtro de Bancada: Se selecionado, filtra apenas os exames DAQUELA bancada
      const matchesWorkbench = selectedWorkbenches.length === 0 || 
                               selectedWorkbenches.includes(exam.workbench || '');
      
      // Filtro de Origem
      const matchesOrigin = selectedEstablishments.length === 0 || 
                             selectedEstablishments.includes(exam.originId || '');

      // Filtro de Período baseado na data de coleta (ou registro como fallback)
      const dateToCompare = exam.collectionDate || exam.registeredAt;
      const examDate = new Date(dateToCompare);
      const today = new Date();
      
      let matchesPeriod = true;
      if (period === 'hoje') {
        matchesPeriod = format(examDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      } else if (period === '7d') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesPeriod = examDate >= sevenDaysAgo;
      } else if (period === '30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesPeriod = examDate >= thirtyDaysAgo;
      } else if (period === 'este-mes') {
        matchesPeriod = examDate.getMonth() === today.getMonth() && examDate.getFullYear() === today.getFullYear();
      } else if (period === 'custom' && dateFrom && dateTo) {
        matchesPeriod = examDate >= dateFrom && examDate <= dateTo;
      }

      return matchesSearch && matchesProtocol && matchesWorkbench && matchesOrigin && matchesPeriod;
    });
  }, [orders, search, protocolSearch, selectedWorkbenches, selectedEstablishments, period, dateFrom, dateTo]);

  // Agrupamento por protocolo para a lista lateral
  const groupedExams = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredExams.forEach(exam => {
      if (!groups[exam.protocol]) {
        groups[exam.protocol] = {
          id: exam.orderId,
          protocol: exam.protocol,
          patientName: exam.patientName,
          registeredAt: exam.registeredAt,
          exams: []
        };
      }
      groups[exam.protocol].exams.push(exam);
    });
    return Object.values(groups);
  }, [filteredExams]);

  const handleSelectExam = (orderId: string, examId: string) => {
    setSelectedOrderId(orderId);
    setSelectedExamId(examId);
  };

  const toggleGroup = (protocol: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [protocol]: !prev[protocol]
    }));
  };

  const clearFilters = () => {
    setPeriod('hoje');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedWorkbenches([]);
    setSelectedEstablishments([]);
    setProtocolSearch('');
  };

  const isFiltered = period !== 'hoje' || selectedWorkbenches.length > 0 || selectedEstablishments.length > 0 || protocolSearch !== '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-navegação */}
      <div className="border-b bg-card mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent h-12 w-full justify-start gap-4 px-4">
            {SUB_TABS.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-primary transition-all",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-2">
        <Tabs value={activeTab} className="h-full">
          {SUB_TABS.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="h-full m-0">
              {tab.id === 'analise' ? (
                <div className="flex h-full gap-4">
                  {/* Fila Lateral e Painel de Filtros */}
                  <div className="w-[380px] flex flex-col gap-4">
                    {/* Painel de Filtros */}
                    <Card className="p-4 space-y-4 shadow-sm border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-primary" />
                          <h2 className="text-sm font-bold uppercase tracking-wider">Filtros de Análise</h2>
                        </div>
                        {isFiltered && (
                          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-[10px] text-destructive font-bold uppercase">
                            Limpar Filtros
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Período */}
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Período</label>
                          <div className="flex gap-2">
                            <select 
                              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                              value={period}
                              onChange={(e) => setPeriod(e.target.value)}
                            >
                              <option value="hoje">Hoje</option>
                              <option value="7d">Últimos 7 dias</option>
                              <option value="30d">Últimos 30 dias</option>
                              <option value="este-mes">Este mês</option>
                              <option value="mes-passado">Mês passado</option>
                              <option value="custom">Período</option>
                            </select>
                            {period === 'custom' && (
                              <div className="flex gap-1 items-center">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 w-9 p-0"><CalendarIcon className="h-4 w-4" /></Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                                  </PopoverContent>
                                </Popover>
                                <span className="text-muted-foreground">/</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 w-9 p-0"><CalendarIcon className="h-4 w-4" /></Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bancada */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Bancada</label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full h-9 text-xs justify-between font-medium">
                                {selectedWorkbenches.length === 0 ? 'Todas' : `${selectedWorkbenches.length} Bancadas`}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              {workbenches.map(wb => (
                                <DropdownMenuCheckboxItem
                                  key={wb.id}
                                  checked={selectedWorkbenches.includes(wb.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedWorkbenches(prev => checked ? [...prev, wb.id] : prev.filter(id => id !== wb.id));
                                  }}
                                >
                                  {wb.name}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Estabelecimento */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Origem</label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full h-9 text-xs justify-between font-medium">
                                {selectedEstablishments.length === 0 ? 'Todas' : `${selectedEstablishments.length} Origens`}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              {establishments.map(est => (
                                <DropdownMenuCheckboxItem
                                  key={est.id}
                                  checked={selectedEstablishments.includes(est.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedEstablishments(prev => checked ? [...prev, est.id] : prev.filter(id => id !== est.id));
                                  }}
                                >
                                  {est.name}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Busca por Pedido */}
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Protocolo</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input 
                              className="w-full pl-9 pr-4 py-2 h-9 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20" 
                              placeholder="AAAAMMDD-XXX-XX"
                              value={protocolSearch}
                              onChange={(e) => setProtocolSearch(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                        <span>EXIBINDO {filteredExams.length} DE {orders.reduce((acc, o) => acc + (o.labGuides || []).reduce((acc2, g) => acc2 + (g.exams || []).length, 0), 0)} EXAMES</span>
                      </div>
                    </Card>

                    {/* Lista Lateral */}
                    <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-border">
                      <div className="p-3 border-b flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <input 
                            className="w-full pl-9 pr-4 py-2 h-9 rounded-lg border border-input bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20" 
                            placeholder="Paciente ou exame..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => setIsResultModalOpen(true)}
                            className="h-9 gap-1 px-4 text-[10px] font-black uppercase tracking-widest gradient-bg text-white border-none shadow-md hover:shadow-primary/20 transition-all active:scale-95"
                          >
                            <Beaker className="h-3.5 w-3.5" /> Digitação
                          </Button>
                          <Button variant="outline" className="h-9 gap-1 px-2 text-[10px] font-bold uppercase border-slate-200 text-slate-600 hover:bg-slate-50">
                            <ClipboardCheck className="h-3.5 w-3.5" /> Lote
                          </Button>
                        </div>
                      </div>

                      <ScrollArea className="flex-1">
                        <div className="p-3 space-y-4">
                          {loading ? (
                            Array(4).fill(0).map((_, i) => (
                              <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Card className="p-3"><Skeleton className="h-10 w-full" /></Card>
                              </div>
                            ))
                          ) : groupedExams.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                              <Beaker className="h-12 w-12 text-muted-foreground/30 mb-4" />
                              <h3 className="text-sm font-bold">Nenhum exame pendente</h3>
                              <p className="text-xs text-muted-foreground mt-1">Verifique os filtros ou aguarde novas coletas.</p>
                              {isFiltered && (
                                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2 text-xs">Limpar filtros aplicados</Button>
                              )}
                            </div>
                          ) : (
                            groupedExams.map((group) => {
                              const isExpanded = !!expandedGroups[group.protocol];
                              return (
                                <div key={group.protocol} className="space-y-1.5">
                                  <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 p-0 hover:bg-primary/10 text-primary transition-all"
                                        onClick={() => toggleGroup(group.protocol)}
                                      >
                                        {isExpanded ? (
                                          <XCircle className="h-3.5 w-3.5" />
                                        ) : (
                                          <Layout className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                      <input type="checkbox" className="rounded border-gray-300 h-3 w-3" />
                                      <span className="text-[10px] font-black font-mono text-muted-foreground">Protocolo {group.protocol}</span>
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                                      <Clock className="h-3 w-3" /> 10m
                                    </span>
                                  </div>
                                  
                                  {isExpanded && group.exams.map((exam: any) => (
                                    <button
                                      key={exam.id}
                                      onClick={() => handleSelectExam(group.id, exam.id)}
                                      className={cn(
                                        "w-full text-left p-3 rounded-xl border transition-all hover:border-primary/50 group",
                                        selectedExamId === exam.id
                                          ? "bg-primary/5 border-primary shadow-sm"
                                          : "bg-card border-border shadow-sm"
                                      )}
                                    >
                                      <div className="flex justify-between items-start mb-1.5">
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-black text-sm truncate uppercase tracking-tight">{group.patientName}</span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black h-4 uppercase">{exam.code}</Badge>
                                            <span className="text-[10px] text-muted-foreground font-medium truncate">{exam.name}</span>
                                          </div>
                                        </div>
                                        <Badge 
                                          variant="secondary" 
                                          className={cn(
                                            "text-[9px] font-black h-4 uppercase",
                                            exam.workbench === 'Bioquímica' ? "bg-blue-100 text-blue-700" :
                                            exam.workbench === 'Hematologia' ? "bg-purple-100 text-purple-700" :
                                            "bg-slate-100 text-slate-700"
                                          )}
                                        >
                                          {exam.workbench || 'Bancada'}
                                        </Badge>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>

                  {/* Painel de Detalhes (Direita) */}
                  <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <Card className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-2xl border-2 border-dashed border-border p-12 text-center opacity-60">
                      <div className="h-20 w-20 rounded-full bg-background/50 flex items-center justify-center mb-6 shadow-inner">
                        <Beaker className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Selecione um exame</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mt-2">Escolha um registro na fila lateral para iniciar o trabalho técnico de digitação e conferência de resultados.</p>
                      
                      <div className="mt-8 flex gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Painel Conectado</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
                  <div className="h-24 w-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                    <Construction className="h-12 w-12 text-primary/40" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{tab.label}</h3>
                  <p className="text-muted-foreground max-w-md mt-4 text-sm leading-relaxed">
                    Esta funcionalidade está sendo implementada para o ciclo laboratorial e será liberada em breve em uma próxima etapa do sistema Axis Inova.
                  </p>
                  <Button variant="outline" className="mt-8 gap-2 font-bold uppercase text-[10px] h-10 px-6 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
                    Acompanhar Roadmap
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      <ResultEntryModal 
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        filteredExams={filteredExams}
        filters={{
          period,
          workbenches: selectedWorkbenches,
          establishments: selectedEstablishments,
          protocol: protocolSearch
        }}
        workbenchNames={workbenches.reduce((acc, wb) => ({ ...acc, [wb.id]: wb.name }), {})}
        establishmentNames={establishments.reduce((acc, est) => ({ ...acc, [est.id]: est.name }), {})}
      />
    </div>
  );
}
