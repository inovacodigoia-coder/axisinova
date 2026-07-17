import { useState, useEffect } from 'react';
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
  Eye,
  Check,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LabAttendanceOrder } from '@/types/lab.types';
import ResultInputPanel from '@/components/lab/ResultInputPanel';
import PDFPreviewModal from '@/components/lab/PDFPreviewModal';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileEdit,
  AlertCircle
} from 'lucide-react';

interface LabTechnicalWorkPageProps {
  view: 'inbox' | 'validation';
}

const MOCK_ORDERS: LabAttendanceOrder[] = [
  {
    id: '1',
    patientId: 'p1',
    patientName: 'FRANCISCO RUBIAN',
    patientBirthDate: '1985-05-15',
    patientGender: 'M',
    protocol: '20260715-756-75',
    originId: 'o1',
    originCode: 1,
    status: 'open',
    orderNumber: '1',
    serviceType: 'exam',
    paymentType: 'private',
    attachments: [],
    attachmentRulesSatisfied: true,
    registeredBy: 'u1',
    registeredAt: '2026-07-15T08:00:00Z',
    updatedAt: '2026-07-15T08:00:00Z',
    companyId: 'c1',
    unitId: 'u1',
    exams: [
      {
        examId: 'e1',
        code: 'GLI',
        name: 'Glicose',
        material: 'Plasma Fluoretado',
        status: 'pending',
        isCobrado: true,
        isColeta: false,
        previsaoEntrega: '2026-07-16',
        valor: 15.00,
        workbench: 'Bioquímica'
      },
      {
        examId: 'e2',
        code: 'HEM',
        name: 'Hemograma Completo',
        material: 'Sangue Total EDTA',
        status: 'pending',
        isCobrado: true,
        isColeta: false,
        previsaoEntrega: '2026-07-16',
        valor: 25.00,
        workbench: 'Hematologia'
      }
    ]
  },
  {
    id: '2',
    patientId: 'p2',
    patientName: 'AILSON MENEZES',
    patientBirthDate: '1970-10-20',
    patientGender: 'M',
    protocol: '20260715-569-65',
    originId: 'o1',
    originCode: 1,
    status: 'open',
    orderNumber: '2',
    serviceType: 'exam',
    paymentType: 'private',
    attachments: [],
    attachmentRulesSatisfied: true,
    registeredBy: 'u1',
    registeredAt: '2026-07-15T09:30:00Z',
    updatedAt: '2026-07-15T09:30:00Z',
    companyId: 'c1',
    unitId: 'u1',
    exams: [
      {
        examId: 'e3',
        code: 'GLI',
        name: 'Glicose',
        material: 'Plasma Fluoretado',
        status: 'waiting_approval',
        isCobrado: true,
        isColeta: false,
        previsaoEntrega: '2026-07-16',
        valor: 15.00,
        workbench: 'Bioquímica',
        results: [
          {
            parameterId: 'p1',
            parameterCode: 'GLI',
            value: '280',
            status: 'critical',
            wasCalculated: false
          }
        ]
      }
    ]
  }
];

export default function LabTechnicalWorkPage({ view }: LabTechnicalWorkPageProps) {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showRetesteModal, setShowRetesteModal] = useState(false);
  const [showRecoletaModal, setShowRecoletaModal] = useState(false);
  const [showRetificacaoModal, setShowRetificacaoModal] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [retesteMotivo, setRetesteMotivo] = useState('');
  const [retificacaoMotivo, setRetificacaoMotivo] = useState('');
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const orders = MOCK_ORDERS.filter(order => {
    const matchesSearch = order.patientName.toLowerCase().includes(search.toLowerCase()) || 
                          order.protocol.includes(search);
    
    if (view === 'inbox') {
      return matchesSearch && order.exams.some(e => e.status === 'pending' || e.status === 'processing');
    } else {
      return matchesSearch && order.exams.some(e => e.status === 'waiting_approval');
    }
  });

  const selectedOrder = MOCK_ORDERS.find(o => o.id === selectedOrderId);
  const selectedExam = selectedOrder?.exams.find(e => e.examId === selectedExamId);

  const handleSelectExam = (orderId: string, examId: string) => {
    setSelectedOrderId(orderId);
    setSelectedExamId(examId);
    setIsTyping(false);
  };

  const toggleBatchSelection = (orderId: string) => {
    setSelectedBatchOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBatchDownload = () => {
    if (selectedBatchOrders.length === 0) {
      toast.error("Selecione pelo menos um laudo para download em lote.");
      return;
    }

    toast.loading(`Gerando ${selectedBatchOrders.length} laudos...`, { id: 'batch-download' });

    // Mock batch download logic
    setTimeout(() => {
      // Simulate potential error
      if (Math.random() < 0.1) {
        toast.error("Erro ao gerar PDF em lote", {
          id: 'batch-download',
          description: "Ocorreu uma falha de conexão com o servidor de relatórios. Tente novamente."
        });
        return;
      }

      toast.success(`${selectedBatchOrders.length} laudos baixados com sucesso!`, {
        id: 'batch-download',
        description: "Os arquivos foram compactados em um arquivo .zip"
      });
      setSelectedBatchOrders([]);
    }, 2000);
  };

  const handleDownloadPDF = () => {
    const isError = Math.random() < 0.1; // 10% chance of mock error

    toast.loading("Processando PDF...", { id: 'pdf-gen' });

    setTimeout(() => {
      if (isError) {
        toast.error("Falha ao gerar PDF", {
          id: 'pdf-gen',
          description: "Não foi possível conectar ao motor de renderização. Verifique sua internet."
        });
      } else {
        toast.success("PDF gerado com sucesso!", {
          id: 'pdf-gen',
          description: "O download iniciará automaticamente."
        });
        setShowPDFPreview(false);
      }
    }, 1500);
  };

  const handleStartTyping = () => {
    setIsTyping(true);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 overflow-hidden">
      {/* Left Sidebar: Queue */}
      <div className="w-80 flex flex-col gap-4">
        <div className="space-y-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            {view === 'inbox' ? <FlaskConical className="h-5 w-5 text-primary" /> : <ClipboardCheck className="h-5 w-5 text-teal-600" />}
            {view === 'inbox' ? 'Caixa de Entrada' : 'Validação Técnica'}
          </h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20" 
              placeholder="Protocolo ou paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {view === 'inbox' && (
            <Button 
              variant="outline" 
              className="w-full h-8 gap-2 text-[10px] font-bold uppercase tracking-wider"
              onClick={() => setShowBatchModal(true)}
            >
              <ClipboardCheck className="h-3.5 w-3.5" /> Digitação em Lote
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <Card key={i} className="p-3">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">Nenhum registro encontrado.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={selectedBatchOrders.includes(order.id)}
                        onChange={() => toggleBatchSelection(order.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                      />
                      <span>{order.protocol}</span>
                    </div>
                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> 10m</span>
                  </div>
                  {order.exams
                    .filter(e => {
                      if (view === 'inbox') return e.status === 'pending' || e.status === 'processing';
                      return e.status === 'waiting_approval';
                    })
                    .map((exam) => (
                    <button
                      key={exam.examId}
                      onClick={() => handleSelectExam(order.id, exam.examId)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50",
                        selectedExamId === exam.examId && selectedOrderId === order.id
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-card border-border"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm truncate max-w-[160px]">{order.patientName}</span>
                        {exam.status === 'waiting_approval' && <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] h-4">Validar</Badge>}
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground">{exam.name}</span>
                        <span className="font-mono text-muted-foreground">{exam.code}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {selectedOrder && selectedExam ? (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Exam Header */}
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/10">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      {selectedOrder.patientName}
                      <Badge variant="outline" className="text-[10px] h-5">{selectedOrder.patientGender === 'M' ? 'Masc' : 'Fem'}, {new Date().getFullYear() - new Date(selectedOrder.patientBirthDate).getFullYear()} anos</Badge>
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Beaker className="h-3 w-3" /> {selectedExam.name} ({selectedExam.code})</span>
                      <span className="flex items-center gap-1"><FlaskConical className="h-3 w-3" /> {selectedExam.material}</span>
                      <span className="flex items-center gap-1 font-mono">{selectedOrder.protocol}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <History className="h-3.5 w-3.5" /> Histórico
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive border-destructive/20">
                    <XCircle className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                </div>
              </div>

              {!isTyping && (
                <div className="mt-4 flex gap-2 border-t pt-4">
                  <Button 
                    className="gradient-bg text-white gap-2" 
                    onClick={handleStartTyping}
                  >
                    <Edit3 className="h-4 w-4" /> Digitar resultados
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => setShowRetesteModal(true)}>
                    <RefreshCcw className="h-4 w-4" /> Solicitar Reteste
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => setShowRecoletaModal(true)}>
                    <AlertTriangle className="h-4 w-4 text-orange-500" /> Solicitar Recoleta
                  </Button>
                  {selectedExam.status === 'validated' && (
                    <Button variant="outline" className="gap-2 border-orange-200 bg-orange-50 text-orange-700" onClick={() => setShowRetificacaoModal(true)}>
                      <FileEdit className="h-4 w-4" /> Retificar Laudo
                    </Button>
                  )}
                  {selectedExam.status === 'waiting_approval' && (
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 ml-auto" onClick={() => {
                      toast.success('Exame liberado com sucesso');
                      // In a real app, update state here
                    }}>
                      <CheckCircle2 className="h-4 w-4" /> Aprovar Exame
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Typing/Display Panel */}
            <div className="flex-1 overflow-hidden">
              {isTyping ? (
                <ResultInputPanel 
                  exam={selectedExam as any} 
                  order={selectedOrder}
                  onCancel={() => setIsTyping(false)}
                  onSave={() => {
                    toast.success('Resultados salvos com sucesso');
                    setIsTyping(false);
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-muted/20 rounded-xl border-2 border-dashed border-border">
                  <Beaker className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Clique em "Digitar resultados" para inserir os valores.</p>
                </div>
              )}
            </div>
            
            {/* Bottom Actions for Attendance */}
            <div className="flex items-center justify-between p-4 bg-background border rounded-xl">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowPDFPreview(true)}>
                  <Eye className="h-4 w-4" /> Visualizar Laudo
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
                {selectedBatchOrders.length > 0 && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                    onClick={handleBatchDownload}
                  >
                    <Download className="h-4 w-4" /> Download Lote ({selectedBatchOrders.length})
                  </Button>
                )}
              </div>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                <Check className="h-4 w-4" /> Validar Tudo e Liberar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-card rounded-2xl border border-border">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
              <FlaskConical className="h-10 w-10 opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-muted-foreground">Selecione um exame</h3>
            <p className="text-sm text-muted-foreground">Escolha um registro na fila lateral para iniciar o trabalho técnico.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Digitação em Lote</DialogTitle>
            <DialogDescription>Aplique resultados padronizados para múltiplos pacientes simultaneamente.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase">Exame</label>
                <select className="w-full p-2 text-sm border rounded-md">
                  <option>Urina Tipo 1</option>
                  <option>Hemograma Completo</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase">Bancada</label>
                <div className="text-sm font-bold p-2 bg-muted rounded-md uppercase">Uroanálise</div>
              </div>
            </div>
            
            <div className="border p-4 rounded-lg bg-muted/30">
              <p className="text-xs font-bold mb-3 uppercase flex items-center gap-2">
                <FlaskConical className="h-3 w-3" /> Valores a aplicar em lote:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Aspecto</span>
                  <input className="w-full p-2 text-sm border rounded bg-background" placeholder="Límpido" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Cor</span>
                  <input className="w-full p-2 text-sm border rounded bg-background" placeholder="Amarelo Citrino" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Depósito</span>
                  <input className="w-full p-2 text-sm border rounded bg-background" placeholder="Ausente" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                * Campos em branco não serão alterados nos exames selecionados.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchModal(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={() => setShowBatchModal(false)}>Aplicar em lote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {selectedOrder && (
        <PDFPreviewModal 
          isOpen={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
          patientName={selectedOrder.patientName}
          protocol={selectedOrder.protocol}
          onDownload={handleDownloadPDF}
          status={selectedExam?.status}
        />
      )}

      <Dialog open={showRetesteModal} onOpenChange={setShowRetesteModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Solicitar Reteste</DialogTitle>
            <DialogDescription>O exame voltará para a fila técnica com prioridade alta.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Motivo (obrigatório)</label>
              <select className="w-full p-2 border rounded-md text-sm" value={retesteMotivo} onChange={(e) => setRetesteMotivo(e.target.value)}>
                <option value="">Selecione um motivo...</option>
                <option value="1">Divergência Clínica</option>
                <option value="2">Confirmação de Valor Crítico</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetesteModal(false)}>Cancelar</Button>
            <Button className="bg-primary text-white" disabled={!retesteMotivo} onClick={() => { toast.success('Reteste solicitado'); setShowRetesteModal(false); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showRecoletaModal} onOpenChange={setShowRecoletaModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Solicitar Recoleta</DialogTitle>
            <DialogDescription>Nova amostra necessária para este exame.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground italic">Paciente será notificado automaticamente.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecoletaModal(false)}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => { toast.success('Recoleta solicitada'); setShowRecoletaModal(false); }}>Solicitar Recoleta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRetificacaoModal} onOpenChange={setShowRetificacaoModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" /> 
              Retificar Laudo Liberado
            </DialogTitle>
            <DialogDescription>
              A retificação criará uma nova versão do laudo. O motivo será registrado na trilha de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
              <p className="text-[11px] text-orange-800 leading-relaxed">
                Atenção: Ao retificar, o laudo anterior será invalidado. Se o resultado já foi visualizado pelo paciente/médico, uma notificação de retificação será enviada.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Justificativa da Alteração</label>
              <textarea 
                className="w-full p-3 border rounded-md text-sm min-h-[100px]"
                placeholder="Descreva detalhadamente o motivo da retificação..."
                value={retificacaoMotivo}
                onChange={(e) => setRetificacaoMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetificacaoModal(false)}>Cancelar</Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!retificacaoMotivo || retificacaoMotivo.length < 10}
              onClick={() => {
                toast.success('Retificação iniciada. Edite os valores agora.');
                setShowRetificacaoModal(false);
                setIsTyping(true);
              }}
            >Iniciar Retificação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
