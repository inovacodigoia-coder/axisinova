import { useState, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X, Printer, Pencil, Trash2, Plus, ArrowLeft, MoreVertical, CreditCard, Droplets, ShieldCheck, DollarSign, Calendar, Clock, MapPin, User, FileText, ChevronDown, History, BarChart3, Database, RefreshCw, Info, Smartphone, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import type { Patient } from '@/types/patient.types'
import type { LabAttendanceOrder } from '@/types/lab.types'
import { TUBE_TYPES } from '@/types/lab.types'
import { cn } from '@/lib/utils'
import { AttendancePrintSelectionModal } from '../print/AttendancePrintSelectionModal'
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



interface AttendanceDetailsModalProps {
  open: boolean
  onClose: () => void
  order: AttendanceOrder
  patient?: Patient
}

export function AttendanceDetailsModal({ open, onClose, order, patient }: AttendanceDetailsModalProps) {
  const [printSelectionOpen, setPrintSelectionOpen] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printDoc, setPrintDoc] = useState<AttendanceControlDocument | null>(null)
  const [selectedPrinterOverride, setSelectedPrinterOverride] = useState<PrinterConfig | undefined>(undefined)
  const [enabledVias, setEnabledVias] = useState<('patient' | 'establishment')[]>(['patient'])
  const [forecastModalOpen, setForecastModalOpen] = useState(false)
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set())
  const [selectedTubes, setSelectedTubes] = useState<Set<string>>(new Set())

  const labOrder = order as LabAttendanceOrder;

  const orderExams = useMemo(() => {
    if (labOrder.exams && labOrder.exams.length > 0) {
      return labOrder.exams.map(e => ({
        ...e,
        isColeta: e.isColeta || order.status === 'collection_done' || order.status === 'waiting_collection' || order.status === 'in_analysis' || order.status === 'validation' || order.status === 'released'
      }));
    }
    
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

  const isCollected = order.status === 'collection_done' || 
                      order.status === 'waiting_collection' || 
                      order.status === 'in_analysis' || 
                      order.status === 'validation' || 
                      order.status === 'released' || 
                      labOrder.collectionStatus === 'collected';



  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-[#F8FAFC] border-none shadow-2xl [&>button]:hidden">
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          <div className="gradient-bg rounded-lg p-4 text-white flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[100px]">
            <div className="flex justify-between items-start relative z-10">
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">ATENDIMENTO</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setPrintSelectionOpen(true)}>
                <Printer className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="text-xl font-bold relative z-10">{order.orderNumber}</div>
            <Clock className="absolute -bottom-2 -right-2 h-16 w-16 rotate-12 opacity-10" />
          </div>
          <div className="bg-white rounded-lg p-4 border border-border flex flex-col justify-between shadow-sm min-h-[100px]">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">CLIENTE</span>
            <div className="text-sm font-bold text-foreground truncate uppercase">{order.patientName}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-border flex flex-col justify-between shadow-sm min-h-[100px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">PREVISÃO</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={() => setForecastModalOpen(true)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-sm font-bold text-foreground">
              {isCollected && order.deliveryDate ? new Date(order.deliveryDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '--/--/---- --:--'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-border flex flex-col justify-between shadow-sm min-h-[100px]">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">DATA DO ATENDIMENTO</span>
            <div className="text-sm font-bold text-foreground">{new Date(order.registeredAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-t-2xl shadow-inner">
          <Tabs defaultValue="guias" className="flex-1 flex flex-col">
            <div className="px-4 border-b border-border flex justify-center">
              <TabsList className="bg-transparent h-12 gap-8">
                <TabsTrigger value="guias" className="data-[state=active]:border-b-2 data-[state=active]:border-secondary px-4 flex gap-2">
                  <FileText className="h-4 w-4" /> <span className="text-xs font-bold uppercase">Guias</span>
                </TabsTrigger>
                <TabsTrigger value="amostras" className="data-[state=active]:border-b-2 data-[state=active]:border-secondary px-4 flex gap-2">
                  <Droplets className="h-4 w-4" /> <span className="text-xs font-bold uppercase">Amostras</span>
                </TabsTrigger>
                <TabsTrigger value="autorizacao" className="data-[state=active]:border-b-2 data-[state=active]:border-secondary px-4 flex gap-2">
                  <ShieldCheck className="h-4 w-4" /> <span className="text-xs font-bold uppercase">Autorização</span>
                </TabsTrigger>
                <TabsTrigger value="pagamentos" className="data-[state=active]:border-b-2 data-[state=active]:border-secondary px-4 flex gap-2">
                  <CreditCard className="h-4 w-4" /> <span className="text-xs font-bold uppercase">Pagamentos</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 bg-[#F8FAFC]">
              <TabsContent value="guias" className="h-full m-0 flex flex-col focus-visible:outline-none">
                <div className="p-4 space-y-4 bg-white border-b border-border shadow-sm z-10">
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
                  <div className="flex items-center gap-6 py-2 px-1 border-y border-border/50 bg-white/50 rounded-lg">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={() => {}}>
                      <Plus className="h-3.5 w-3.5 text-primary" /> Guia
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={() => {}}>
                      <ShieldCheck className="h-3.5 w-3.5 text-secondary" /> Conferir
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={() => setPrintSelectionOpen(true)}>
                      <Printer className="h-3.5 w-3.5 text-primary" /> Imprimir
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={() => {}}>
                      <History className="h-3.5 w-3.5 text-muted-foreground" /> Histórico
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={() => {}}>
                      <RefreshCw className="h-3.5 w-3.5 text-primary" /> Atualizar
                    </Button>
                    <div className="h-4 w-px bg-border/50" />
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {}}>
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {}}>Editar Guia</Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {}}>Trocar Convênio</Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setPrintSelectionOpen(true)}>Imprimir Guia</Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {Object.entries(
                      orderExams.reduce((acc, exam) => {
                        const key = exam.convenioName || 'Particular';
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(exam);
                        return acc;
                      }, {} as Record<string, typeof orderExams>)
                    ).map(([convenio, exams], idx) => (
                      <div key={idx} className="bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="bg-[#F8FAFC] px-4 py-2 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-primary text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-bold text-foreground uppercase">{convenio}</span>
                          </div>
                        </div>
                        <table className="w-full text-xs">
                          <thead className="bg-[#F8FAFC] text-muted-foreground uppercase text-[10px] font-bold">
                            <tr>
                              <th className="px-4 py-2 text-left w-10">
                                <Checkbox 
                                  checked={exams.every(e => selectedExams.has(e.examId))}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedExams);
                                    exams.forEach(e => checked ? newSelected.add(e.examId) : newSelected.delete(e.examId));
                                    setSelectedExams(newSelected);
                                  }}
                                />
                              </th>
                              <th className="px-4 py-2 text-left">Procedimento</th>
                              <th className="px-4 py-2 text-left">Referência</th>
                              <th className="px-4 py-2 text-center">Cobrado</th>
                              <th className="px-4 py-2 text-center">Coleta</th>
                              <th className="px-4 py-2 text-left">Material</th>
                              <th className="px-4 py-2 text-left">Previsão</th>
                              <th className="px-4 py-2 text-left">Entrega</th>
                              <th className="px-4 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {exams.map((exam) => (
                              <tr key={exam.examId} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-2">
                                  <Checkbox 
                                    checked={selectedExams.has(exam.examId)}
                                    onCheckedChange={(checked) => {
                                      const newSelected = new Set(selectedExams);
                                      checked ? newSelected.add(exam.examId) : newSelected.delete(exam.examId);
                                      setSelectedExams(newSelected);
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <div className="font-medium text-foreground">{exam.name}</div>
                                  <div className="text-[10px] text-muted-foreground">{exam.code}</div>
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">00000000</td>
                                <td className="px-4 py-2 text-center">
                                  <div className={cn("w-2 h-2 rounded-full mx-auto", exam.isCobrado ? "bg-emerald-500" : "bg-red-500")} />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className={cn("w-2 h-2 rounded-full mx-auto", exam.isColeta ? "bg-emerald-500" : "bg-slate-300")} />
                                </td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-bold uppercase">
                                    {exam.material}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">
                                  {isCollected ? format(new Date(order.deliveryDate || Date.now()), 'dd/MM/yyyy HH:mm') : '--/--/----'}
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">--/--/----</td>
                                <td className="px-4 py-2">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white",
                                    exam.isColeta ? "bg-emerald-500" : "bg-blue-500"
                                  )}>
                                    {exam.isColeta ? "Coletado" : "Pendente"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
