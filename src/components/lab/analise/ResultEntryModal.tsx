import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildExamParams, catalogKey, findCatalogExam, evaluateFormula, normalizeText, resolveReference } from '@/utils/examParameters';

import { resolveCompanyId } from '@/utils/companyId';
import { useAuth } from '@/context/AuthContext';
import { useResultEntryPermissions } from '@/hooks/useResultEntryPermissions';
import { 
  X, 
  Search, 
  Beaker, 
  Clock, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  Save,
  ChevronDown,
  RefreshCw,
  MinusCircle,
  PlusCircle,
  MoreVertical,
  XCircle,
  Syringe,
  Check,
  ShieldCheck,
  Ban,
  AlertCircle,
  FileText,
  Loader2,
  List,
  LayoutGrid,
  Pencil,
  Settings,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import PDFPreviewModal from '@/components/lab/PDFPreviewModal';
import { InstrumentGraphicsSection } from '@/components/lab/analise/InstrumentGraphicsSection';
import { PatientInfoFloating } from '@/components/lab/analise/PatientInfoFloating';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, differenceInYears } from 'date-fns';

interface ResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredExams: any[];
  filters: {
    period: string;
    workbenches: string[];
    establishments: string[];
    protocol: string;
    statuses?: string[];
  };
  workbenchNames: Record<string, string>;
  establishmentNames: Record<string, string>;
}

export function ResultEntryModal({ 
  isOpen, 
  onClose, 
  filteredExams, 
  filters,
  workbenchNames,
  establishmentNames,
  refreshData,
  onOpenFilters
}: ResultEntryModalProps & { refreshData?: () => void; onOpenFilters?: () => void }) {
  const { user } = useAuth();
  const { canType, canRelease, canCorrect } = useResultEntryPermissions();
  const [correctionUnlocked, setCorrectionUnlocked] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [externalResultValues, setExternalResultValues] = useState<Record<string, string>>({});
  const [instrumentKeys, setInstrumentKeys] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [examStatuses, setExamStatuses] = useState<Record<string, string>>({});
  const [portalBlocks, setPortalBlocks] = useState<Record<string, string[]>>({});
  const [examActions, setExamActions] = useState<Record<string, { type: string; reason?: string; details?: string; applied?: boolean }>>({});
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; exam: any } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [retestReasons, setRetestReasons] = useState<Record<string, { reason: string; details: string }>>({});
  const [recoletaReasons, setRecoletaReasons] = useState<Record<string, { reason: string; details: string }>>({});
  const [prevResults, setPrevResults] = useState<Record<string, { date: string; value: string; unit: string }[]>>({});
  const [laudoOrder, setLaudoOrder] = useState<any>(null);
  const [laudoOpen, setLaudoOpen] = useState(false);
  const [laudoLoading, setLaudoLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'list';
    return (sessionStorage.getItem('lab_result_view_mode') as 'grid' | 'list') || 'list';
  });

  const changeViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try { sessionStorage.setItem('lab_result_view_mode', mode); } catch { /* ignore */ }
  };

  // Modo de digitação: todos os pacientes ou um paciente por vez
  const [entryMode, setEntryMode] = useState<'todos' | 'unico'>('todos');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionMode, setActionMode] = useState<'ambos' | 'digitar' | 'liberar'>('ambos');
  const [refreshing, setRefreshing] = useState(false);

  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});
  const [infoPanel, setInfoPanel] = useState<{ orderId?: string; patientId?: string; patientName: string; protocol: string } | null>(null);


  /** Campos editáveis: digitação normal ou correção liberada pela permissão */
  const isExamEditable = (examId: string) => {
    if (canCorrect && correctionUnlocked[examId]) return true;
    if (!canType) return false;
    return examStatuses[examId] !== 'released';
  };
  const showCorrectionPencil = (examId: string) =>
    canCorrect && !correctionUnlocked[examId] &&
    (examStatuses[examId] === 'digitized' || examStatuses[examId] === 'released');


  // Hidrata ações de recoleta já registradas no pedido (lab_guides.recollection)
  useEffect(() => {
    if (!isOpen) return;
    setExamActions(prev => {
      const next = { ...prev };
      filteredExams.forEach((exam: any) => {
        const rec = exam.recollection;
        if (rec && next[exam.id]?.type !== 'recoleta' && next[exam.id]?.type !== 'cancelado') {
          next[exam.id] = { type: 'recoleta', reason: rec.reason || '', details: rec.details || '', applied: true };
        }
      });
      return next;
    });
    setRecoletaReasons(prev => {
      const next = { ...prev };
      filteredExams.forEach((exam: any) => {
        const rec = exam.recollection;
        if (rec && !next[exam.id]) {
          next[exam.id] = { reason: rec.reason || '', details: rec.details || '' };
        }
      });
      return next;
    });
  }, [isOpen, filteredExams]);

  // Agrupamento por paciente/pedido
  const groupedPatients = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredExams.forEach(exam => {
      // Aplicar filtro de bancada também no modal para garantir consistência
      const matchesWorkbench = filters.workbenches.length === 0 || 
                               filters.workbenches.includes(exam.workbenchId || exam.workbench || '');
      
      if (!matchesWorkbench) return;

      const key = exam.protocol;
      if (!groups[key]) {
        groups[key] = {
          protocol: exam.protocol,
          patientId: exam.patientId,
          patientName: exam.patientName,
          patientBirthDate: exam.patientBirthDate,
          patientGender: exam.patientGender,
          isFasting: exam.isFasting,
          registeredAt: exam.registeredAt,
          originName: exam.originName,
          doctorName: exam.doctorName,
          doctorCRM: exam.doctorCRM,
          exams: [],
        };
      }
      groups[key].exams.push(exam);
    });
    return Object.values(groups);
  }, [filteredExams, filters.workbenches]);

  // Catálogo de Exames (parâmetros e faixas de referência reais)
  const [catalogList, setCatalogList] = useState<any[]>([]);
  /** Laudos cadastrados por exame do catálogo (exam_id -> laudos ativos, em ordem). */
  const [laudosByCatalogExam, setLaudosByCatalogExam] = useState<Record<string, any[]>>({});
  /** Laudo escolhido para cada linha de exame da digitação (exam.id -> laudo.id). */
  const [laudoByExam, setLaudoByExam] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, name, internal_code, measurement_unit, parameters, reference_values, methodology, workbench_id, default_material');
      if (error || !active || !data) return;
      setCatalogList(data as any[]);
    })();
    (async () => {
      const { data } = await supabase
        .from('exam_laudos')
        .select('id, exam_id, code, name, sort_order, is_active, parameters, reference_values, methodology')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!active || !data) return;
      const map: Record<string, any[]> = {};
      (data as any[]).forEach((l) => {
        (map[String(l.exam_id)] ||= []).push(l);
      });
      setLaudosByCatalogExam(map);
    })();
    return () => { active = false; };
  }, [isOpen]);

  /** Laudos ativos do exame do catálogo correspondente à linha de digitação. */
  const laudosForExam = useCallback((exam: any) => {
    const catalogExam = findCatalogExam(catalogList, {
      examId: exam?.examId,
      code: exam?.code,
      name: exam?.name,
    });
    if (!catalogExam?.id) return [];
    return laudosByCatalogExam[String(catalogExam.id)] || [];
  }, [catalogList, laudosByCatalogExam]);

  /** Laudo ativo da linha: o indicado pelo equipamento/operador ou o de Ordem 1. */
  const activeLaudoFor = useCallback((exam: any) => {
    const list = laudosForExam(exam);
    if (list.length === 0) return null;
    const chosen = laudoByExam[exam.id];
    return list.find((l: any) => String(l.id) === String(chosen)) || list[0];
  }, [laudosForExam, laudoByExam]);

  // Bancadas Técnicas (ordem definida em Configurações do Laboratório)
  const [workbenchList, setWorkbenchList] = useState<any[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('lab_workbenches')
        .select('id, name, report_order')
        .order('report_order', { ascending: true });
      if (!active || !data) return;
      setWorkbenchList(data as any[]);
    })();
    return () => { active = false; };
  }, [isOpen]);

  // Mapa examId -> parâmetros resolvidos com referência conforme sexo/idade do paciente
  const paramsByExam = useMemo(() => {
    const map: Record<string, any[]> = {};
    groupedPatients.forEach((patient: any) => {
      const age = patient.patientBirthDate
        ? differenceInYears(new Date(), new Date(patient.patientBirthDate))
        : undefined;
      patient.exams.forEach((exam: any) => {
        const baseCatalogExam = findCatalogExam(catalogList, {
          examId: exam.examId,
          code: exam.code,
          name: exam.name,
        });

        // Quando o exame tem mais de um laudo, vale a configuração do laudo ativo
        const laudo = activeLaudoFor(exam);
        const laudoParams = Array.isArray(laudo?.parameters) ? laudo.parameters : [];
        const catalogExam = laudo && laudoParams.length > 0
          ? {
              ...baseCatalogExam,
              parameters: laudoParams,
              reference_values: Array.isArray(laudo.reference_values) ? laudo.reference_values : baseCatalogExam?.reference_values,
              methodology: laudo.methodology || baseCatalogExam?.methodology,
            }
          : baseCatalogExam;

        // Log para depuração interna se necessário
        const resolved = buildExamParams(catalogExam, exam.name || exam.code, {
          gender: patient.patientGender,
          age,
          isFasting: patient.isFasting,
        });
        
        map[exam.id] = resolved;
      });
    });
    return map;
  }, [groupedPatients, catalogList, activeLaudoFor]);

  const getParams = (exam: any) => paramsByExam[exam.id] || [{ id: '1', name: exam?.name || '', unit: '', reference: '' }];

  // ===== Diferencial de Glóbulos Brancos (Hemograma) =====
  // Neutrófilos bastonetes (%) = 100 - (segmentados + linfócitos + monócitos + eosinófilos)
  const diffInfoFor = useCallback((params: any[], valueOf: (id: string) => string) => {
    const findP = (fn: (n: string) => boolean) => params.find((p: any) => fn(normalizeText(p?.name || '')));
    const segmentados = findP((n) => n.includes('segmentad') && !n.includes('absoluto'));
    const linfocitos = findP((n) => n.startsWith('linfocito') && !n.includes('absoluto'));
    const monocitos = findP((n) => n.startsWith('monocito') && !n.includes('absoluto'));
    const eosinofilos = findP((n) => n.startsWith('eosinofilo') && !n.includes('absoluto'));
    const bastonetes = findP((n) => (n.includes('bastonete') || n.startsWith('basto')) && !n.includes('absoluto'));
    if (!bastonetes && !segmentados) return null;
    const num = (p: any) => {
      if (!p) return null;
      const n = parseFloat(String(valueOf(p.id) || '').replace(/\s/g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    };
    const vals = [segmentados, linfocitos, monocitos, eosinofilos].map(num);
    const anyFilled = vals.some((v) => v != null);
    const sum4 = vals.reduce<number>((a, v) => a + (v ?? 0), 0);
    const bastVal = bastonetes ? num(bastonetes) : null;
    const total = sum4 + (bastVal ?? 0);
    return { bastonetes, anyFilled, sum4, total, over: sum4 > 100 };
  }, []);

  const fmtDiffNum = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

  // Preenche automaticamente Neutrófilos bastonetes (%) com o que falta para 100%
  useEffect(() => {
    const updates: Record<string, string> = {};
    filteredExams.forEach((exam: any) => {
      const params = paramsByExam[exam.id] || [];
      const info = diffInfoFor(params, (pid) => results[`${exam.id}_${pid}`] || '');
      if (!info?.bastonetes || !info.anyFilled) return;
      const key = `${exam.id}_${info.bastonetes.id}`;
      if (instrumentKeys.has(key)) return; // valor veio do equipamento — prevalece
      const auto = fmtDiffNum(100 - info.sum4);
      if ((results[key] ?? '') !== auto) updates[key] = auto;
    });
    if (Object.keys(updates).length > 0) {
      setResults(prev => ({ ...prev, ...updates }));
    }
  }, [results, filteredExams, paramsByExam, instrumentKeys, diffInfoFor]);

  // Resolve tokens de fórmula que apontam para OUTROS exames do mesmo pedido (ex.: {BILT} - {BILD})
  const resolveExternalToken = useCallback((sourceExam: any, token: string): string | null => {
    const wanted = normalizeText(token);
    if (!wanted) return null;
    for (const ex of filteredExams) {
      if (sourceExam?.orderId && ex.orderId !== sourceExam.orderId) continue;
      const params = (paramsByExam[ex.id] || []) as any[];
      const byCode = params.find((pp) => pp.code && normalizeText(pp.code) === wanted);
      if (byCode) return results[`${ex.id}_${byCode.id}`] ?? null;
      if (ex.code && normalizeText(ex.code) === wanted) {
        const target = params.find((pp) => !pp.isCalculated) || params[0];
        if (target) return results[`${ex.id}_${target.id}`] ?? null;
      }
      const byName = params.find((pp) => normalizeText(pp.name) === wanted);
      if (byName) return results[`${ex.id}_${byName.id}`] ?? null;
    }
    const orderKey = String(sourceExam?.orderId || '');
    return externalResultValues[`${orderKey}|${wanted}`] ?? null;
  }, [filteredExams, paramsByExam, results, externalResultValues]);

  // Valor exibido: parâmetros calculados usam a fórmula do catálogo,
  // EXCETO quando o valor veio do equipamento (source 'instrument') — nesse caso o valor do equipamento prevalece
  const getParamValue = useCallback((exam: any, param: any) => {
    const key = `${exam.id}_${param.id}`;
    if (param?.isCalculated && !instrumentKeys.has(key)) {
      return evaluateFormula(
        param.formula,
        getParams(exam),
        (pid) => results[`${exam.id}_${pid}`] || '',
        (token) => resolveExternalToken(exam, token),
      );
    }
    return results[key] || '';
  }, [results, paramsByExam, instrumentKeys, resolveExternalToken]);

  // Persiste automaticamente os calculados no estado para salvar/laudo
  useEffect(() => {
    const updates: Record<string, string> = {};
    Object.entries(paramsByExam).forEach(([examId, params]: any) => {
      const exam = filteredExams.find((item: any) => item.id === examId);
      if (!exam) return;
      (params as any[]).forEach((p: any) => {
        if (!p.isCalculated) return;
        const key = `${examId}_${p.id}`;
        if (instrumentKeys.has(key)) return; // valor veio do equipamento — não recalcular
        const computed = evaluateFormula(
          p.formula,
          params,
          (pid) => results[`${examId}_${pid}`] || '',
          (token) => resolveExternalToken(exam, token),
        );
        if (computed && results[key] !== computed) updates[key] = computed;
      });
    });
    if (Object.keys(updates).length > 0) {
      setResults(prev => ({ ...prev, ...updates }));
    }
  }, [results, paramsByExam, instrumentKeys, resolveExternalToken]);


  const totalExams = filteredExams.length;
  
  // Calculate filled exams only for expanded patients
  const filledExamsCount = useMemo(() => {
    let count = 0;
    filteredExams.forEach(exam => {
      // Only count if patient is expanded AND exam is not released
      if (expandedPatients[exam.protocol] && examStatuses[exam.id] !== 'released') {
        // Must have results for ALL parameters to be considered "filled"
        const params = paramsByExam[exam.id] || [{ id: '1' }];
        const allFilled = params.every((p: any) => 
          (results[`${exam.id}_${p.id}`] || '').trim() !== ''
        );
        if (allFilled) count++;
      }
    });
    return count;
  }, [results, filteredExams, expandedPatients, examStatuses, paramsByExam]);


  // Calculate total required exams only for expanded patients (excluding already released ones)
  const totalRequiredExams = useMemo(() => {
    let count = 0;
    filteredExams.forEach(exam => {
      if (expandedPatients[exam.protocol] && examStatuses[exam.id] !== 'released') {
        count++;
      }
    });
    return count;
  }, [filteredExams, expandedPatients, examStatuses]);

  const isConcluirDisabled = saving || totalRequiredExams === 0 || filledExamsCount < totalRequiredExams;

  const togglePatient = (protocol: string) => {
    setExpandedPatients(prev => ({
      ...prev,
      [protocol]: !prev[protocol]
    }));
  };

  // ===== Persistência dos resultados =====
  const examRefOf = (exam: any) => `${exam.orderId || 'no-order'}:${exam.examId || exam.id}`;

  const persistExams = async (
    exams: any[],
    status: 'draft' | 'digitized' | 'released'
  ) => {
    const cid = resolveCompanyId(user?.companyId);
    if (!cid || exams.length === 0) return;

    const nowIso = new Date().toISOString();

    for (const exam of exams) {
      const params = getParams(exam);
      const payload: any = {
        company_id: cid,
        order_id: exam.orderId || null,
        protocol: exam.protocol || null,
        exam_ref: examRefOf(exam),
        exam_code: exam.code || null,
        exam_name: exam.name || null,
        patient_id: exam.patientId || null,
        patient_name: exam.patientName || null,
        status,
        notes: notes[exam.id] || null,
        laudo_id: activeLaudoFor(exam)?.id || null,
      };
      if (status === 'digitized') {
        payload.typed_by = user?.id || null;
        payload.typed_at = nowIso;
      }
      if (status === 'released') {
        payload.released_by = user?.id || null;
        payload.released_at = nowIso;
      }

      const { data: saved, error } = await supabase
        .from('lab_exam_results')
        .upsert(payload, { onConflict: 'company_id,exam_ref' })
        .select('id')
        .single();

      if (error || !saved) {
        console.error('Erro ao salvar resultado', error);
        throw error || new Error('Falha ao salvar resultado');
      }

      const values = params.map((p: any, idx: number) => {
        const value = results[`${exam.id}_${p.id}`] || '';
        return {
          company_id: cid,
          result_id: saved.id,
          parameter_key: String(p.id),
          parameter_name: p.name || null,
          value,
          unit: p.unit || null,
          reference: resolveReference(p, value) || null,
          status: getResultStatus(value, resolveReference(p, value)).label || null,
          sort_order: idx,
          // Preserva a origem quando o valor veio do equipamento
          source: instrumentKeys.has(`${exam.id}_${p.id}`) ? 'instrument' : 'manual',
        };
      });

      if (values.length > 0) {
        const { error: vErr } = await supabase
          .from('lab_result_values')
          .upsert(values, { onConflict: 'result_id,parameter_key' });
        if (vErr) {
          console.error('Erro ao salvar valores', vErr);
          throw vErr;
        }
      }
    }
  };

  // Helper para resolver o status do pedido baseado nos exames
  const resolveOrderStatus = (exams: any[], currentStatuses: Record<string, string>) => {
    const allExams = exams.filter(e => e.status !== 'cancelled');
    if (allExams.length === 0) return 'cancelled';

    const statuses = allExams.map(e => currentStatuses[e.id] || e.status || 'pending');
    
    // Se todos estiverem liberados -> Concluído
    if (statuses.every(s => s === 'released')) return 'completed';
    
    // Se pelo menos um estiver liberado -> Liberado
    if (statuses.some(s => s === 'released')) return 'released';
    
    // Se algum estiver faltando digitação ou ainda for pendente -> Validação
    const isMissingResults = allExams.some(exam => {
      const params = paramsByExam[exam.id] || [{ id: '1' }];
      return params.some(p => !(results[`${exam.id}_${p.id}`] || '').trim());
    });
    
    if (isMissingResults || statuses.some(s => s === 'pending' || s === 'collection_done')) {
      return 'validation';
    }

    // Regra: Se todos os exames não foram coletados (isColeta = NÃO/false), status é 'open'
    const anyCollected = allExams.some(e => e.isColeta || e.status === 'collected' || e.status === 'collection_done');
    if (!anyCollected) return 'open';

    return 'in_analysis';
  };

  const updateParentOrderStatus = async (orderId: string, patientExams: any[], currentStatuses: Record<string, string>) => {
    const newStatus = resolveOrderStatus(patientExams, currentStatuses);
    const { error } = await supabase
      .from('attendance_orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (error) console.error('Erro ao atualizar status do pedido:', error);
  };

  // Carrega resultados já salvos ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    const cid = resolveCompanyId(user?.companyId);
    if (!cid) return;
    let active = true;
    (async () => {
      const refs = Array.from(new Set(filteredExams.map(examRefOf)));
      if (refs.length === 0) return;

      // Consulta em lotes: `in` com muitos refs estoura o tamanho da URL (414) e
      // fazia a tela ficar vazia mesmo com resultados gravados pelo equipamento.
      const CHUNK = 40;
      const rows: any[] = [];
      for (let i = 0; i < refs.length; i += CHUNK) {
        const { data, error } = await supabase
          .from('lab_exam_results')
          .select('id, order_id, exam_ref, exam_code, exam_name, status, notes, portal_blocked_types, lab_result_values(parameter_key, value, source)')
          .eq('company_id', cid)
          .in('exam_ref', refs.slice(i, i + CHUNK));
        if (error) {
          console.error('Erro ao carregar resultados salvos:', error);
          continue;
        }
        if (data) rows.push(...data);
      }

      // Também carrega resultados de TODOS os exames dos mesmos pedidos:
      // fórmulas calculadas podem referenciar outros exames (ex.: BILI = {BILT} - {BILD})
      const orderIds = Array.from(new Set(filteredExams.map((e: any) => e.orderId).filter(Boolean)));
      const knownRefs = new Set(rows.map((r: any) => r.exam_ref));
      for (let i = 0; i < orderIds.length; i += CHUNK) {
        const { data, error } = await supabase
          .from('lab_exam_results')
          .select('id, order_id, exam_ref, exam_code, exam_name, status, notes, portal_blocked_types, lab_result_values(parameter_key, value, source)')
          .eq('company_id', cid)
          .in('order_id', orderIds.slice(i, i + CHUNK));
        if (error) continue;
        (data || []).forEach((r: any) => {
          if (!knownRefs.has(r.exam_ref)) {
            knownRefs.add(r.exam_ref);
            rows.push(r);
          }
        });
      }
      if (!active || rows.length === 0) return;

      const nextResults: Record<string, string> = {};
      const nextNotes: Record<string, string> = {};
      const nextStatuses: Record<string, any> = {};
      const nextBlocks: Record<string, string[]> = {};
      const nextExternalValues: Record<string, string> = {};
      const nextInstrumentKeys = new Set<string>();
      rows.forEach((row: any) => {
        // exam_ref já é a chave única da instância (pedido:exame)
        const examId = String(row.exam_ref);
        if (Array.isArray(row.portal_blocked_types) && row.portal_blocked_types.length > 0) {
          nextBlocks[examId] = row.portal_blocked_types as string[];
        }
        if (row.notes) nextNotes[examId] = row.notes;
        if (row.status === 'digitized' || row.status === 'released' || row.status === 'cancelled') {
          nextStatuses[examId] = row.status;
        }
        (row.lab_result_values || []).forEach((v: any) => {
          const key = `${examId}_${String(v.parameter_key)}`;
          if (v.value !== null && v.value !== undefined && String(v.value) !== '') {
            nextResults[key] = String(v.value);
          }
          if (v.source === 'instrument') nextInstrumentKeys.add(key);
        });
        const externalValue = (row.lab_result_values || []).find(
          (v: any) => v.value !== null && v.value !== undefined && String(v.value).trim() !== '',
        );
        if (row.order_id && externalValue) {
          [row.exam_code, row.exam_name].filter(Boolean).forEach((identifier: string) => {
            nextExternalValues[`${row.order_id}|${normalizeText(identifier)}`] = String(externalValue.value);
          });
        }
      });
      setExternalResultValues(nextExternalValues);
      setInstrumentKeys(nextInstrumentKeys);
      setResults(prev => {
        const next = { ...prev };
        Object.entries(nextResults).forEach(([k, v]) => {
          // valores do equipamento sempre prevalecem; os demais só preenchem campos vazios
          if (nextInstrumentKeys.has(k) || !(next[k] || '').trim()) next[k] = v;
        });
        return next;
      });
      setNotes(prev => ({ ...nextNotes, ...prev }));
      setExamStatuses(prev => ({ ...nextStatuses, ...prev }));
      setPortalBlocks(prev => ({ ...nextBlocks, ...prev }));
    })();
    return () => { active = false; };
  }, [isOpen, filteredExams, user?.companyId]);

  // Bloqueio de visualização do laudo nos Portais Externos (por tipo de portal)
  const PORTAL_BLOCK_OPTIONS = [
    { value: 'parceiro', label: 'Parceiros' },
    { value: 'local', label: 'Locais' },
    { value: 'medico', label: 'Médicos' },
    { value: 'paciente', label: 'Pacientes' },
  ];

  const togglePortalBlock = async (exam: any, type: string) => {
    const examId = exam.id;
    const current = portalBlocks[examId] || [];
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setPortalBlocks(prev => ({ ...prev, [examId]: next }));

    const cid = resolveCompanyId(user?.companyId);
    if (!cid) return;
    try {
      const ref = examRefOf(exam);
      const { data: existing } = await supabase
        .from('lab_exam_results')
        .select('id')
        .eq('company_id', cid)
        .eq('exam_ref', ref)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('lab_exam_results')
          .update({ portal_blocked_types: next })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lab_exam_results')
          .insert({
            company_id: cid,
            order_id: exam.orderId || null,
            protocol: exam.protocol || null,
            exam_ref: ref,
            exam_code: exam.code || null,
            exam_name: exam.name || null,
            patient_id: exam.patientId || null,
            patient_name: exam.patientName || null,
            status: examStatuses[examId] || 'pending',
            portal_blocked_types: next,
          });
        if (error) throw error;
      }
      toast.success(next.length === 0 ? 'Exame liberado para todos os portais.' : 'Bloqueio de visualização atualizado.');
    } catch (e) {
      console.error('Erro ao salvar bloqueio de portal', e);
      setPortalBlocks(prev => ({ ...prev, [examId]: current }));
      toast.error('Não foi possível salvar o bloqueio.');
    }
  };


  // Pré-seleciona "Ausente" nos parâmetros de seleção que possuem essa opção (ex.: Sumário de Urina)
  useEffect(() => {
    if (!isOpen) return;
    const defaults: Record<string, string> = {};
    filteredExams.forEach((exam: any) => {
      (paramsByExam[exam.id] || []).forEach((p: any) => {
        if (p?.type !== 'selection') return;
        const opts: string[] = p.options || [];
        const ausente = opts.find(o => String(o).trim().toLowerCase() === 'ausente');
        if (ausente) defaults[`${exam.id}_${p.id}`] = ausente;
      });
    });
    if (Object.keys(defaults).length === 0) return;
    setResults(prev => {
      const next = { ...prev };
      let changed = false;
      Object.entries(defaults).forEach(([k, v]) => {
        if (!next[k]) { next[k] = v; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [isOpen, filteredExams, paramsByExam]);

  // Carrega resultados anteriores REAIS do paciente (outros protocolos)
  useEffect(() => {
    if (!isOpen) return;
    setPrevResults({});
    const cid = resolveCompanyId(user?.companyId);
    if (!cid) return;
    const ids = Array.from(new Set(groupedPatients.map((p: any) => p.patientId).filter(Boolean)));
    if (ids.length === 0) return;
    // Exclui os pedidos atuais (protocolo pode se repetir entre pedidos)
    const currentOrderIds = new Set(
      groupedPatients.flatMap((p: any) => (p.exams || []).map((e: any) => e.orderId)).filter(Boolean)
    );
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('lab_exam_results')
        .select('patient_id, patient_name, exam_code, exam_name, order_id, protocol, status, released_at, typed_at, created_at, lab_result_values(parameter_name, value, unit, sort_order)')
        .eq('company_id', cid)
        .in('status', ['digitized', 'released'])
        .in('patient_id', ids as string[])
        .order('created_at', { ascending: false });

      if (!active || !data) return;
      const map: Record<string, { date: string; value: string; unit: string }[]> = {};
      data.forEach((row: any) => {
        if (row.order_id && currentOrderIds.has(row.order_id)) return;
        // Identidade do paciente: exclusivamente pelo ID
        const rowPatientId = row.patient_id;
        if (!rowPatientId || !ids.includes(rowPatientId)) return;
        const values = (row.lab_result_values || [])
          .slice()
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        const first = values.find((v: any) => (v.value || '').trim() !== '');
        if (!first) return;
        const key = `${rowPatientId}|${String(row.exam_code || row.exam_name || '').toUpperCase()}`;
        if (!map[key]) map[key] = [];
        if (map[key].length >= 5) return;
        map[key].push({
          date: row.released_at || row.typed_at || row.created_at,
          value: first.value,
          unit: first.unit || '',
        });
      });
      setPrevResults(map);
    })();
    return () => { active = false; };
  }, [isOpen, groupedPatients, user?.companyId]);

  const patientHasLaudo = (patient: any) =>
    patient.exams.some((e: any) => examStatuses[e.id] === 'digitized' || examStatuses[e.id] === 'released');

  const openLaudo = async (patient: any) => {
    if (laudoLoading) return;
    setLaudoLoading(true);

    try {
      // Permite que a barra de carregamento seja pintada antes de montar o documento.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const orderOfWorkbench = (wbId?: string, wbName?: string) => {
        const wb = workbenchList.find(
          (w: any) => w.id === wbId || (wbName && String(w.name).toLowerCase() === String(wbName).toLowerCase()),
        );
        return wb?.report_order ?? 9999;
      };

      const exams = patient.exams
        .filter((e: any) => examStatuses[e.id] === 'digitized' || examStatuses[e.id] === 'released')
        .map((e: any) => {
          const catalogExam = findCatalogExam(catalogList, { examId: e.examId, code: e.code, name: e.name });
          const workbenchId = catalogExam?.workbench_id || e.workbenchId;
          const workbenchName = workbenchNames[workbenchId] || e.workbench || '';
          return {
            examId: e.id,
            code: e.code,
            name: catalogExam?.name || e.name,
            material: e.material || catalogExam?.default_material || 'Soro',
            methodology: catalogExam?.methodology || '',
            workbench: workbenchName,
            workbenchOrder: orderOfWorkbench(workbenchId, workbenchName || e.workbench),
            status: examStatuses[e.id] === 'released' ? 'liberado' : 'waiting_approval',
            results: getParams(e).map((p: any) => {
              const value = getParamValue(e, p);
              const reference = resolveReference(p, value);
              const st = getResultStatus(value, reference);
              return {
                parameterId: String(p.id),
                parameterCode: p.name,
                parameterName: p.name,
                section: p.section || '',
                value,
                unit: p.unit || '',
                referenceRange: reference || '—',
                flag: st.label === 'Alto' ? 'H' : st.label === 'Baixo' ? 'L' : '',
                status: st.label === 'Alto' || st.label === 'Baixo' ? 'altered' : 'normal',
              };
            }),
            internalObservations: notes[e.id] || '',
          };
        })
        .sort((a: any, b: any) => (a.workbenchOrder - b.workbenchOrder) || a.name.localeCompare(b.name));

      if (exams.length === 0) {
        toast.info('Nenhum exame digitado ou liberado para este paciente.');
        return;
      }

      // A aprovação pertence à liberação persistida, nunca à sessão que visualiza.
      let approvedBy = '';
      let approvedRegister = '';
      let releasedAt: string | null = null;
      const cid = resolveCompanyId(user?.companyId);
      const orderId = patient.exams?.[0]?.orderId || patient.id;
      if (cid && orderId) {
        const { data: releases, error } = await supabase
          .from('lab_exam_results')
          .select('released_by, released_at')
          .eq('company_id', cid)
          .eq('order_id', orderId)
          .eq('status', 'released')
          .in('exam_ref', patient.exams.filter((e: any) => examStatuses[e.id] === 'released').map(examRefOf))
          .order('released_at', { ascending: false, nullsFirst: false })
          .limit(1);
        if (error) throw error;
        const release = releases?.[0];
        releasedAt = release?.released_at || null;
        if (release?.released_by) {
          const { data: prof, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, council_type, council_uf, council_number')
            .eq('id', release.released_by)
            .maybeSingle();
          if (profileError) throw profileError;
          approvedBy = prof?.full_name || '';
          approvedRegister = [
            [prof?.council_type, prof?.council_uf].filter(Boolean).join('/'),
            prof?.council_number,
          ].filter(Boolean).join(' ').trim();
        }
      }

      setLaudoOrder({
        patientName: patient.patientName,
        patientBirthDate: patient.patientBirthDate,
        patientGender: patient.patientGender,
        protocol: patient.protocol,
        registeredAt: patient.registeredAt,
        originName: patient.originName,
        doctorName: patient.doctorName,
        doctorCRM: patient.doctorCRM,
        collectionTime: patient.collectionTime || patient.registeredAt,
        approvedBy,
        approvedRegister,
        approvedAt: releasedAt,
        exams,
      });
      setLaudoOpen(true);
    } catch (error) {
      console.error('Falha ao preparar laudo:', error);
      toast.error('Não foi possível carregar o laudo. Tente novamente.');
    } finally {
      setLaudoLoading(false);
    }
  };




  const handleSave = async (isDraft: boolean) => {
    setSaving(true);
    try {
      if (!isDraft) {
        // Mark only exams that were actually digitized as digitized
        const newStatuses = { ...examStatuses };
        const toPersist: any[] = [];

        filteredExams.forEach(exam => {
          // Only process exams for expanded patients
          if (expandedPatients[exam.protocol] && newStatuses[exam.id] !== 'released') {
            const params = paramsByExam[exam.id] || [{ id: '1' }];
            const allFilled = params.every((p: any) => 
              (results[`${exam.id}_${p.id}`] || '').trim() !== ''
            );
            
            if (allFilled) {
              newStatuses[exam.id] = 'digitized';
              toPersist.push(exam);
            }
          }
        });

        if (toPersist.length > 0) {
          await persistExams(toPersist, 'digitized');
          setExamStatuses(newStatuses);
          
          // Atualizar status do pedido para os pacientes afetados
          const affectedOrderIds = Array.from(new Set(toPersist.map(e => e.orderId)));
          for (const orderId of affectedOrderIds) {
            const patient = groupedPatients.find(p => p.id === orderId);
            if (patient) {
              await updateParentOrderStatus(orderId, patient.exams, newStatuses);
            }
          }

          toast.success("Digitação concluída e salva com sucesso!");
        } else {
          toast.info("Nenhum resultado preenchido para concluir.");
        }
      } else {
        const drafts = filteredExams.filter(exam => {
          if (examStatuses[exam.id] === 'released') return false;
          const params = paramsByExam[exam.id] || [{ id: '1' }];
          return params.some((p: any) => (results[`${exam.id}_${p.id}`] || '').trim() !== '');
        });
        await persistExams(drafts, 'draft');
        toast.success("Rascunho salvo com sucesso!");
      }
    } catch (e) {
      toast.error("Erro ao salvar os resultados no banco de dados.");
    } finally {
      setSaving(false);
    }
  };

  const handleConcluirExame = async (examId: string) => {
    const exam = filteredExams.find(e => e.id === examId);
    if (!exam) return;
    setSaving(true);
    try {
      await persistExams([exam], 'digitized');
      const newStatuses = { ...examStatuses, [examId]: 'digitized' };
      setExamStatuses(newStatuses);
      
      const patient = groupedPatients.find(p => p.exams.some((e: any) => e.id === examId));
      if (patient) {
        await updateParentOrderStatus(patient.id || exam.orderId, patient.exams, newStatuses);
      }

      toast.success("Exame concluído e resultado salvo!");
    } catch {
      toast.error("Erro ao salvar o resultado do exame.");
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseExam = async (examId: string) => {
    const exam = filteredExams.find(e => e.id === examId);
    if (!exam) return;
    setSaving(true);
    try {
      await persistExams([exam], 'released');
      const newStatuses = { ...examStatuses, [examId]: 'released' };
      setExamStatuses(newStatuses);

      const patient = groupedPatients.find(p => p.exams.some((e: any) => e.id === examId));
      if (patient) {
        await updateParentOrderStatus(patient.id || exam.orderId, patient.exams, newStatuses);
      }

      toast.success("Exame liberado com sucesso!");
    } catch {
      toast.error("Erro ao liberar o exame.");
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseAllDigitized = async () => {
    const toRelease = filteredExams.filter(e => examStatuses[e.id] === 'digitized');
    if (toRelease.length === 0) return;
    setSaving(true);
    try {
      await persistExams(toRelease, 'released');
      const newStatuses = { ...examStatuses };
      toRelease.forEach(e => { newStatuses[e.id] = 'released'; });
      setExamStatuses(newStatuses);

      // Atualizar status de todos os pedidos afetados
      const affectedOrderIds = Array.from(new Set(toRelease.map(e => e.orderId)));
      for (const orderId of affectedOrderIds) {
        const patient = groupedPatients.find(p => p.id === orderId);
        if (patient) {
          await updateParentOrderStatus(orderId, patient.exams, newStatuses);
        }
      }

      toast.success(`${toRelease.length} exames liberados com sucesso!`);
    } catch {
      toast.error("Erro ao liberar os exames.");
    } finally {
      setSaving(false);
    }
  };



  const handleExamAction = (examId: string, actionType: string) => {
    if (actionType === 'cancelar') {
      // Se já estiver cancelado, permite reverter (limpar o status de cancelamento)
      if (examStatuses[examId] === 'cancelled') {
        setExamStatuses(prev => {
          const next = { ...prev };
          delete next[examId];
          return next;
        });
        setExamActions(prev => {
          const next = { ...prev };
          delete next[examId];
          return next;
        });
        const exam = filteredExams.find(e => e.id === examId);
        void (async () => {
          try {
            await persistExamCancellation(exam, false);
            toast.success("Cancelamento revertido — amostra voltou para Coletado.");
            void handleRefreshData();
          } catch (err) {
            console.error('Erro ao reverter cancelamento', err);
            toast.error("Não foi possível atualizar a amostra no pedido.");
          }
        })();
      } else {
        const exam = filteredExams.find(e => e.id === examId);
        setCancelModal({ isOpen: true, exam });
      }
    } else if (actionType === 'reteste') {
      // Toggle reteste: se já for reteste, remove
      if (examActions[examId]?.type === 'reteste') {
        setExamActions(prev => {
          const next = { ...prev };
          delete next[examId];
          return next;
        });
        toast.info("Ação de reteste removida.");
      } else {
        setExamActions(prev => ({ ...prev, [examId]: { type: 'reteste', reason: '', details: '' } }));
        toast.info("Informe o motivo do reteste abaixo das observações técnicas.");
      }
    } else if (actionType === 'recoleta') {
      const exam = filteredExams.find(e => e.id === examId);
      // Toggle recoleta: se já for recoleta, remove
      if (examActions[examId]?.type === 'recoleta') {
        const wasApplied = !!examActions[examId]?.applied;
        setExamActions(prev => {
          const next = { ...prev };
          delete next[examId];
          return next;
        });
        if (wasApplied) {
          toast.info("Ação de recoleta removida — amostra voltou para Coletado.");
          void (async () => {
            try {
              await persistExamRecollection(exam, false);
              void handleRefreshData();
            } catch (err) {
              console.error('Erro ao remover recoleta', err);
              toast.error("Não foi possível atualizar a amostra no pedido.");
            }
          })();
        } else {
          toast.info("Ação de recoleta cancelada.");
        }
      } else {
        // Apenas abre o formulário de motivo/detalhes — aplica somente ao clicar em "Aplicar Recoleta"
        setExamActions(prev => ({ ...prev, [examId]: { type: 'recoleta', reason: '', details: '', applied: false } }));
        toast.info("Selecione o motivo e clique em Aplicar Recoleta.");
      }
    }
  };

  // Persiste a solicitação/remoção de recoleta e sincroniza a amostra no pedido:
  // recoleta solicitada -> amostra volta para "Pendente" e registra motivo/usuário/data;
  // recoleta removida -> amostra volta para "Coletado" e limpa o registro.
  const persistExamRecollection = async (exam: any, active: boolean, info?: { reason: string; details: string }) => {
    const cid = resolveCompanyId(user?.companyId);
    if (!cid || !exam?.orderId) return;
    const nowIso = new Date().toISOString();
    const requestedBy = (user as any)?.fullName || (user as any)?.name || 'Usuário';

    const { data: orderRow, error: oErr } = await supabase
      .from('attendance_orders')
      .select('lab_guides')
      .eq('id', exam.orderId)
      .single();
    if (oErr) throw oErr;

    const guides = Array.isArray((orderRow as any)?.lab_guides) ? (orderRow as any).lab_guides : [];
    const targetId = String(exam.examId || exam.id?.split(':').pop() || '');
    let changed = false;
    const nextGuides = guides.map((g: any) => ({
      ...g,
      exams: (g.exams || []).map((e: any) => {
        if (String(e.examId || e.id) !== targetId) return e;
        changed = true;
        if (active) {
          const prev = e.recollection || {};
          return {
            ...e,
            collected: false,
            collectedAt: null,
            isColeta: false,
            status: 'pending',
            recollection: {
              reason: info?.reason ?? prev.reason ?? '',
              details: info?.details ?? prev.details ?? '',
              requestedBy: prev.requestedBy || requestedBy,
              requestedAt: prev.requestedAt || nowIso,
            },
          };
        }
        const { recollection, ...rest } = e;
        return { ...rest, collected: true, collectedAt: nowIso, isColeta: true };
      }),
    }));
    if (!changed) return;

    const { error: uErr } = await supabase
      .from('attendance_orders')
      .update({ lab_guides: nextGuides })
      .eq('id', exam.orderId);
    if (uErr) throw uErr;
  };

  // Persiste o cancelamento/reversão do exame e sincroniza a amostra no pedido:
  // cancelado -> amostra volta para "Pendente" (sai da fila de digitação);
  // revertido -> amostra volta para "Coletado".
  const persistExamCancellation = async (exam: any, cancelled: boolean) => {
    const cid = resolveCompanyId(user?.companyId);
    if (!cid || !exam?.orderId) return;
    const nowIso = new Date().toISOString();

    // 1) Status do exame em lab_exam_results
    const { error: rErr } = await supabase
      .from('lab_exam_results')
      .upsert({
        company_id: cid,
        order_id: exam.orderId || null,
        protocol: exam.protocol || null,
        exam_ref: examRefOf(exam),
        exam_code: exam.code || null,
        exam_name: exam.name || null,
        patient_id: exam.patientId || null,
        patient_name: exam.patientName || null,
        status: cancelled ? 'cancelled' : 'pending',
      }, { onConflict: 'company_id,exam_ref' });
    if (rErr) throw rErr;

    // 2) Amostra (lab_guides) volta para Pendente / retorna a Coletado
    const { data: orderRow, error: oErr } = await supabase
      .from('attendance_orders')
      .select('lab_guides')
      .eq('id', exam.orderId)
      .single();
    if (oErr) throw oErr;

    const guides = Array.isArray((orderRow as any)?.lab_guides) ? (orderRow as any).lab_guides : [];
    const targetId = String(exam.examId || exam.id?.split(':').pop() || '');
    const nextGuides = guides.map((g: any) => ({
      ...g,
      exams: (g.exams || []).map((e: any) =>
        String(e.examId || e.id) === targetId
          ? cancelled
            ? { ...e, collected: false, collectedAt: null, isColeta: false, status: 'pending' }
            : { ...e, collected: true, collectedAt: nowIso, isColeta: true }
          : e
      ),
    }));

    const { error: uErr } = await supabase
      .from('attendance_orders')
      .update({ lab_guides: nextGuides })
      .eq('id', exam.orderId);
    if (uErr) throw uErr;
  };

  const handleCancelConfirm = async (examId: string, reason: string) => {
    const exam = filteredExams.find(e => e.id === examId);
    setExamStatuses(prev => ({ ...prev, [examId]: 'cancelled' }));
    setExamActions(prev => ({ ...prev, [examId]: { type: 'cancelado', reason } }));
    setCancelModal(null);
    try {
      await persistExamCancellation(exam, true);
      const patient = groupedPatients.find(p => p.exams.some((e: any) => e.id === examId));
      if (patient) {
        await updateParentOrderStatus(exam?.orderId || patient.id, patient.exams, { ...examStatuses, [examId]: 'cancelled' });
      }
      toast.error("Exame cancelado — amostra voltou para Pendente.");
      void handleRefreshData();
    } catch (e) {
      console.error('Erro ao persistir cancelamento', e);
      toast.error("Exame cancelado na tela, mas não foi possível atualizar a amostra.");
    }
  };

  const handleRetestUpdate = (examId: string, reason: string, details: string) => {
    setRetestReasons(prev => ({ ...prev, [examId]: { reason, details } }));
    setExamActions(prev => ({ ...prev, [examId]: { type: 'reteste', reason, details } }));
    toast.info("Solicitação de reteste salva como rascunho.");
  };

  const handleRecoletaUpdate = (examId: string, reason: string, details: string) => {
    // Atualiza apenas o estado local — persistência ocorre ao clicar em "Aplicar Recoleta"
    setRecoletaReasons(prev => ({ ...prev, [examId]: { reason, details } }));
    setExamActions(prev => ({ ...prev, [examId]: { ...prev[examId], type: 'recoleta', reason, details } }));
  };

  const handleApplyRecoleta = (examId: string) => {
    const action = examActions[examId];
    if (!action || action.type !== 'recoleta') return;
    if (!action.reason || !action.reason.trim()) {
      toast.error("Selecione o motivo da recoleta antes de aplicar.");
      return;
    }
    const exam = filteredExams.find(e => e.id === examId);
    void (async () => {
      try {
        await persistExamRecollection(exam, true, { reason: action.reason || '', details: action.details || '' });
        setExamActions(prev => ({ ...prev, [examId]: { ...prev[examId], applied: true } }));
        toast.success("Recoleta aplicada — amostra voltou para Pendente.");
        void handleRefreshData();
      } catch (err) {
        console.error('Erro ao aplicar recoleta', err);
        toast.error("Não foi possível aplicar a recoleta no pedido.");
      }
    })();
  };

  const getAge = (birthDate: string) => {
    if (!birthDate) return 'N/I';
    const age = differenceInYears(new Date(), new Date(birthDate));
    return `${age} anos`;
  };

  const getGenderLabel = (gender: string) => {
    if (gender === 'M' || gender === 'male') return 'M';
    if (gender === 'F' || gender === 'female') return 'F';
    return 'N/I';
  };

  const filterSummary = useMemo(() => {
    const parts = [];
    parts.push(`Período: ${filters.period === 'hoje' ? 'Hoje' : filters.period}`);
    parts.push(`Bancada: ${filters.workbenches.length === 0 ? 'Todas' : filters.workbenches.map(id => workbenchNames[id] || id).join(', ')}`);
    parts.push(`Origem: ${filters.establishments.length === 0 ? 'Todas' : filters.establishments.map(id => establishmentNames[id] || id).join(', ')}`);
    if (filters.protocol) parts.push(`Protocolo: ${filters.protocol}`);
    return parts.join(' · ');
  }, [filters, workbenchNames, establishmentNames]);

  const getResultStatus = (value: string, reference: string) => {
    if (!value || !reference) return { label: '', color: '', bgColor: 'bg-white' };
    
    // Remove separator de milhares e normaliza decimal para ponto
    const normalizedValue = value.replace(/\./g, '').replace(',', '.');
    const numValue = parseFloat(normalizedValue);
    if (isNaN(numValue)) return { label: '', color: '', bgColor: 'bg-white' };

    // Limpa a referência para facilitar o parsing (remove espaços extras)
    const cleanRef = reference.replace(/\s+/g, ' ').trim();

    // Suporte a faixas como "20 a 60", "20.5 a 60.1", "20,5 a 60,1"
    const rangeMatch = cleanRef.match(/([\d.,]+)\s+(?:a|at[ée])\s+([\d.,]+)/i);
    // Suporte a menor que: "< 20", "<= 20", "menor que 20"
    const lessMatch = cleanRef.match(/(?:<|<=|menor\s+que)\s*([\d.,]+)/i);
    // Suporte a maior que: "> 20", ">= 20", "maior que 20"
    const greaterMatch = cleanRef.match(/(?:>|>=|maior\s+que)\s*([\d.,]+)/i);

    const parseRefValue = (val: string) => parseFloat(val.replace(',', '.'));

    if (rangeMatch) {
      const min = parseRefValue(rangeMatch[1]);
      const max = parseRefValue(rangeMatch[2]);
      if (numValue < min) return { label: 'Baixo', color: 'text-amber-600', bgColor: 'bg-amber-400/20' };
      if (numValue > max) return { label: 'Alto', color: 'text-rose-600', bgColor: 'bg-rose-500/10' };
      return { label: 'Normal', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' };
    }
    
    if (lessMatch) {
      const max = parseRefValue(lessMatch[1]);
      if (numValue > max) return { label: 'Alto', color: 'text-rose-600', bgColor: 'bg-rose-500/10' };
      return { label: 'Normal', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' };
    }

    if (greaterMatch) {
      const min = parseRefValue(greaterMatch[1]);
      if (numValue < min) return { label: 'Baixo', color: 'text-amber-600', bgColor: 'bg-amber-400/20' };
      return { label: 'Normal', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' };
    }

    // Fallback para match genérico de dois números em qualquer formato
    const parts = cleanRef.match(/([0-9]+(?:[.,][0-9]+)?)/g);
    if (parts && parts.length >= 2) {
      const min = parseRefValue(parts[0]);
      const max = parseRefValue(parts[1]);
      if (numValue < min) return { label: 'Baixo', color: 'text-amber-600', bgColor: 'bg-amber-400/20' };
      if (numValue > max) return { label: 'Alto', color: 'text-rose-600', bgColor: 'bg-rose-500/10' };
    }
    
    return { label: 'Normal', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' };
  };

  /* ---------- Navegação paciente a paciente ---------- */
  const safeIndex = Math.min(currentIndex, Math.max(groupedPatients.length - 1, 0));
  const visiblePatients = entryMode === 'unico'
    ? groupedPatients.slice(safeIndex, safeIndex + 1)
    : groupedPatients;

  useEffect(() => {
    if (currentIndex > groupedPatients.length - 1) setCurrentIndex(0);
  }, [groupedPatients.length, currentIndex]);

  useEffect(() => {
    if (entryMode !== 'unico') return;
    const patient = groupedPatients[safeIndex];
    if (patient) setExpandedPatients(prev => ({ ...prev, [patient.protocol]: true }));
  }, [entryMode, safeIndex, groupedPatients]);

  const goToPatient = (index: number) => {
    if (index < 0 || index > groupedPatients.length - 1) return;
    setCurrentIndex(index);
    try { document.getElementById('result-entry-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ignore */ }
    // No modo "1 por vez", sincroniza com o banco ao trocar de paciente
    // para refletir digitações/liberações feitas por outro bioquímico.
    if (entryMode === 'unico') { void handleRefreshData(); }
  };


  const handleRefreshData = async () => {
    if (!refreshData) return;
    setRefreshing(true);
    try {
      await Promise.resolve(refreshData());
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  /** Conclui a digitação de todos os exames preenchidos do paciente atual */
  const handleConcluirPaciente = async (patient: any, advance = true) => {
    if (!patient) return;
    setSaving(true);
    try {
      const newStatuses = { ...examStatuses };
      const toPersist: any[] = [];
      (patient.exams || []).forEach((exam: any) => {
        if (newStatuses[exam.id] === 'released' || newStatuses[exam.id] === 'cancelled') return;
        const params = paramsByExam[exam.id] || [{ id: '1' }];
        const allFilled = params.every((p: any) => (results[`${exam.id}_${p.id}`] || '').trim() !== '');
        if (allFilled) {
          newStatuses[exam.id] = 'digitized';
          toPersist.push(exam);
        }
      });

      if (toPersist.length === 0) {
        toast.info('Nenhum resultado preenchido para concluir neste paciente.');
      } else {
        await persistExams(toPersist, 'digitized');
        setExamStatuses(newStatuses);
        await updateParentOrderStatus(patient.exams?.[0]?.orderId, patient.exams, newStatuses);
        toast.success(`${toPersist.length} exame(s) digitado(s) para ${patient.patientName}.`);
      }
    } catch {
      toast.error('Erro ao concluir a digitação do paciente.');
    } finally {
      setSaving(false);
      if (advance) goToPatient(safeIndex + 1);
    }
  };

  /** Libera todos os exames já digitados do paciente atual */
  const handleLiberarPaciente = async (patient: any, advance = true) => {
    if (!patient) return;
    setSaving(true);
    try {
      const toRelease = (patient.exams || []).filter((e: any) => examStatuses[e.id] === 'digitized');
      if (toRelease.length === 0) {
        toast.info('Nenhum exame digitado para liberar neste paciente.');
      } else {
        await persistExams(toRelease, 'released');
        const newStatuses = { ...examStatuses };
        toRelease.forEach((e: any) => { newStatuses[e.id] = 'released'; });
        setExamStatuses(newStatuses);
        await updateParentOrderStatus(patient.exams?.[0]?.orderId, patient.exams, newStatuses);
        toast.success(`${toRelease.length} exame(s) liberado(s) para ${patient.patientName}.`);
      }
    } catch {
      toast.error('Erro ao liberar os exames do paciente.');
    } finally {
      setSaving(false);
      if (advance) goToPatient(safeIndex + 1);
    }
  };

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* Cabeçalho */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Digitação de Resultados
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[600px]">
            {filterSummary}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Modo de digitação */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEntryMode('todos')}
              className={cn(
                "h-8 px-3 rounded-md text-[10px] font-black uppercase tracking-wider",
                entryMode === 'todos' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setEntryMode('unico'); setCurrentIndex(0); }}
              className={cn(
                "h-8 px-3 rounded-md text-[10px] font-black uppercase tracking-wider",
                entryMode === 'unico' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              1 por vez
            </Button>
          </div>

          {/* Alternar visualização */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeViewMode('list')}
              title="Visualização em lista"
              aria-label="Visualização em lista"
              aria-pressed={viewMode === 'list'}
              className={cn(
                "h-8 w-9 rounded-md",
                viewMode === 'list' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeViewMode('grid')}
              title="Visualização em grade"
              aria-label="Visualização em grade"
              aria-pressed={viewMode === 'grid'}
              className={cn(
                "h-8 w-9 rounded-md",
                viewMode === 'grid' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          {/* Atualizar / Filtros */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefreshData}
              disabled={!refreshData || refreshing}
              title="Atualizar informações dos pedidos"
              aria-label="Atualizar informações dos pedidos"
              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenFilters?.()}
              title="Alterar filtros"
              aria-label="Alterar filtros"
              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contador</p>
            <p className="text-sm font-black uppercase">
              {groupedPatients.length} pacientes · {totalExams} exames pendentes
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
            <X className="h-6 w-6" />
          </Button>
        </div>

      </header>

      {infoPanel && (
        <PatientInfoFloating
          orderId={infoPanel.orderId}
          patientId={infoPanel.patientId}
          patientName={infoPanel.patientName}
          protocol={infoPanel.protocol}
          onClose={() => setInfoPanel(null)}
        />
      )}

      {/* Conteúdo */}
      <ScrollArea className="flex-1 bg-slate-50 result-entry-scroll">
        <div className="container max-w-5xl py-8 px-6 space-y-8">
          {groupedPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed border-border shadow-sm">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-black uppercase">Nenhum exame encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Não há exames que correspondam aos filtros selecionados no momento.
              </p>
              <Button variant="outline" onClick={onClose} className="mt-6 font-bold uppercase text-[10px]">
                Ajustar Filtros
              </Button>
            </div>
          ) : (
            visiblePatients.map((patient, vIdx) => {
              const pIdx = entryMode === 'unico' ? safeIndex : vIdx;
              const isExpanded = !!expandedPatients[patient.protocol];
              const totalPatientExams = patient.exams.length;
              const releasedCount = patient.exams.filter((e: any) => examStatuses[e.id] === 'released').length;
              const typedCount = patient.exams.filter((e: any) => {
                if (examStatuses[e.id] === 'released') return true;
                const params = getParams(e);
                return params.length > 0 && params.every((p: any) => (results[`${e.id}_${p.id}`] || '').trim() !== '');
              }).length;
              const showRelease = releasedCount > 0;
              const showTyping = typedCount > 0 && typedCount > releasedCount;
              const renderProgress = (label: string, done: number, tone: 'typing' | 'release') => (
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded',
                    tone === 'release' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
                  )}>
                    {label} ({done === totalPatientExams ? 'COMPLETA' : 'PARCIAL'})
                  </span>
                  <div className="h-1.5 w-16 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', tone === 'release' ? 'bg-emerald-400' : 'bg-cyan-400')}
                      style={{ width: `${totalPatientExams ? (done / totalPatientExams) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-white/60">{done}/{totalPatientExams}</span>
                </div>
              );
              return (
                <div key={patient.protocol} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${vIdx * 50}ms` }}>
                  {/* Cabeçalho do Paciente */}
                  <div 
                    className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => togglePatient(patient.protocol)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <MinusCircle className="h-4 w-4 text-white/60" />
                        ) : (
                          <PlusCircle className="h-4 w-4 text-white/60" />
                        )}
                        <span className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-[10px] font-black">
                          {pIdx + 1}
                        </span>
                        <button
                          type="button"
                          title="Informações do paciente"
                          className="h-6 w-6 rounded-full flex items-center justify-center text-white/70 hover:text-cyan-300 hover:bg-white/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoPanel({
                              orderId: patient.exams?.[0]?.orderId,
                              patientId: patient.patientId,
                              patientName: patient.patientName,
                              protocol: patient.protocol,
                            });
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>

                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-black uppercase tracking-tight">{patient.patientName}</span>
                      <span className="text-[10px] font-bold text-white/60 uppercase">
                        {getGenderLabel(patient.patientGender)}, {getAge(patient.patientBirthDate)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {showTyping && renderProgress('Digitação', typedCount, 'typing')}
                      {showRelease && renderProgress('Liberação', releasedCount, 'release')}
                    </div>
                  </div>


                  <div className="flex items-center gap-4">
                    {patientHasLaudo(patient) && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openLaudo(patient); }}
                        disabled={laudoLoading}
                        className="h-7 px-3 text-[9px] font-black uppercase gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      >
                        {laudoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                        {laudoLoading ? 'Carregando' : 'Visualizar Laudo'}
                      </Button>
                    )}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Protocolo</span>
                      <span className="text-sm font-mono font-black">{patient.protocol}</span>
                    </div>
                  </div>

                </div>

                {/* Exames do Paciente */}
                {isExpanded && (
                  <div className="p-6 space-y-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <InstrumentGraphicsSection protocol={patient.protocol} />
                    {patient.exams.map((exam: any) => {
                      const hasResult = getParams(exam).some((p: any) => 
                        (results[`${exam.id}_${p.id}`] || '').trim() !== ''
                      );
                      const isDigitized = examStatuses[exam.id] === 'digitized' && hasResult;
                      const isReleased = examStatuses[exam.id] === 'released';

                      return (
                        <div key={exam.id} className={cn(
                          "relative bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 transition-all duration-300",
                          isReleased && "opacity-80 grayscale-[0.2]"
                        )}>
                          {/* Título do Exame */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "h-3 w-3 rounded-full shadow-sm transition-colors",
                                isReleased || isDigitized ? "bg-emerald-500" :
                                exam.workbench === 'Bioquímica' ? "bg-blue-500" :
                                exam.workbench === 'Hematologia' ? "bg-purple-500" :
                                "bg-slate-400"
                              )} />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-white text-primary border-primary/20 text-[10px] font-black h-5 uppercase">
                                    {exam.code}
                                  </Badge>
                                  <h4 className="text-sm font-black uppercase tracking-tight">{exam.name}</h4>
                                  
                                  {/* Ações do Exame */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-primary z-10">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-52 z-[110]">
                                      {!isReleased && canRelease && (
                                        <DropdownMenuItem
                                          onClick={(e) => { e.stopPropagation(); handleReleaseExam(exam.id); }}
                                          disabled={!hasResult}
                                          className="text-xs font-bold uppercase text-emerald-600 gap-2"
                                        >
                                          <ShieldCheck className="h-3.5 w-3.5" />
                                          Liberar exame
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExamAction(exam.id, 'cancelar'); }} className="text-xs font-bold uppercase text-rose-600 gap-2">
                                        <XCircle className="h-3.5 w-3.5" /> 
                                        {examStatuses[exam.id] === 'cancelled' ? "Reverter Cancelamento" : "Cancelar exame"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExamAction(exam.id, 'reteste'); }} className="text-xs font-bold uppercase text-amber-600 gap-2">
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        {examActions[exam.id]?.type === 'reteste' ? "Remover Reteste" : "Solicitar Reteste"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExamAction(exam.id, 'recoleta'); }} className="text-xs font-bold uppercase text-orange-600 gap-2">
                                        <Syringe className="h-3.5 w-3.5" />
                                        {examActions[exam.id]?.type === 'recoleta' ? "Remover Recoleta" : "Solicitar Recoleta"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {examActions[exam.id] && (
                                    <Badge className={cn(
                                      "h-4 text-[7px] font-black uppercase",
                                      examActions[exam.id].type === 'cancelado' ? "bg-rose-100 text-rose-700" :
                                      examActions[exam.id].type === 'reteste' ? "bg-amber-100 text-amber-700" :
                                      "bg-orange-100 text-orange-700"
                                    )}>
                                      {examActions[exam.id].type}
                                    </Badge>
                                  )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-bold uppercase">
                                <CalendarIcon className="h-3 w-3" />
                                Coleta: {format(new Date(exam.registeredAt), 'dd/MM/yyyy HH:mm')}
                              </div>
                              {(() => {
                                const info = diffInfoFor(getParams(exam), (pid) => results[`${exam.id}_${pid}`] || '');
                                if (!info) return null;
                                return (
                                  <div className="mt-1">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-rose-600">
                                      Glóbulos Brancos (Total: {info.total.toFixed(2).replace('.', ',')} %)
                                    </span>
                                    {info.over && (
                                      <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase text-rose-600">
                                        <AlertTriangle className="h-3 w-3 shrink-0" /> A soma do diferencial ultrapassou 100% — verifique os valores
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                            <div className="flex items-center gap-2">
                              {!isDigitized && !isReleased && canType && (
                                <Button 
                                  onClick={() => handleConcluirExame(exam.id)}
                                  size="sm" 
                                  disabled={!getParams(exam).every((p: any) => 
                                    (results[`${exam.id}_${p.id}`] || '').trim() !== ''
                                  )}
                                  className="h-7 px-3 text-[9px] font-black uppercase gap-1.5 bg-sky-500 hover:bg-sky-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Concluir Exame
                                </Button>
                              )}

                              {isDigitized && canRelease && (
                                <Button 
                                  onClick={() => handleReleaseExam(exam.id)}
                                  size="sm" 
                                  className="h-7 px-3 text-[9px] font-black uppercase gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Liberar exame
                                </Button>
                              )}
                              
                              {isReleased && (
                                <Badge className="h-7 px-3 text-[9px] font-black uppercase gap-1.5 bg-emerald-100 text-emerald-700 border-emerald-200">
                                  <Check className="h-3 w-3" />
                                  Liberado
                                </Badge>
                              )}

                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  className={cn(
                                    "h-7 px-2 text-[9px] font-black uppercase gap-1 bg-white border-slate-200",
                                    (portalBlocks[exam.id]?.length || 0) > 0 && "border-rose-300 bg-rose-50 text-rose-700"
                                  )}
                                >
                                  Bloqueio de visualização de laudo
                                  {(portalBlocks[exam.id]?.length || 0) > 0 && (
                                    <span className="ml-1 rounded-full bg-rose-600 px-1.5 text-[8px] text-white">
                                      {portalBlocks[exam.id].length}
                                    </span>
                                  )}
                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={4} className="w-64 z-[9999] bg-popover">

                                <DropdownMenuLabel className="text-[10px] font-black uppercase">
                                  Bloquear nos Portais Externos
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {PORTAL_BLOCK_OPTIONS.map(opt => (
                                  <DropdownMenuCheckboxItem
                                    key={opt.value}
                                    checked={(portalBlocks[exam.id] || []).includes(opt.value)}
                                    onSelect={(e) => e.preventDefault()}
                                    onCheckedChange={() => togglePortalBlock(exam, opt.value)}
                                    className="text-xs font-bold uppercase"
                                  >
                                    {opt.label}
                                  </DropdownMenuCheckboxItem>
                                ))}
                                <DropdownMenuSeparator />
                                <p className="px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
                                  Os portais marcados verão apenas o aviso de exame indisponível.
                                </p>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Parâmetros do Exame */}
                        <div className={cn(
                          "grid gap-x-8 gap-y-4 pt-2",
                          viewMode === 'grid'
                            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                            : "grid-cols-1 gap-y-2"
                        )}>
                          {getParams(exam).map((param: any) => {
                            const value = getParamValue(exam, param);
                            const reference = resolveReference(param, value);
                            const status = getResultStatus(value, reference);
                            
                            return (
                              <div key={param.id} className={cn(
                                "rounded-lg transition-colors duration-300",
                                viewMode === 'grid'
                                  ? "space-y-1.5 p-3"
                                  : "flex items-center gap-4 px-3 py-1.5",
                                status.bgColor
                              )}>
                                <div className={cn(
                                  "flex justify-between items-center",
                                  viewMode === 'list' && "w-[240px] shrink-0"
                                )}>
                                  <label className="text-[10px] font-black uppercase text-slate-600 ml-1 flex items-center gap-1">
                                    {param.name}
                                    {param.isCalculated && (
                                      <span className="px-1 py-[1px] rounded bg-primary/10 text-primary text-[8px] font-black">CALC</span>
                                    )}
                                  </label>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                                    {param.unit}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 flex-1">

                                  <div className="relative flex-1 group">
                                    {param.type === 'selection' && (param.options?.length ?? 0) > 0 ? (
                                    <Select
                                      value={value || undefined}
                                      disabled={!isExamEditable(exam.id)}
                                      onValueChange={(val) => setResults(prev => ({ ...prev, [`${exam.id}_${param.id}`]: val }))}
                                    >
                                      <SelectTrigger className={cn(
                                        "h-10 text-sm font-bold bg-white border-slate-200 focus:border-primary",
                                        !isExamEditable(exam.id) && "bg-slate-100 text-slate-500"
                                      )}>
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent className="z-[200] bg-white">
                                        {param.options.map((opt: string) => (
                                          <SelectItem key={opt} value={opt} className="text-xs font-semibold">{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    ) : (
                                    <Input 
                                      className={cn(
                                        "h-10 text-sm font-bold bg-white border-slate-200 focus:border-primary transition-all pr-12",
                                        status.label === 'Baixo' && "border-amber-400 focus:border-amber-500",
                                        status.label === 'Alto' && "border-rose-400 focus:border-rose-500",
                                        status.label === 'Normal' && "border-emerald-400 focus:border-emerald-500",
                                        (!isExamEditable(exam.id) || param.isCalculated) && "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                                      )}
                                      placeholder={param.isCalculated ? 'Calculado' : 'Resultado'}
                                      value={value}
                                      readOnly={!!param.isCalculated}
                                      disabled={!isExamEditable(exam.id)}
                                      onChange={(e) => {
                                        if (param.isCalculated) return;
                                        setResults(prev => ({ ...prev, [`${exam.id}_${param.id}`]: e.target.value }));
                                      }}
                                    />
                                    )}

                                    {param.type !== 'selection' && status.label && (
                                      <div className={cn(
                                        "absolute right-2 top-2.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                        status.label === 'Baixo' ? "bg-amber-100 text-amber-700" :
                                        status.label === 'Alto' ? "bg-rose-100 text-rose-700" :
                                        "bg-emerald-100 text-emerald-700"
                                      )}>
                                        {status.label}
                                      </div>
                                    )}
                                  </div>
                                  {showCorrectionPencil(exam.id) && (
                                    <button
                                      type="button"
                                      title="Corrigir resultado"
                                      aria-label="Corrigir resultado"
                                      onClick={() => setCorrectionUnlocked(prev => ({ ...prev, [exam.id]: true }))}
                                      className="h-8 w-8 shrink-0 rounded-md border border-amber-300 bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <div className="w-32 bg-slate-200/50 rounded px-2 py-1 flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-tight">Referência</span>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{reference || '—'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Campo Nota */}
                        <div className="pt-2">
                          <div className="relative">
                            <Input 
                              className={cn(
                                "h-9 text-xs bg-white border-slate-200 focus:border-primary text-slate-700 placeholder:italic",
                                !isExamEditable(exam.id) && "bg-slate-100 cursor-not-allowed"
                              )}
                              placeholder="Nota / Observações técnicas..."
                              value={notes[exam.id] || ''}
                              disabled={!isExamEditable(exam.id)}
                              onChange={(e) => setNotes(prev => ({ ...prev, [exam.id]: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Campos de Reteste/Recoleta contextuais */}
                        {(examActions[exam.id]?.type === 'reteste' || examActions[exam.id]?.type === 'recoleta') && (
                          <div className={cn(
                            "p-3 rounded-lg border animate-in slide-in-from-top-2 duration-200",
                            examActions[exam.id].type === 'reteste' ? "bg-amber-50 border-amber-200" : "bg-orange-50 border-orange-200"
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className={cn(
                                "h-4 w-4",
                                examActions[exam.id].type === 'reteste' ? "text-amber-600" : "text-orange-600"
                              )} />
                              <span className="text-[10px] font-black uppercase text-slate-700">
                                Motivo do {examActions[exam.id].type === 'reteste' ? 'Reteste' : 'Recoleta'} (Obrigatório para Valores Críticos)
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Select 
                                value={examActions[exam.id].reason || ""}
                                onValueChange={(val) => {
                                  if (examActions[exam.id].type === 'reteste') {
                                    handleRetestUpdate(exam.id, val, examActions[exam.id].details || "");
                                  } else {
                                    handleRecoletaUpdate(exam.id, val, examActions[exam.id].details || "");
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                                  <SelectValue placeholder="Selecione um motivo..." />
                                </SelectTrigger>
                                <SelectContent className="z-[120]">
                                  {examActions[exam.id].type === 'reteste' ? (
                                    <>
                                      <SelectItem value="Valor crítico / pânico">Valor crítico / pânico</SelectItem>
                                      <SelectItem value="Discrepância clínica">Discrepância clínica</SelectItem>
                                      <SelectItem value="Resultado inconsistente com histórico">Resultado inconsistente com histórico</SelectItem>
                                      <SelectItem value="Falha técnica do equipamento">Falha técnica do equipamento</SelectItem>
                                      <SelectItem value="Suspeita de interferência">Suspeita de interferência</SelectItem>
                                      <SelectItem value="Outro">Outro</SelectItem>
                                    </>
                                  ) : (
                                    <>
                                      <SelectItem value="Amostra hemolisada">Amostra hemolisada</SelectItem>
                                      <SelectItem value="Amostra lipêmica">Amostra lipêmica</SelectItem>
                                      <SelectItem value="Amostra ictérica">Amostra ictérica</SelectItem>
                                      <SelectItem value="Coágulo na amostra">Coágulo na amostra</SelectItem>
                                      <SelectItem value="Volume insuficiente">Volume insuficiente</SelectItem>
                                      <SelectItem value="Tubo inadequado">Tubo inadequado</SelectItem>
                                      <SelectItem value="Identificação incorreta">Identificação incorreta</SelectItem>
                                      <SelectItem value="Outro">Outro</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>

                              <Input 
                                className="h-9 text-xs bg-white border-slate-200"
                                placeholder="Detalhes adicionais (opcional)..."
                                value={examActions[exam.id].details || ""}
                                onChange={(e) => {
                                  if (examActions[exam.id].type === 'reteste') {
                                    handleRetestUpdate(exam.id, examActions[exam.id].reason || "", e.target.value);
                                  } else {
                                    handleRecoletaUpdate(exam.id, examActions[exam.id].reason || "", e.target.value);
                                  }
                                }}
                              />
                            </div>

                            {/* Botão aplicar recoleta — só persistido após confirmação */}
                            {examActions[exam.id].type === 'recoleta' && (
                              <div className="flex justify-end mt-3">
                                {examActions[exam.id].applied ? (
                                  <Badge className="bg-orange-100 text-orange-700 border border-orange-300 text-[10px] font-black uppercase px-3 py-1.5 gap-1.5">
                                    <Check className="h-3 w-3" /> Recoleta aplicada — amostra Pendente
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-8 px-4 text-[10px] font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                                    disabled={!examActions[exam.id].reason}
                                    onClick={() => handleApplyRecoleta(exam.id)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" /> Aplicar Recoleta
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Resultados Anteriores (reais) */}
                        {(() => {
                          const prevList = prevResults[`${patient.patientId}|${String(exam.code || exam.name || '').toUpperCase()}`] || [];
                          if (prevList.length === 0) return null;
                          return (
                            <div className="mt-4 pt-4 border-t border-slate-200/60">
                              <div className="flex items-center gap-2 mb-3">
                                <History className="h-3.5 w-3.5 text-primary" />
                                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  {exam.code} - Resultados Anteriores:
                                </h5>
                              </div>
                              {(
                                <ScrollArea className="w-full">

                                  <div className="flex gap-3 pb-2">
                                    {prevList.map((prev, i) => (
                                      <div key={i} className="shrink-0 bg-white border border-slate-200 rounded-lg p-2 min-w-[140px] shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="text-[9px] font-bold text-slate-400">
                                            {format(new Date(prev.date), 'dd/MM/yy HH:mm')}
                                          </span>
                                          <Badge className="h-3 text-[7px] font-black bg-slate-100 text-slate-600 border-none uppercase">
                                            {exam.code}
                                          </Badge>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                          <span className="text-sm font-black text-slate-700">{prev.value}</span>
                                          {prev.unit && <span className="text-[9px] font-bold text-slate-400">{prev.unit}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              )}
                            </div>
                          );
                        })()}

                        {/* Divisor sutil de fim de exame */}
                        <div className="mt-4 h-[3px] w-full rounded-full bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/5" aria-hidden="true" />

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  </ScrollArea>

      {/* Barra de navegação — modo 1 paciente por vez */}
      {entryMode === 'unico' && groupedPatients.length > 0 && (
        <div className="border-t bg-muted/30 px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPatient(safeIndex - 1)}
              disabled={safeIndex === 0}
              className="h-9 gap-1 font-black uppercase text-[10px]"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Paciente {safeIndex + 1} de {groupedPatients.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPatient(safeIndex + 1)}
              disabled={safeIndex >= groupedPatients.length - 1}
              className="h-9 gap-1 font-black uppercase text-[10px]"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={actionMode} onValueChange={(v) => setActionMode(v as any)}>
              <SelectTrigger className="h-9 w-[170px] text-[11px] font-bold uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[160]">
                <SelectItem value="ambos">Digitar e Liberar</SelectItem>
                <SelectItem value="digitar">Apenas Digitar</SelectItem>
                <SelectItem value="liberar">Apenas Liberar</SelectItem>
              </SelectContent>
            </Select>

            {(actionMode === 'ambos' || actionMode === 'digitar') && canType && (
              <Button
                onClick={() => handleConcluirPaciente(groupedPatients[safeIndex])}
                disabled={saving}
                className="h-9 px-4 font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-white hover:bg-primary/90"
              >
                <CheckCircle2 className="h-4 w-4" /> Digitar e Próximo
              </Button>
            )}

            {(actionMode === 'ambos' || actionMode === 'liberar') && canRelease && (
              <Button
                variant="outline"
                onClick={() => handleLiberarPaciente(groupedPatients[safeIndex])}
                disabled={saving}
                className="h-9 px-4 font-black uppercase text-[10px] tracking-widest gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
              >
                <ShieldCheck className="h-4 w-4" /> Liberar e Próximo
              </Button>
            )}
          </div>
        </div>
      )}



      {/* Rodapé Fixo */}
      <footer className="h-20 border-t bg-card px-8 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out" 
                  style={{ width: `${(filledExamsCount / (totalExams || 1)) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-primary uppercase">
                {Math.round((filledExamsCount / (totalExams || 1)) * 100)}%
              </span>
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {filledExamsCount} de {totalExams} exames preenchidos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canType && (
          <Button 
            variant="outline" 
            onClick={() => handleSave(true)}
            disabled={saving}
            className="h-11 px-8 font-black uppercase text-[10px] tracking-widest gap-2 border-primary/20 text-primary hover:bg-primary/5"
          >
            <Save className="h-4 w-4" />
            SALVAR PARCIAL
          </Button>
          )}

          {canRelease && (
          <Button 
            variant="outline" 
            onClick={handleReleaseAllDigitized}
            disabled={saving || !Object.values(examStatuses).includes('digitized')}
            className="h-11 px-6 font-black uppercase text-[10px] tracking-widest gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            Liberar Digitados
          </Button>
          )}

          {(canType || canCorrect) && (
          <Button 
            onClick={() => handleSave(false)}
            disabled={isConcluirDisabled}
            className="h-11 px-8 font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir Digitação
          </Button>
          )}
        </div>
      </footer>

      {/* Modal de Cancelamento */}
      {cancelModal && (
        <Dialog open={cancelModal.isOpen} onOpenChange={(open) => { if (!open) { setCancelModal(null); setCancelReason(""); setCancelConfirmed(false); } }}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl z-[150]">
            <DialogHeader className="p-6 bg-white flex flex-row items-center gap-3 border-b">
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Ban className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                Cancelar exame
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 space-y-1">
                <p className="text-sm font-black text-slate-800">{cancelModal.exam?.name}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase">
                  Status atual: {examStatuses[cancelModal.exam?.id] === 'digitized' ? 'Digitado' : 'Em análise'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-amber-900 uppercase">O exame ficará cancelado no histórico do atendimento.</p>
                  <p className="text-[10px] leading-relaxed text-amber-800/80 font-medium">
                    A coleta e os resultados já registrados serão preservados por rastreabilidade — o exame apenas some das filas de coleta, análise, validação e do laudo ativo.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                  Motivo do cancelamento <span className="text-rose-500">*</span>
                </Label>
                <Textarea 
                  placeholder="Ex.: solicitação equivocada, paciente desistiu, material insuficiente..."
                  className="min-h-[100px] text-xs resize-none bg-slate-50 border-slate-200 focus:border-rose-500 transition-colors"
                  id="cancel-reason"
                  maxLength={500}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase text-right">Mínimo 10 caracteres · {cancelReason.length}/500</p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="confirm-cancel" checked={cancelConfirmed} onCheckedChange={(v) => setCancelConfirmed(v === true)} className="border-slate-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500" />
                <label
                  htmlFor="confirm-cancel"
                  className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirmo que revi as consequências e desejo cancelar este exame.
                </label>
              </div>
            </div>

            <DialogFooter className="p-6 bg-slate-50 flex items-center justify-end gap-3 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => { setCancelModal(null); setCancelReason(""); setCancelConfirmed(false); }}
                className="font-black uppercase text-[10px] tracking-widest px-6"
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  const reason = cancelReason.trim();
                  if (reason.length < 10) {
                    toast.error("Por favor, informe um motivo válido (mín. 10 caracteres).");
                    return;
                  }
                  if (!cancelConfirmed) {
                    toast.error("Por favor, confirme a operação.");
                    return;
                  }
                  handleCancelConfirm(cancelModal.exam?.id, reason);
                  setCancelReason("");
                  setCancelConfirmed(false);
                }}
                className="font-black uppercase text-[10px] tracking-widest px-6 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200"
              >
                Cancelar exame
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Visualização do Laudo */}
      {laudoLoading && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-background/75 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="w-[min(420px,calc(100vw-2rem))] rounded-lg border bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-bold">Carregando laudo...</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full gradient-bg" />
            </div>
          </div>
        </div>
      )}
      {laudoOrder && (
        <PDFPreviewModal
          isOpen={laudoOpen}
          onClose={() => setLaudoOpen(false)}
          order={laudoOrder}
          onDownload={() => window.print()}
          onPrint={() => window.print()}
          viewOnly
        />
      )}

    </div>

  );
}
