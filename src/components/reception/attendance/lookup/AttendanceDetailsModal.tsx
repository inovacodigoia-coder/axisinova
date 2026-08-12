import { useState, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X, Printer, Pencil, Trash2, Plus, ArrowLeft, MoreVertical, CreditCard, Droplets, ShieldCheck, DollarSign, Calendar, Clock, MapPin, User, FileText, ChevronDown, History, BarChart3, Database, RefreshCw, Info, Smartphone, Calculator, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import type { Patient } from '@/types/patient.types'
import type { LabAttendanceOrder } from '@/types/lab.types'
import { TUBE_TYPES } from '@/types/lab.types'
import { cn } from '@/lib/utils'
import { AttendancePrintSelectionModal } from '../print/AttendancePrintSelectionModal'
import PDFPreviewModal from '@/components/lab/PDFPreviewModal'
import { AttendancePrintModal } from '../print/AttendancePrintModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import type { AttendanceControlDocument, PrinterConfig } from '@/types/payment-print.types'
import { format } from 'date-fns'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AttendanceDetailsModalProps {
  open: boolean
  onClose: () => void
  onOrderDeleted?: () => void
  order: AttendanceOrder
  patient?: Patient
}

export function AttendanceDetailsModal({ open, onClose, onOrderDeleted, order, patient }: AttendanceDetailsModalProps) {
  const [printSelectionOpen, setPrintSelectionOpen] = useState(false)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printDoc, setPrintDoc] = useState<AttendanceControlDocument | null>(null)
  const [selectedPrinterOverride, setSelectedPrinterOverride] = useState<PrinterConfig | undefined>(undefined)
  const [enabledVias, setEnabledVias] = useState<('patient' | 'establishment')[]>(['patient'])
  const [forecastModalOpen, setForecastModalOpen] = useState(false)
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set())
  const [selectedTubes, setSelectedTubes] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const labOrder = order as LabAttendanceOrder;

  // Transform labGuides into flat exams list if available
  const orderExams = useMemo(() => {
    if (labOrder.exams && labOrder.exams.length > 0) {
      return labOrder.exams.map(e => ({
        ...e,
        isColeta: e.isColeta || order.status === 'collection_done' || order.status === 'waiting_collection' || order.status === 'in_analysis' || order.status === 'validation' || order.status === 'released'
      }));
    }
    
    // Fallback or mapping from labGuides if standard exams not present
    if (labOrder.labGuides) {
      return labOrder.labGuides.flatMap(guide => 
        (guide.exams || []).map((exam: any) => ({
          ...exam,
          convenioName: guide.convenioName || order.convenioName,
          doctorName: guide.doctorName || order.doctorName,
          doctorCRM: guide.doctorCRM || order.doctorCRM,
          isColeta: exam.isColeta || order.status === 'collection_done' || order.status === 'waiting_collection' || order.status === 'in_analysis' || order.status === 'validation' || order.status === 'released'
        }))
      );
    }
    
    // Legacy mapping for direct orders
    return [{
      examId: order.procedureId || 'legacy',
      code: order.procedureCode || '0000000',
      name: order.procedureName || 'Procedimento',
      material: 'SANGUE TOTAL',
      status: order.status === 'collection_done' ? 'liberado' : 'pending',
      isCobrado: true,
      isColeta: order.status === 'collection_done' || order.status === 'waiting_collection' || order.status === 'in_analysis' || order.status === 'validation' || order.status === 'released',
      previsaoEntrega: order.deliveryDate || '',
      convenioName: order.convenioName,
      doctorName: order.doctorName,
      doctorCRM: order.doctorCRM
    }];
  }, [labOrder, order]);

  // Derived tubes list
  const patientTubes = useMemo(() => {
    const materials = new Set(orderExams.map(e => e.material).filter(Boolean));
    return TUBE_TYPES.filter(tube => 
      materials.has(tube.label) || 
      materials.has(tube.type) ||
      (tube.type === 'gel' && materials.has('Soro')) ||
      (tube.type === 'edta' && (materials.has('Sangue Total') || materials.has('Sangue'))) ||
      (tube.type === 'citrato' && materials.has('Plasma')) ||
      (tube.type === 'urina' && (materials.has('Urina') || materials.has('Urina Amostra')))
    );
  }, [orderExams]);
  const handleDeleteOrder = async () => {
    try {
      setIsDeleting(true);
      
      const { error } = await supabase
        .from('attendance_orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Atendimento excluído com sucesso.",
      });

      onClose();
      if (onOrderDeleted) {
        onOrderDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o atendimento.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'open':
      case 'waiting':
      case 'waiting_collection':
        return 'bg-blue-500';
      case 'collection_done':
      case 'collected':
      case 'liberado':
        return 'bg-emerald-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-slate-400';
    }
  };

  const isCollected = order.status === 'collection_done' || 
                      order.status === 'waiting_collection' || 
                      order.status === 'in_analysis' || 
                      order.status === 'validation' || 
                      order.status === 'released' || 
                      labOrder.collectionStatus === 'collected';



  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 bg-[#F8FAFC] border-none shadow-2xl [&>button]:hidden overflow-hidden scrollbar-thin scrollbar-thumb-gray-300">
        {/* Header Navigation */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Detalhes Atendimento</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Atendimento</span>
            <span className="text-foreground font-medium">/</span>
            <span className="text-foreground font-medium">{order.orderNumber}</span>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          {/* Attendance ID Card */}
          <div className="gradient-bg rounded-lg p-4 text-white flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[100px] hover:shadow-xl transition-shadow">
            <div className="flex justify-between items-start relative z-10">
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">ATENDIMENTO</span>
              <div className="flex gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 text-white hover:bg-white/20"
                  onClick={() => setPrintSelectionOpen(true)}
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="flex items-center gap-2">
                      <Pencil className="h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Auditoria</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        <span>Pulse</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>Status da Amostra</DropdownMenuItem>
                        <DropdownMenuItem>Rastreabilidade</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span>Histórico de Impressões</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Laudo por Versão</span>
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        <span>Integração Atendimento</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem>Sincronizar Agora</DropdownMenuItem>
                        <DropdownMenuItem>Logs de Integração</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Laudo Evolutivo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>Mais Informações</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir Pedido</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="text-xl font-bold relative z-10">{order.orderNumber}</div>
            <div className="absolute -bottom-2 -right-2 opacity-10">
              <Clock className="h-16 w-16 rotate-12" />
            </div>
          </div>

          {/* Client Card */}
          <div className="bg-white rounded-lg p-4 border border-border flex flex-col justify-between shadow-sm min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">CLIENTE</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Mais Informações do Cliente</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Editar Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span>Histórico de Consultas</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-sm font-bold text-foreground truncate uppercase">{order.patientName}</div>
          </div>

          {/* Forecast Card */}
          <div className="bg-white rounded-lg p-4 border border-border flex flex-col justify-between shadow-sm min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">PREVISÃO</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 text-muted-foreground"
                onClick={() => setForecastModalOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="text-sm font-bold text-foreground">
              {isCollected && order.deliveryDate 
                ? new Date(order.deliveryDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) 
                : '--/--/---- --:--'}
            </div>
          </div>

          {/* Date Card */}
          <div className="bg-white rounded-lg p-4 border border-border flex flex-col justify-between shadow-sm min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">DATA DO ATENDIMENTO</span>
            </div>
            <div className="text-sm font-bold text-foreground">
              {new Date(order.registeredAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-t-2xl shadow-inner">
          <Tabs defaultValue="guias" className="flex-1 flex flex-col">
            <div className="px-4 border-b border-border flex justify-center">
              <TabsList className="bg-transparent h-12 gap-8">
                <TabsTrigger value="guias" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-secondary rounded-none px-4 flex gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Guias</span>
                </TabsTrigger>
                <TabsTrigger value="amostras" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-secondary rounded-none px-4 flex gap-2">
                  <Droplets className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Amostras</span>
                </TabsTrigger>
                <TabsTrigger value="autorizacao" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-secondary rounded-none px-4 flex gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Autorização</span>
                </TabsTrigger>
                <TabsTrigger value="pagamentos" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-secondary rounded-none px-4 flex gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Pagamentos</span>
                </TabsTrigger>
              </TabsList>
            </div>

              <div className="flex-1 p-4 bg-[#F8FAFC] overflow-y-auto">
              <TabsContent value="guias" className="m-0 space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Exames</span>
                        <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{orderExams.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Convênio</span>
                        <span className="text-[10px] font-extrabold text-secondary uppercase">{order.convenioName || 'Particular'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Guide Action Icons */}
                  <div className="flex items-center gap-6 py-2 px-1 border-y border-border/50 bg-white/50 rounded-lg">
                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-primary group-hover:border-primary transition-all">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-primary">Guia</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-primary group-hover:border-primary transition-all">
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-primary">Conferir</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-primary group-hover:border-primary transition-all">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-primary">Imprimir</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-primary group-hover:border-primary transition-all">
                        <History className="h-4 w-4" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-primary">Histórico</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-primary group-hover:border-primary transition-all">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-primary">Atualizar</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-primary group-hover:border-primary transition-all">
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-primary">Editar Guia</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-emerald-600 group-hover:border-emerald-600 transition-all">
                        <RefreshCw className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-emerald-600 text-center">Trocar<br/>Convênio</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-slate-600 group-hover:border-slate-600 transition-all"
                        onClick={() => setPrintSelectionOpen(true)}
                      >
                        <Printer className="h-4 w-4 text-slate-600" />
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-slate-600 text-center">Imprimir<br/>Guia</span>
                    </div>

                    <div 
                      className="flex flex-col items-center gap-1 group cursor-pointer ml-auto"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-full bg-white shadow-sm border border-border group-hover:text-red-600 group-hover:border-red-600 transition-all"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase group-hover:text-red-600">Excluir</span>
                    </div>
                  </div>
                </div>

                {/* Groups exams by guide/convenio */}
                {(() => {
                  const guides = labOrder.labGuides && labOrder.labGuides.length > 0 
                    ? labOrder.labGuides 
                    : [{ 
                        convenioName: order.convenioName || 'Particular',
                        doctorName: order.doctorName,
                        doctorCRM: order.doctorCRM,
                        exams: orderExams
                      }];

                  return guides.map((guide, idx) => {
                    const examsInGuide = guide.exams || orderExams.filter(e => e.convenioName === guide.convenioName);
                    if (examsInGuide.length === 0) return null;
                    
                    const hasComplement = examsInGuide.some((e: any) => e.complemento && e.complemento !== '-');
                    const hasJustification = examsInGuide.some((e: any) => e.justificativa && e.justificativa !== '-');
                    
                    return (
                      <div key={idx} className="bg-white rounded-lg border border-border shadow-sm overflow-hidden mb-4">
                        <div className="p-4 border-b border-border bg-muted/5 flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-secondary uppercase">{idx + 1}. {guide.convenioName || order.convenioName || 'Particular'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{guide.doctorName || order.doctorName || 'SEM MÉDICO INFORMADO'}</span>
                              {(guide.doctorCRM || order.doctorCRM) && <span>({guide.doctorCRM || order.doctorCRM})</span>}
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-2 border-b border-border w-10">
                                  <Checkbox 
                                    className="h-3.5 w-3.5" 
                                    checked={examsInGuide.length > 0 && examsInGuide.every((exam: any) => selectedExams.has(exam.examId || exam.id))}
                                    onCheckedChange={(checked) => {
                                      const newSelected = new Set(selectedExams);
                                      examsInGuide.forEach((exam: any) => {
                                        const id = exam.examId || exam.id;
                                        if (checked) newSelected.add(id);
                                        else newSelected.delete(id);
                                      });
                                      setSelectedExams(newSelected);
                                    }}
                                  />
                                </th>
                                <th className="px-4 py-2 border-b border-border">Procedimentos</th>
                                <th className="px-4 py-2 border-b border-border">Referência</th>
                                <th className="px-4 py-2 border-b border-border text-center">Cobrado</th>
                                <th className="px-4 py-2 border-b border-border text-center">Coleta</th>
                                <th className="px-4 py-2 border-b border-border">Material</th>
                                <th className="px-4 py-2 border-b border-border">Previsão Entrega</th>
                                <th className="px-4 py-2 border-b border-border text-center">Status</th>
                                {hasComplement && <th className="px-4 py-2 border-b border-border">Complemento</th>}
                                {hasJustification && <th className="px-4 py-2 border-b border-border">Justificativa</th>}
                                <th className="px-4 py-2 border-b border-border text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="text-[11px] divide-y divide-border">
                              {examsInGuide.map((exam: any, examIdx: number) => {
                                const examIsCollected = exam.isColeta || isCollected;
                                return (
                                  <tr key={examIdx} className="hover:bg-muted/10 group">
                                    <td className="px-4 py-3">
                                      <Checkbox 
                                        className="h-3.5 w-3.5" 
                                        checked={selectedExams.has(exam.examId || exam.id)}
                                        onCheckedChange={(checked) => {
                                          const newSelected = new Set(selectedExams);
                                          const id = exam.examId || exam.id;
                                          if (checked) newSelected.add(id);
                                          else newSelected.delete(id);
                                          setSelectedExams(newSelected);
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className="bg-primary text-white rounded-full px-1.5 py-0.5 text-[8px] font-bold">EX</span>
                                        <span className="font-medium text-foreground uppercase">{exam.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground font-mono uppercase">{(exam.code || exam.internalCode || '0000000').toUpperCase()}</td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex justify-center">
                                        <div className={cn("w-4 h-4 rounded flex items-center justify-center text-white", exam.isCobrado ? "bg-emerald-500" : "bg-slate-200")}>
                                          <ShieldCheck className="h-3 w-3" />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className="flex justify-center">
                                        <div className={cn("w-2.5 h-2.5 rounded-full", examIsCollected ? "bg-emerald-500" : "bg-slate-300")} />
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground uppercase">{exam.material || 'SANGUE'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {examIsCollected && (exam.previsaoEntrega || order.deliveryDate) 
                                        ? (
                                          <div className="font-bold text-slate-600">
                                            {format(new Date(exam.previsaoEntrega || order.deliveryDate!), 'dd/MM/yyyy - HH:mm')}
                                          </div>
                                        )
                                        : '--/--/---- --:--'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mx-auto bg-[#00A859] text-white text-[10px] font-bold")}>
                                        L
                                      </div>
                                    </td>
                                    {hasComplement && <td className="px-4 py-3 text-muted-foreground">{exam.complemento || '-'}</td>}
                                    {hasJustification && <td className="px-4 py-3 text-muted-foreground">{exam.justificativa || '-'}</td>}
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="outline" className="h-7 w-7 bg-white"><Pencil className="h-3.5 w-3.5" /></Button>
                                        <Button size="icon" variant="outline" className="h-7 w-7 bg-white"><Calendar className="h-3.5 w-3.5" /></Button>
                                        <Button size="icon" variant="outline" className="h-7 w-7 bg-white"><Info className="h-3.5 w-3.5" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()}
              </TabsContent>

              <TabsContent value="amostras" className="m-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-white border border-border rounded-full px-3 py-1 shadow-sm">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Amostras</span>
                    <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{patientTubes.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white h-8 text-[10px] font-bold uppercase tracking-wider">RESTRIÇÕES</Button>
                    <Button variant="outline" size="sm" className="bg-white h-8 text-[10px] font-bold uppercase tracking-wider">COLETA</Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-muted-foreground ml-1"
                      onClick={() => setPrintSelectionOpen(true)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2 border-b border-border w-10">
                          <Checkbox 
                            className="h-3.5 w-3.5" 
                            checked={patientTubes.length > 0 && patientTubes.every((_, idx) => selectedTubes.has(`${order.orderNumber}-${idx + 1}`))}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTubes);
                              patientTubes.forEach((_, idx) => {
                                const id = `${order.orderNumber}-${idx + 1}`;
                                if (checked) newSelected.add(id);
                                else newSelected.delete(id);
                              });
                              setSelectedTubes(newSelected);
                            }}
                          />
                        </th>
                        <th className="px-4 py-2 border-b border-border">Código</th>
                        <th className="px-4 py-2 border-b border-border">Descrição</th>
                        <th className="px-4 py-2 border-b border-border">Material</th>
                        <th className="px-4 py-2 border-b border-border">Setor</th>
                        <th className="px-4 py-2 border-b border-border">Procedimentos</th>
                        <th className="px-4 py-2 border-b border-border">Status</th>
                        <th className="px-4 py-2 border-b border-border">Data Coleta</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] divide-y divide-border">
                      {patientTubes.length > 0 ? patientTubes.map((tube, tubeIdx) => (
                        <tr key={tubeIdx}>
                          <td className="px-4 py-3">
                            <Checkbox 
                              className="h-3.5 w-3.5" 
                              checked={selectedTubes.has(`${order.orderNumber}-${tubeIdx + 1}`)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedTubes);
                                const id = `${order.orderNumber}-${tubeIdx + 1}`;
                                if (checked) newSelected.add(id);
                                else newSelected.delete(id);
                                setSelectedTubes(newSelected);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("text-white rounded-full px-2 py-0.5 text-[9px] font-bold", tube.color)}>
                              {order.orderNumber}-{tubeIdx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-bold">{tube.label.toUpperCase()} ({tube.type.toUpperCase()})</td>
                          <td className="px-4 py-3 text-muted-foreground uppercase">{orderExams.find(e => e.material === tube.label)?.workbench || 'GERAL'}</td>
                          <td className="px-4 py-3 text-muted-foreground uppercase">SANGUE</td>
                          <td className="px-4 py-3 text-muted-foreground uppercase truncate max-w-[200px]">
                            {orderExams.filter(e => e.material === tube.label || (tube.type === 'gel' && e.material === 'Soro')).map(e => e.name).join(', ') || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("font-bold uppercase", isCollected ? "text-emerald-600" : "text-amber-500")}>
                              {isCollected ? 'Coletado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(order.registeredAt).toLocaleDateString('pt-BR')} {new Date(order.registeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
                            Nenhuma amostra identificada para os exames deste pedido
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="autorizacao" className="m-0">
                <div className="bg-white rounded-lg border border-border shadow-sm p-8 text-center">
                  <ShieldCheck className="h-12 w-12 text-[#007AFF] mx-auto mb-4 opacity-20" />
                  <h3 className="text-sm font-bold text-foreground mb-1 uppercase">Autorização do Plano</h3>
                  <p className="text-xs text-muted-foreground">
                    Código: <span className="font-bold text-foreground">{order.authorizationCode || 'NÃO INFORMADO'}</span>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="pagamentos" className="m-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <PaymentCard icon={<DollarSign className="h-4 w-4" />} label="TOTAL" value={`R$ ${order.privateValue?.toFixed(2) || '0,00'}`} color="bg-[#007AFF]" />
                  <PaymentCard icon={<span className="font-bold">%</span>} label="DESCONTO" value="R$ 0,00" color="bg-slate-500" />
                  <PaymentCard icon={<DollarSign className="h-4 w-4" />} label="TOTAL GERAL" value={`R$ ${order.privateValue?.toFixed(2) || '0,00'}`} color="bg-slate-500" />
                  <PaymentCard icon={<ArrowLeft className="h-4 w-4 rotate-270" />} label="PAGO" value="R$ 0,00" color="bg-emerald-500" />
                  <PaymentCard icon={<ArrowLeft className="h-4 w-4 rotate-90" />} label="CRÉDITO" value="R$ 0,00" color="bg-[#007AFF]" />
                  <PaymentCard icon={<FileText className="h-4 w-4" />} label="NOTA FISCAL" value="NÃO GERADA" color="bg-slate-500" />
                  <PaymentCard icon={<User className="h-4 w-4" />} label="RESP. FINANCEIRO" value="NÃO INFORMADO" color="bg-slate-500" />
                </div>
                
                <div className="bg-white rounded-lg border border-border shadow-sm p-8 text-center border-dashed">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pedido não requer pagamento ou já foi faturado pelo convênio</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>

      <AttendancePrintSelectionModal 
        open={printSelectionOpen}
        onClose={() => setPrintSelectionOpen(false)}
        onConfirm={(result) => {
          console.log('Printing with result:', result);
          setPrintSelectionOpen(false);

          // Check if "Laudo" was selected to show the specific preview modal
          const laudoOption = result.options.find((o: any) => o.id === 'laudo' && o.enabled);
          if (laudoOption) {
            setReportPreviewOpen(true);
            return; // Don't proceed to standard attendance receipts if laudo is the primary focus
          }
          
          // Determine which vias to print based on selection
          const vias: ('patient' | 'establishment')[] = [];
          
          // Use a Map or unique values to avoid duplication
          const selectedViaTypes = new Set<string>();
          result.options.forEach((o: any) => {
            if (o.enabled) {
              if (o.id === 'comprovante') selectedViaTypes.add('patient');
              if (o.id === 'controle_interno') selectedViaTypes.add('establishment');
            }
          });

          vias.push(...Array.from(selectedViaTypes) as ('patient' | 'establishment')[]);
          
          setEnabledVias(vias);
          
          // Identify the primary selected area (e.g., Comprovante) to pick paper size
          const mainOption = result.options.find((o: any) => o.enabled && o.id === 'comprovante') || 
                             result.options.find((o: any) => o.enabled);
          
          if (mainOption) {
            const formatSelected = mainOption.selectedFormat;
            const isThermal = formatSelected === 'TÉRMICA';
            
            const configOverride: any = {
              paperSize: isThermal ? '80mm' : (formatSelected === 'A5' ? 'a5' : 'a4'),
              showLogo: true,
              showCompanyName: true,
              showUnitName: true,
              showAddress: !isThermal,
              showPhone: true,
              showCNPJ: true,
              showQRCode: true,
              showBarcode: isThermal,
              showDoctorInfo: true,
              showConvenioInfo: true,
              showAuthorizationInfo: true,
              showAttachmentChecklist: !isThermal,
              showObservations: true,
              showSignatureLine: !isThermal,
              showTimestamp: true,
              defaultCopies: result.printerSettings?.batchSize || 1,
            };
            
            setSelectedPrinterOverride(configOverride);
          }

          // Transform order to print document
          const doc: AttendanceControlDocument = {
            orderNumber: order.orderNumber,
            orderDate: format(new Date(order.registeredAt), 'dd/MM/yyyy'),
            orderTime: format(new Date(order.registeredAt), 'HH:mm'),
            patientId: order.patientId,
            patientName: order.patientName,
            patientBirthDate: order.patientBirthDate || patient?.birthDate,
            patientAge: (order as any).patientAge || patient?.age?.toString() || '0 anos',
            patientGender: order.patientGender === 'female' ? 'F' : 'M',
            patientCPF: (order as any).patientCPF || patient?.cpf,
            serviceType: (order.serviceType as string) === 'lab' ? 'LABORATÓRIO' : 'CLÍNICA',
            unitName: (order as any).unitName || 'MATRIZ',
            companyName: 'AXIS INOVA',
            companyLogo: undefined,
            companyAddress: 'Av. Afonso Pena, 952 - Tirol, Natal - Tel: (84) 4007-2595',
            companyCNPJ: '00.000.000/0001-00',
            companyPhone: '(84) 4007-2595',
            registeredByName: order.registeredByName || 'Sistema',
            convenioName: order.convenioName || 'PARTICULAR',
            paymentType: order.paymentType === 'private' ? 'PARTICULAR' : 'CONVÊNIO',
            locatorCode: order.orderNumber.replace('-', ''),
            password: Math.floor(1000 + Math.random() * 9000).toString(),
            attachments: [],
            exams: orderExams
              .filter(exam => selectedExams.size === 0 || selectedExams.has(exam.examId || exam.id))
              .map(exam => ({
                name: exam.name,
                code: exam.code || '',
                forecastDate: exam.previsaoEntrega || order.deliveryDate || '',
                doctorName: exam.doctorName || order.doctorName,
                doctorCRM: exam.doctorCRM || order.doctorCRM
              }))
          };
          
          setPrintDoc(doc);
          setPrintModalOpen(true);
          
          // Se for etiqueta, podemos querer passar os tubos selecionados
          // mas o AttendancePrintModal atual parece focado em A4/A5/Térmica
          // O AttendanceReceiptVia é que renderiza o conteúdo.
        }}
        order={order}
        selectedExams={Array.from(selectedExams)}
        selectedTubes={Array.from(selectedTubes)}
      />

      {printDoc && (
        <AttendancePrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          document={printDoc}
          autoPrint={true}
          overrideConfig={selectedPrinterOverride}
          vias={enabledVias}
        />
      )}

      {reportPreviewOpen && (
        <PDFPreviewModal
          isOpen={reportPreviewOpen}
          onClose={() => setReportPreviewOpen(false)}
          order={labOrder}
          onDownload={() => console.log('Download triggered')}
        />
      )}

      {/* Alterar Previsão Modal */}
      <Dialog open={forecastModalOpen} onOpenChange={setForecastModalOpen}>
        <DialogContent className="max-w-[700px] p-0 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-lg font-medium text-slate-800">Alterar Previsão</h3>
            <Button variant="ghost" size="icon" onClick={() => setForecastModalOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="max-h-[500px]">
            <div className="p-6 space-y-8">
              <div className="space-y-6">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GUIA 1. INTER-LIGA</div>
                
                <div className="space-y-6 pl-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-slate-700 uppercase">H</span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">- HEMOGRAMA COM CONTAG (STE)</span>
                    </div>
                    <div className="w-48 relative">
                      <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-medium text-slate-400 z-10">Previsão</label>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                        <span className="text-xs text-slate-600">24/07/2026 11:00</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400 ml-auto" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-slate-700 uppercase">PCRQT</span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">- PROTEINA C REATIVA, (SOR)</span>
                    </div>
                    <div className="w-48 relative">
                      <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-medium text-slate-400 z-10">Previsão</label>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                        <span className="text-xs text-slate-600">24/07/2026 11:00</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400 ml-auto" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-slate-700 uppercase">U</span>
                      <span className="text-[10px] font-medium text-slate-500 uppercase">- URÉIA (SOR)</span>
                    </div>
                    <div className="w-48 relative">
                      <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-medium text-slate-400 z-10">Previsão</label>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2 bg-slate-50">
                        <span className="text-xs text-slate-600">24/07/2026 11:00</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400 ml-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Smartphone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="notificar" className="h-4 w-4 border-slate-300" />
                      <label htmlFor="notificar" className="text-xs font-medium text-slate-600">Notificar Cliente</label>
                    </div>
                  </div>
                </div>

                <div className="w-48 relative">
                  <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-medium text-slate-400 z-10">Meio</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2 bg-white">
                    <span className="text-xs text-slate-400">Telefone</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/30">
            <Button variant="ghost" onClick={() => setForecastModalOpen(false)} className="text-xs font-bold uppercase tracking-widest text-slate-600">
              CANCELAR
            </Button>
            <div className="flex gap-4">
              <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-slate-800 flex gap-2">
                <Calculator className="h-4 w-4" />
                RECALCULAR
              </Button>
              <Button className="bg-[#007AFF] hover:bg-blue-700 text-white px-8 text-xs font-bold uppercase tracking-widest h-10 shadow-lg">
                SALVAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir o atendimento <strong>{order.orderNumber}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteOrder();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

function PaymentCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-border flex overflow-hidden shadow-sm h-14">
      <div className={cn("w-10 flex items-center justify-center text-white shrink-0", color)}>
        {icon}
      </div>
      <div className="flex-1 px-3 flex flex-col justify-center min-w-0">
        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter leading-tight">{label}</span>
        <span className="text-[10px] font-black text-foreground uppercase truncate leading-tight">{value}</span>
      </div>
      <div className="w-6 flex items-center justify-center border-l border-border hover:bg-muted cursor-pointer">
        <MoreVertical className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  )
}
