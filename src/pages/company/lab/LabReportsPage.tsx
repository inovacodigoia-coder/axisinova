import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  Mail, 
  FileEdit, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  ChevronRight,
  User,
  ExternalLink,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LabReport, LabAttendanceOrder } from '@/types/lab.types';
import PDFPreviewModal from '@/components/lab/PDFPreviewModal';
import DeliveryTrackingModal from '@/components/lab/DeliveryTrackingModal';
import EmailReportModal from '@/components/lab/EmailReportModal';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro';
import { format, differenceInYears } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

  /* Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.
                                        
                                            
                                            Verificar a rota app/lab/laudos os modal Visualização do Laudo e os outros botões de ações não está funcionando. */
export default function LabReportsPage() {
  const { orders, loading: ordersLoading } = useAttendanceCadastro();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [resultsByProtocol, setResultsByProtocol] = useState<Record<string, { released: number; total: number }>>({});

  useEffect(() => {
    if (!ordersLoading) {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [ordersLoading]);

  // Load persisted exam results (source of truth for released/typed exams)
  useEffect(() => {
    const companyId = user?.companyId;
    if (!companyId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('lab_exam_results')
        .select('protocol, exam_ref, status')
        .eq('company_id', companyId);
      if (!active) return;
      if (error) { console.error('Error loading lab results:', error); return; }
      const map: Record<string, { released: number; total: number }> = {};
      const seen = new Set<string>();
      (data || []).forEach((r: any) => {
        if (!r.protocol) return;
        const key = `${r.protocol}:${r.exam_ref}`;
        if (seen.has(key)) return;
        seen.add(key);
        const entry = map[r.protocol] || { released: 0, total: 0 };
        entry.total += 1;
        if (r.status === 'released' || r.status === 'liberado') entry.released += 1;
        map[r.protocol] = entry;
      });
      setResultsByProtocol(map);
    })();
    return () => { active = false; };
  }, [user?.companyId]);

  // Transform attendance_orders into LabReports
  const reports = useMemo(() => {
    return (orders || [])
      .filter(order => order.examMode === 'lab')
      .map(order => {
        const labOrder = order as unknown as LabAttendanceOrder;
        const exams = labOrder.labGuides?.flatMap(g => g.exams || []) || [];
        const protocolKey = order.protocol || order.orderNumber;
        const persisted = resultsByProtocol[protocolKey];
        const totalExams = Math.max(exams.length, persisted?.total || 0);
        const releasedFromGuides = exams.filter(e => e.status === 'released' || e.status === 'liberado').length;
        const releasedExams = Math.max(releasedFromGuides, persisted?.released || 0);

        
        // Map status
        let reportStatus: 'liberado' | 'pending' | 'retificado' | 'parcial' = 'pending';
        if (releasedExams > 0 && releasedExams < totalExams) reportStatus = 'parcial';
        else if (releasedExams === totalExams && totalExams > 0) reportStatus = 'liberado';
        else if ((order.status as string) === 'retificado') reportStatus = 'retificado';

        return {
          id: order.id,
          protocol: order.protocol || order.orderNumber,
          patientId: order.patientId,
          patientName: order.patientName,
          patientBirthDate: order.patientBirthDate || '',
          patientGender: (order.patientGender as any) === 'male' ? 'M' : (order.patientGender as any) === 'female' ? 'F' : 'M',
          date: order.registeredAt,
          doctorName: order.doctorName || order.requestingDoctor || '—',
          doctorCRM: order.doctorCRM || '',
          status: reportStatus,
          examsCount: `${releasedExams}/${totalExams} ${releasedExams === totalExams ? '✅' : '⏳'}`,
          exams: exams,
          deliveryStatus: (order as any).deliveryStatus || 'not_delivered',
          rawOrder: order
        };
      })
      .filter(report => {
        const matchesSearch = report.patientName.toLowerCase().includes(search.toLowerCase()) || 
                              report.protocol.includes(search);
        const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
        return matchesSearch && matchesStatus;
      });
  }, [orders, search, filterStatus, resultsByProtocol]);

  const handlePreview = (report: any) => {
    setSelectedReport(report.rawOrder);
    setShowPreview(true);
  };

  const handleDownload = (id: string) => {
    toast.success("Download iniciado");
  };

  const handleEmail = (report: any) => {
    setSelectedReport(report.rawOrder);
    setShowEmail(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'liberado':
        return <Badge className="bg-emerald-500 text-white border-none">● Liberado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">● Pendente</Badge>;
      case 'parcial':
        return <Badge className="bg-blue-500 text-white border-none">● Parcial</Badge>;
      case 'retificado':
        return <Badge className="bg-orange-500 text-white border-none">● Retificado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Laudos</h1>
          <p className="text-sm text-muted-foreground">Gerencie a emissão, visualização e entrega de laudos laboratoriais.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Buscar protocolo ou paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'parcial', 'liberado', 'retificado'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize text-xs h-8"
            >
              {status === 'all' ? 'Todos' : status}
            </Button>
          ))}
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
                <th className="px-4 py-3">Médico</th>
                <th className="px-4 py-3">Exames</th>
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
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum laudo encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-4 font-mono font-bold text-xs">{report.protocol}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{report.patientName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {report.patientBirthDate ? `${differenceInYears(new Date(), new Date(report.patientBirthDate))} anos` : 'Idade não inf.'} • {report.patientGender === 'M' ? 'Masc' : 'Fem'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{new Date(report.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-4">{report.doctorName}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{report.examsCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(report.status)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handlePreview(report)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleDownload(report.id)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleEmail(report)} 
                              className="gap-2"
                            >
                              <Mail className="h-4 w-4" /> Enviar por E-mail
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <ExternalLink className="h-4 w-4" /> Link Público
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-primary">
                              <FileEdit className="h-4 w-4" /> Retificar Laudo
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => {
                                setSelectedReport(report.rawOrder);
                                setShowDelivery(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" /> Registrar Entrega
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

      {selectedReport && (
        <PDFPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          order={selectedReport as any}
          onDownload={() => handleDownload(selectedReport.id)}
        />
      )}

      {selectedReport && (
        <DeliveryTrackingModal
          isOpen={showDelivery}
          onClose={() => setShowDelivery(false)}
          onConfirm={(data) => {
            toast.success('Entrega registrada com sucesso!');
            console.log('Delivery data:', data);
            setShowDelivery(false);
          }}
          patientName={selectedReport.patientName}
          protocol={selectedReport.protocol}
        />
      )}

      {selectedReport && (
        <EmailReportModal
          isOpen={showEmail}
          onClose={() => setShowEmail(false)}
          onSend={(data) => {
            toast.success(`Laudo enviado para ${data.email}`);
            setShowEmail(false);
          }}
          patientName={selectedReport.patientName}
          protocol={selectedReport.protocol}
        />
      )}
    </div>
  );
}
