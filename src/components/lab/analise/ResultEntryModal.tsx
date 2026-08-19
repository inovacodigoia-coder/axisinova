import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildExamParams, catalogKey, findCatalogExam, evaluateFormula } from '@/utils/examParameters';

import { resolveCompanyId } from '@/utils/companyId';
import { useAuth } from '@/context/AuthContext';
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
  Loader2
} from 'lucide-react';
import PDFPreviewModal from '@/components/lab/PDFPreviewModal';

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
  refreshData
}: ResultEntryModalProps & { refreshData?: () => void }) {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [examStatuses, setExamStatuses] = useState<Record<string, string>>({});
  const [examActions, setExamActions] = useState<Record<string, { type: string; reason?: string; details?: string }>>({});
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; exam: any } | null>(null);
  const [retestReasons, setRetestReasons] = useState<Record<string, { reason: string; details: string }>>({});
  const [recoletaReasons, setRecoletaReasons] = useState<Record<string, { reason: string; details: string }>>({});
  const [prevResults, setPrevResults] = useState<Record<string, { date: string; value: string; unit: string }[]>>({});
  const [laudoOrder, setLaudoOrder] = useState<any>(null);
  const [laudoOpen, setLaudoOpen] = useState(false);
  const [laudoLoading, setLaudoLoading] = useState(false);

  /* Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.
                                            
                                            I have approved the plan */
  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});

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
    return () => { active = false; };
  }, [isOpen]);

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
        const catalogExam = findCatalogExam(catalogList, {
          examId: exam.examId,
          code: exam.code,
          name: exam.name,
        });
        
        // Log para depuração interna se necessário
        const resolved = buildExamParams(catalogExam, exam.name || exam.code, {
          gender: patient.patientGender,
          age,
        });
        
        map[exam.id] = resolved;
      });
    });
    return map;
  }, [groupedPatients, catalogList]);

  const getParams = (exam: any) => paramsByExam[exam.id] || [{ id: '1', name: exam?.name || '', unit: '', reference: '' }];

  // Valor exibido: parâmetros calculados usam a fórmula do catálogo
  const getParamValue = useCallback((exam: any, param: any) => {
    if (param?.isCalculated) {
      return evaluateFormula(param.formula, getParams(exam), (pid) => results[`${exam.id}_${pid}`] || '');
    }
    return results[`${exam.id}_${param.id}`] || '';
  }, [results, paramsByExam]);

  // Persiste automaticamente os calculados no estado para salvar/laudo
  useEffect(() => {
    const updates: Record<string, string> = {};
    Object.entries(paramsByExam).forEach(([examId, params]: any) => {
      (params as any[]).forEach((p: any) => {
        if (!p.isCalculated) return;
        const computed = evaluateFormula(p.formula, params, (pid) => results[`${examId}_${pid}`] || '');
        const key = `${examId}_${p.id}`;
        if (computed && results[key] !== computed) updates[key] = computed;
      });
    });
    if (Object.keys(updates).length > 0) {
      setResults(prev => ({ ...prev, ...updates }));
    }
  }, [results, paramsByExam]);


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
          reference: p.reference || null,
          status: getResultStatus(value, p.reference || '').label || null,
          sort_order: idx,
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
      const refs = filteredExams.map(examRefOf);
      if (refs.length === 0) return;
      const { data } = await supabase
        .from('lab_exam_results')
        .select('id, exam_ref, status, notes, lab_result_values(parameter_key, value)')
        .eq('company_id', cid)
        .in('exam_ref', refs);
      if (!active || !data) return;

      const nextResults: Record<string, string> = {};
      const nextNotes: Record<string, string> = {};
      const nextStatuses: Record<string, any> = {};
      data.forEach((row: any) => {
        const examId = String(row.exam_ref).split(':').slice(1).join(':');
        if (row.notes) nextNotes[examId] = row.notes;
        if (row.status === 'digitized' || row.status === 'released') {
          nextStatuses[examId] = row.status;
        }
        (row.lab_result_values || []).forEach((v: any) => {
          if (v.value) nextResults[`${examId}_${v.parameter_key}`] = v.value;
        });
      });
      setResults(prev => ({ ...nextResults, ...prev }));
      setNotes(prev => ({ ...nextNotes, ...prev }));
      setExamStatuses(prev => ({ ...nextStatuses, ...prev }));
    })();
    return () => { active = false; };
  }, [isOpen, filteredExams, user?.companyId]);

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
              const st = getResultStatus(value, p.reference || '');
              return {
                parameterId: String(p.id),
                parameterCode: p.name,
                parameterName: p.name,
                section: p.section || '',
                value,
                unit: p.unit || '',
                referenceRange: p.reference || '—',
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

      // Dados do responsável pela aprovação (usuário logado)
      let approvedBy = user?.name || '';
      let approvedRegister = '';
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, council_type, council_uf, council_number')
          .eq('id', user.id)
          .maybeSingle();
        if (prof) {
          approvedBy = prof.full_name || approvedBy;
          approvedRegister = [prof.council_type, prof.council_uf].filter(Boolean).join('/') +
            (prof.council_number ? ` ${prof.council_number}` : '');
          approvedRegister = approvedRegister.trim();
        }
      }

      const releasedAt = new Date().toISOString();

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
        toast.success("Cancelamento revertido.");
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
      // Toggle recoleta: se já for recoleta, remove
      if (examActions[examId]?.type === 'recoleta') {
        setExamActions(prev => {
          const next = { ...prev };
          delete next[examId];
          return next;
        });
        toast.info("Ação de recoleta removida.");
      } else {
        setExamActions(prev => ({ ...prev, [examId]: { type: 'recoleta', reason: '', details: '' } }));
        toast.info("Informe o motivo da recoleta abaixo das observações técnicas.");
      }
    }
  };

  const handleCancelConfirm = (examId: string, reason: string) => {
    setExamStatuses(prev => ({ ...prev, [examId]: 'cancelled' }));
    setExamActions(prev => ({ ...prev, [examId]: { type: 'cancelado', reason } }));
    setCancelModal(null);
    toast.error("Exame cancelado com sucesso!");
  };

  const handleRetestUpdate = (examId: string, reason: string, details: string) => {
    setRetestReasons(prev => ({ ...prev, [examId]: { reason, details } }));
    setExamActions(prev => ({ ...prev, [examId]: { type: 'reteste', reason, details } }));
    toast.info("Solicitação de reteste salva como rascunho.");
  };

  const handleRecoletaUpdate = (examId: string, reason: string, details: string) => {
    setRecoletaReasons(prev => ({ ...prev, [examId]: { reason, details } }));
    setExamActions(prev => ({ ...prev, [examId]: { type: 'recoleta', reason, details } }));
    toast.info("Solicitação de recoleta salva como rascunho.");
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

        <div className="flex items-center gap-6">
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

      {/* Conteúdo */}
      <ScrollArea className="flex-1 bg-slate-50">
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
            groupedPatients.map((patient, pIdx) => {
              const isExpanded = !!expandedPatients[patient.protocol];
              return (
                <div key={patient.protocol} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ animationDelay: `${pIdx * 50}ms` }}>
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
                      </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black uppercase tracking-tight">{patient.patientName}</span>
                      <span className="text-[10px] font-bold text-white/60 uppercase">
                        {getGenderLabel(patient.patientGender)}, {getAge(patient.patientBirthDate)}
                      </span>
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
                                    <DropdownMenuContent align="start" className="w-48 z-[110]">
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
                            </div>
                          </div>

                            <div className="flex items-center gap-2">
                              {!isDigitized && !isReleased && (
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

                              {isDigitized && (
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

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[9px] font-black uppercase gap-1 bg-white border-slate-200">
                                  Versão: 1
                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-xs font-bold uppercase">Versão 1 (Padrão)</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs font-bold uppercase">Versão 2 (Metodologia B)</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Parâmetros do Exame */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 pt-2">
                          {getParams(exam).map((param: any) => {
                            const value = getParamValue(exam, param);
                            const status = getResultStatus(value, param.reference || '');
                            
                            return (
                              <div key={param.id} className={cn(
                                "space-y-1.5 p-3 rounded-lg transition-colors duration-300",
                                status.bgColor
                              )}>
                                <div className="flex justify-between items-center">
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
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-1 group">
                                    {param.type === 'selection' && (param.options?.length ?? 0) > 0 ? (
                                    <Select
                                      value={value || undefined}
                                      disabled={examStatuses[exam.id] === 'released'}
                                      onValueChange={(val) => setResults(prev => ({ ...prev, [`${exam.id}_${param.id}`]: val }))}
                                    >
                                      <SelectTrigger className={cn(
                                        "h-10 text-sm font-bold bg-white border-slate-200 focus:border-primary",
                                        examStatuses[exam.id] === 'released' && "bg-slate-100 text-slate-500"
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
                                        (examStatuses[exam.id] === 'released' || param.isCalculated) && "bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500"
                                      )}
                                      placeholder={param.isCalculated ? 'Calculado' : 'Resultado'}
                                      value={value}
                                      readOnly={!!param.isCalculated}
                                      disabled={examStatuses[exam.id] === 'released'}
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
                                  <div className="w-32 bg-slate-200/50 rounded px-2 py-1 flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase leading-tight">Referência</span>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{param.reference || '—'}</span>
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
                                examStatuses[exam.id] === 'released' && "bg-slate-100 cursor-not-allowed"
                              )}
                              placeholder="Nota / Observações técnicas..."
                              value={notes[exam.id] || ''}
                              disabled={examStatuses[exam.id] === 'released'}
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
          <Button 
            variant="outline" 
            onClick={() => handleSave(true)}
            disabled={saving}
            className="h-11 px-8 font-black uppercase text-[10px] tracking-widest gap-2 border-primary/20 text-primary hover:bg-primary/5"
          >
            <Save className="h-4 w-4" />
            Salvar Rascunho
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReleaseAllDigitized}
            disabled={saving || !Object.values(examStatuses).includes('digitized')}
            className="h-11 px-6 font-black uppercase text-[10px] tracking-widest gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            Liberar Digitados
          </Button>

          <Button 
            onClick={() => handleSave(false)}
            disabled={isConcluirDisabled}
            className="h-11 px-8 font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir Digitação
          </Button>
        </div>
      </footer>

      {/* Modal de Cancelamento */}
      {cancelModal && (
        <Dialog open={cancelModal.isOpen} onOpenChange={(open) => !open && setCancelModal(null)}>
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
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase text-right">Mínimo 10 caracteres · 0/500</p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="confirm-cancel" className="border-slate-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500" />
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
                onClick={() => setCancelModal(null)}
                className="font-black uppercase text-[10px] tracking-widest px-6"
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  const reason = (document.getElementById('cancel-reason') as HTMLTextAreaElement)?.value;
                  const confirmed = (document.getElementById('confirm-cancel') as HTMLInputElement)?.checked;
                  if (!reason || reason.length < 10) {
                    toast.error("Por favor, informe um motivo válido (mín. 10 caracteres).");
                    return;
                  }
                  if (!confirmed) {
                    toast.error("Por favor, confirme a operação.");
                    return;
                  }
                  handleCancelConfirm(cancelModal.exam?.id, reason);
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
        />
      )}

    </div>

  );
}
