import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Filter, 
  Beaker, 
  AlertCircle, 
  ChevronRight, 
  Clock, 
  User,
  FlaskConical,
  ClipboardCheck,
  History,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Edit3,
  Eye,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { LabAttendanceOrder, ResultStatus } from '@/types/lab.types';
import ResultInputPanel from '@/components/lab/ResultInputPanel';
import { toast } from 'sonner';

interface LabTechnicalWorkPageProps {
  view: 'inbox' | 'validation';
}

// Mock Data
const MOCK_ORDERS: LabAttendanceOrder[] = [
  {
    id: '1',
    patientId: 'p1',
    patientName: 'FRANCISCO RUBIAN',
    patientCpf: '123.456.789-00',
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
    createdAt: '2026-07-15T08:00:00Z',
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
    patientCpf: '234.567.890-11',
    patientBirthDate: '1970-10-20',
    patientGender: 'M',
    protocol: '20260715-569-65',
    originId: 'o1',
    originCode: 1,
    status: 'confirmed',
    createdAt: '2026-07-15T09:30:00Z',
    companyId: 'c1',
    exams: [
      {
        examId: 'e1',
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
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase flex justify-between">
                    <span>{order.protocol}</span>
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
                      <Badge variant="outline" className="text-[10px] h-5">{selectedOrder.patientGender}, {new Date().getFullYear() - new Date(selectedOrder.patientBirthDate).getFullYear()} anos</Badge>
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
                  <Button variant="outline" className="gap-2">
                    <RefreshCcw className="h-4 w-4" /> Solicitar Reteste
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" /> Solicitar Recoleta
                  </Button>
                  {selectedExam.status === 'waiting_approval' && (
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 ml-auto">
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
                  exam={selectedExam} 
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
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" /> Visualizar Laudo
                </Button>
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
    </div>
  );
}
