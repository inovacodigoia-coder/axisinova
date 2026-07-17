import { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LabReport } from '@/types/lab.types';
import PDFPreviewModal from '@/components/lab/PDFPreviewModal';
import DeliveryTrackingModal from '@/components/lab/DeliveryTrackingModal';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const MOCK_REPORTS: LabReport[] = [
  {
    id: '1',
    protocol: '20260622-714-66',
    patientId: 'p1',
    patientName: 'PACIENTE TESTE',
    patientBirthDate: '1989-02-18',
    patientGender: 'M',
    date: '2026-06-22',
    doctorName: 'Dr. Carlos Lima',
    doctorCRM: '8495/RN',
    status: 'liberado',
    examsCount: '4/4 ✅',
    exams: [
      {
        examId: 'e1',
        name: 'ALBUMINA',
        material: 'Soro',
        results: [
          { parameterName: 'Albumina', value: '4', unit: 'g/dL', referenceRange: '3,5 - 5,2', status: 'normal' }
        ]
      }
    ],
    deliveryStatus: 'not_delivered'
  },
  {
    id: '2',
    protocol: '20260716-360-80',
    patientId: 'p2',
    patientName: 'JOÃO DA SILVA',
    patientBirthDate: '1975-05-10',
    patientGender: 'M',
    date: '2026-07-16',
    doctorName: 'Dra. Bruna Baioni',
    doctorCRM: '12345/SP',
    status: 'pending',
    examsCount: '2/4 ⏳',
    exams: [],
    deliveryStatus: 'not_delivered'
  },
  {
    id: '3',
    protocol: '20260625-888-12',
    patientId: 'p3',
    patientName: 'MARIA OLIVEIRA',
    patientBirthDate: '1992-11-25',
    patientGender: 'F',
    date: '2026-06-25',
    doctorName: 'Dr. Ricardo Santos',
    doctorCRM: '9988/RJ',
    status: 'retificado',
    examsCount: '3/3 ✅',
    exams: [],
    deliveryStatus: 'delivered'
  }
];

export default function LabReportsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const reports = MOCK_REPORTS.filter(report => {
    const matchesSearch = report.patientName.toLowerCase().includes(search.toLowerCase()) || 
                          report.protocol.includes(search);
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedReport = MOCK_REPORTS.find(r => r.id === selectedReportId);

  const handlePreview = (id: string) => {
    setSelectedReportId(id);
    setShowPreview(true);
  };

  const handleDownload = (id: string) => {
    toast.success("Download iniciado");
  };

  const handleEmail = (id: string) => {
    toast.success("E-mail enviado com sucesso");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'liberado':
        return <Badge className="bg-emerald-500 text-white border-none">● Liberado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">● Pendente</Badge>;
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
          {['all', 'pending', 'liberado', 'retificado'].map((status) => (
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
                        <span className="text-[10px] text-muted-foreground">{new Date().getFullYear() - new Date(report.patientBirthDate).getFullYear()} anos • {report.patientGender === 'M' ? 'Masc' : 'Fem'}</span>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handlePreview(report.id)}>
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
                            <DropdownMenuItem onClick={() => handleEmail(report.id)} className="gap-2">
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
                                setSelectedReportId(report.id);
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
    </div>
  );
}
