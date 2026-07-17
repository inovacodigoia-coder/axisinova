import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Eye, 
  Download, 
  Check, 
  X, 
  Info,
  AlertTriangle,
  Calculator,
  MessageSquare,
  History as HistoryIcon,
  Bell,
  Mail,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LabAttendanceOrder, LabParameter, ResultStatus } from '@/types/lab.types';
import { toast } from 'sonner';

interface ResultInputPanelProps {
  exam: any; // Using any for simplicity in mock, should be LabAttendanceOrder['exams'][0]
  order: LabAttendanceOrder;
  onCancel: () => void;
  onSave: (results: any[]) => void;
}

// Mock Parameters for testing
const MOCK_PARAMETERS: Record<string, LabParameter[]> = {
  'GLI': [
    {
      id: 'p1',
      code: 'GLI',
      name: 'Glicose',
      unit: 'mg/dL',
      type: 'editable',
      references: [
        { id: 'r1', sex: 'Both', ageMin: 0, ageMax: 150, ageUnit: 'years', min: 70, max: 99, description: 'Normal' }
      ],
      criticalMin: 50,
      criticalMax: 400
    }
  ],
  'HEM': [
    { id: 'h1', code: 'HEM', name: 'Hemácias', unit: 'milhões/mm³', type: 'editable', references: [{ id: 'r1', sex: 'M', ageMin: 0, ageMax: 150, ageUnit: 'years', min: 4.5, max: 5.9 }] },
    { id: 'h2', code: 'HGB', name: 'Hemoglobina', unit: 'g/dL', type: 'editable', references: [{ id: 'r2', sex: 'M', ageMin: 0, ageMax: 150, ageUnit: 'years', min: 13.5, max: 17.5 }] },
    { id: 'h3', code: 'HCT', name: 'Hematócrito', unit: '%', type: 'editable', references: [{ id: 'r3', sex: 'M', ageMin: 0, ageMax: 150, ageUnit: 'years', min: 40, max: 52 }] },
    { 
      id: 'h4', 
      code: 'VCM', 
      name: 'VCM', 
      unit: 'fL', 
      type: 'calculated', 
      formula: '(HCT / HEM) * 10',
      references: [{ id: 'r4', sex: 'Both', ageMin: 0, ageMax: 150, ageUnit: 'years', min: 80, max: 100 }]
    },
    { 
      id: 'h5', 
      code: 'HCM', 
      name: 'HCM', 
      unit: 'pg', 
      type: 'calculated', 
      formula: '(HGB / HEM) * 10',
      references: [{ id: 'r5', sex: 'Both', ageMin: 0, ageMax: 150, ageUnit: 'years', min: 27, max: 32 }]
    }
  ]
};

export default function ResultInputPanel({ exam, order, onCancel, onSave }: ResultInputPanelProps) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ResultStatus>>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showDeltaModal, setShowDeltaModal] = useState(false);
  const [deltaInfo, setDeltaInfo] = useState<{ param: string, current: string, avg: string, variation: string } | null>(null);
  const [criticalParams, setCriticalParams] = useState<LabParameter[]>([]);
  const [justification, setJustification] = useState('');
  
  const parameters = MOCK_PARAMETERS[exam.code] || [];
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }

    // Load existing results if any
    if (exam.results) {
      const initialResults: Record<string, string> = {};
      const initialStatuses: Record<string, ResultStatus> = {};
      exam.results.forEach((r: any) => {
        initialResults[r.parameterId] = r.value;
        initialStatuses[r.parameterId] = r.status;
      });
      setResults(initialResults);
      setStatuses(initialStatuses);
    }

    // Auto-save interval
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      sessionStorage.setItem(`draft_${exam.examId}`, JSON.stringify(results));
      setLastSaved(now);
    }, 30000);

    return () => clearInterval(interval);
  }, [exam.examId]);

  // Formula Evaluator
  const evaluateFormula = (formula: string, currentResults: Record<string, string>) => {
    try {
      let evaluated = formula;
      parameters.forEach(p => {
        const val = currentResults[p.id] || '0';
        evaluated = evaluated.replace(new RegExp(p.code, 'g'), val);
      });
      
      // Basic math evaluation (safe for simple lab formulas)
      // eslint-disable-next-line no-eval
      const result = eval(evaluated);
      return isFinite(result) ? result.toFixed(1) : '—';
    } catch (e) {
      return '—';
    }
  };

  // Status Calculator
  const getStatus = (value: string, param: LabParameter): ResultStatus => {
    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue)) return 'normal';

    if (param.type === 'calculated') return 'calculated';

    if (param.criticalMin && numValue <= param.criticalMin) return 'critical';
    if (param.criticalMax && numValue >= param.criticalMax) return 'critical';

    const ref = param.references?.find(r => r.sex === 'Both' || r.sex === order.patientGender);
    if (ref) {
      if (numValue < ref.min || numValue > ref.max) return 'altered';
      // Simple "attention" logic: within 10% of limits
      const range = ref.max - ref.min;
      if (numValue < ref.min + range * 0.1 || numValue > ref.max - range * 0.1) return 'attention';
    }

    return 'normal';
  };

  const handleInputChange = (paramId: string, value: string) => {
    const newResults = { ...results, [paramId]: value };
    
    // Recalculate formulas
    parameters.forEach(p => {
      if (p.type === 'calculated' && p.formula) {
        newResults[p.id] = evaluateFormula(p.formula, newResults);
      }
    });

    setResults(newResults);

    // Update statuses
    const newStatuses = { ...statuses };
    parameters.forEach(p => {
      newStatuses[p.id] = getStatus(newResults[p.id], p);
    });
    setStatuses(newStatuses);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.getElementById(`param-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }

    // Abbreviations logic
    if (e.key === 'Tab') {
      const input = e.target as HTMLInputElement;
      const val = input.value.toUpperCase();
      let expanded = null;
      if (val === 'N') expanded = 'Normal';
      if (val === 'A') expanded = 'Alterado';
      if (val === 'NR') expanded = 'Não Reagente';
      if (val === 'R') expanded = 'Reagente';

      if (expanded) {
        e.preventDefault();
        const paramId = input.id.replace('param-', '');
        const p = parameters[index];
        handleInputChange(p.id, expanded);
      }
    }
  };

  const getStatusBadge = (status: ResultStatus) => {
    switch (status) {
      case 'normal': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Normal</Badge>;
      case 'attention': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Atenção</Badge>;
      case 'altered': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Alterado</Badge>;
      case 'critical': return <Badge variant="outline" className="bg-zinc-900 text-white border-zinc-900 animate-pulse">Crítico</Badge>;
      case 'calculated': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Calculado</Badge>;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="font-bold">Digitação de Resultados</h3>
          </div>
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" /> Rascunho salvo às {lastSaved}
            </span>
          )}
        </div>

        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Parâmetro</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Valores de Referência</TableHead>
                <TableHead className="w-[100px]">Laudo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((param, index) => {
                const status = statuses[param.id] || 'normal';
                const isCalculated = param.type === 'calculated';
                
                return (
                  <TableRow key={param.id} className={cn(status === 'critical' && "bg-red-50/50")}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{param.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{param.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative group">
                        <Input
                          id={`param-${index}`}
                          ref={index === 0 ? firstInputRef : null}
                          value={results[param.id] || ''}
                          onChange={(e) => handleInputChange(param.id, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          readOnly={isCalculated}
                          className={cn(
                            "h-9 font-bold",
                            isCalculated && "bg-muted cursor-not-allowed",
                            status === 'altered' && "border-red-500 ring-red-500/20",
                            status === 'critical' && "bg-zinc-900 text-white border-zinc-900"
                          )}
                        />
                        {isCalculated && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Calculator className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Calculado automaticamente: {param.formula}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {status === 'critical' && (
                          <AlertTriangle className="absolute -right-6 top-2 h-5 w-5 text-red-600 animate-bounce" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{param.unit}</TableCell>
                    <TableCell className="text-xs">
                      {param.references?.map(r => (
                        <div key={r.id}>
                          {r.sex !== 'Both' && <span className="font-bold mr-1">{r.sex}:</span>}
                          {r.min} - {r.max} {r.description && <span className="text-muted-foreground ml-1">({r.description})</span>}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(status)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/10 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">Observações Internas</span>
          </div>
          <textarea 
            className="w-full h-20 p-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Adicionar observações internas (não visíveis no laudo)..."
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} className="gap-2">
          <X className="h-4 w-4" /> Cancelar digitação
        </Button>
        <Button className="gradient-bg text-white gap-2" onClick={() => onSave([])}>
          <Check className="h-4 w-4" /> Salvar e Finalizar
        </Button>
      </div>
    </div>
  );
}
