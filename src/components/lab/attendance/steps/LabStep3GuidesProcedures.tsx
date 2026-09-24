import React, { useState, useMemo, useEffect } from 'react';
import { materialPorNome } from '@/lib/tubos'
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Trash2, Stethoscope, ClipboardCheck, 
  PlusCircle, Calendar, HelpCircle, Edit2, Star, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCompanyContext } from '@/context/CompanyContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRegisters } from '@/context/RegistersContext';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { QuickDoctorModal } from "@/components/lab/attendance/QuickDoctorModal";
import { Truck, ChevronDown, AlertTriangle } from 'lucide-react';
import { abreviarNome, APOIO_NOME_MAX, validarApoio, infoCompNumerico, type ApoioInfo } from '@/lib/apoioAtendimento';

interface Props {
  state: any;
  update: (patch: any) => void;
}

// Representa uma guia (tab)
interface AttendanceGuide {
  id: string;
  name: string;
  plan: string;
  operator: string;
  number: string;
  exams: any[];
  convenioName?: string;
  convenioId?: string | null;
  isDoctorDisabled?: boolean;
  doctorName?: string;
  doctorCrm?: string;
  doctorCrmState?: string;
  doctorCouncil?: string;
  doctorCbos?: string;
}

export function LabStep3GuidesProcedures({ state, update }: Props) {
  const { convenios, exams: clinicExams, doctors } = useRegisters();
  const { user } = useAuth();
  const { activeProfile, activeSector } = useCompanyContext();
  const activeConvenios = useMemo(() => convenios.filter(c => c.isActive), [convenios]);
  const activeDoctors = useMemo(() => doctors.filter(d => d.isActive), [doctors]);
  
  const canEditDeadline = useMemo(() => {
    if (!user) return false;
    if (user.role === 'company_admin' || user.role === 'super_admin') return true;
    
    // Check if the current sector allows the current profile to edit deadlines
    if (activeSector?.allowedDeadlineEditProfiles && activeProfile) {
      return activeSector.allowedDeadlineEditProfiles.includes(activeProfile.id);
    }
    
    return false;
  }, [user, activeProfile, activeSector]);

  const [guides, setGuides] = useState<AttendanceGuide[]>(state.guides || []);
  const [activeGuideId, setActiveGuideId] = useState(guides[0]?.id || '');

  // Plano Principal selecionado no passo "Atendimento" (convênio principal do paciente)
  const mainConvenio = useMemo(() => {
    const pc = state.patient?.convenios?.[0];
    if (!pc?.convenioId) return null;
    return activeConvenios.find(c => c.id === pc.convenioId) || null;
  }, [state.patient?.convenios, activeConvenios]);

  const buildGuide = (id: string): AttendanceGuide => ({
    id,
    name: mainConvenio ? mainConvenio.name : 'NOVA GUIA',
    plan: mainConvenio ? mainConvenio.name : '',
    convenioName: mainConvenio ? mainConvenio.name : '',
    convenioId: mainConvenio ? mainConvenio.id : null,
    operator: mainConvenio ? ((mainConvenio as any).operator || mainConvenio.name) : '',
    number: state.patient?.convenios?.[0]?.cardNumber || '',
    exams: [],
    isDoctorDisabled: false,
  });

  useEffect(() => {
    if (guides.length === 0) {
      const initialGuide = buildGuide('1');
      setGuides([initialGuide]);
      setActiveGuideId('1');
      update({ guides: [initialGuide] });
    }
  }, [mainConvenio]);
  const [showDoctorPopover, setShowDoctorPopover] = useState(false);
  
  // Doctor search state
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showNewDoctorModal, setShowNewDoctorModal] = useState(false);

  // Modal states for adding/editing exam
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamIndex, setEditingExamIndex] = useState<number | null>(null);
  const [examSearch, setExamSearch] = useState('');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examMaterial, setExamMaterial] = useState('');
  const [examCollected, setExamCollected] = useState(true);
  const [examDeadline, setExamDeadline] = useState<string | null>(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [tempDeadline, setTempDeadline] = useState('');
  const [tempCollectionDate, setTempCollectionDate] = useState('');


  const addGuide = () => {
    const newId = (guides.length + 1).toString();
    const newGuide = buildGuide(newId);
    setGuides([...guides, newGuide]);
    setActiveGuideId(newId);
    update({ guides: [...guides, newGuide] });
  };

  const activeGuide = guides.find(g => g.id === activeGuideId);

  const filteredExams = useMemo(() => {
    if (!examSearch || selectedExam) return [];
    return clinicExams.filter(e =>
      e.isActive !== false &&
      (e.name.toLowerCase().includes(examSearch.toLowerCase()) ||
      e.tussCode?.toLowerCase().includes(examSearch.toLowerCase()) ||
      (e.internalCode && e.internalCode.toLowerCase().includes(examSearch.toLowerCase())))
    );
  }, [examSearch, clinicExams, selectedExam]);

  const filteredDoctors = useMemo(() => {
    if (!doctorSearch || doctorSearch.length < 2) return [];
    return activeDoctors.filter(d => 
      d.fullName.toLowerCase().includes(doctorSearch.toLowerCase()) || 
      d.crm.toLowerCase().includes(doctorSearch.toLowerCase())
    );
  }, [doctorSearch, activeDoctors]);

  const selectDoctor = (doc: any) => {
    // Update guide with doctor data
    const newGuides = guides.map(g => g.id === activeGuideId ? { 
      ...g, 
      doctorId: doc.id,
      doctorCrm: doc.crm,
      doctorCrmState: doc.crmState,
      doctorName: doc.fullName,
      doctorCbos: '225125' // Default or based on specialty if available
    } : g);
    setGuides(newGuides);
    // Propaga o médico para o atendimento (aparece nos Detalhes do Atendimento e no laudo)
    update({
      guides: newGuides,
      doctorId: doc.id,
      doctorName: doc.fullName,
      doctorCRM: doc.crm,
      requestingDoctor: doc.fullName,
      specialty: doc.specialty || undefined,
    } as any);
    setDoctorSearch(doc.fullName);
    setShowDoctorDropdown(false);
  };

  const handleOpenExamModal = (index: number | null = null) => {
    if (index !== null && activeGuide) {
      const exam = activeGuide.exams[index];
      setSelectedExam(exam);
      setExamMaterial(exam.material || '');
      setExamCollected(exam.collected ?? true);
      setExamSearch(exam.name);
      setEditingExamIndex(index);
      setExamDeadline(exam.expectedDeliveryDate || null);
    } else {
      setSelectedExam(null);
      setExamMaterial('');
      setExamCollected(true);
      setExamSearch('');
      setEditingExamIndex(null);
      setExamDeadline(null);
    }
    setShowExamModal(true);
  };

  // Prazo pela função única do banco (calcular_prazo), na contagem do exame: corridos (padrão) ou úteis
  const calculateDeadline = async (days: number, contagem: 'corridos' | 'uteis' = 'corridos') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const { data, error } = await supabase.rpc('calcular_prazo', { _company_id: null as any, _data_inicial: today, _dias: days, _contagem: contagem });
    if (error || !data) {
      const fallback = new Date(now);
      fallback.setDate(fallback.getDate() + days);
      return fallback.toISOString();
    }
    const [y, m, d] = String(data).split('-').map(Number);
    return new Date(y, m - 1, d, now.getHours(), now.getMinutes()).toISOString();
  };

  const handleOpenDeadlineModal = async (exam: any) => {
    const normalizeToIso = (val: any) => {
      if (!val) return new Date().toISOString();
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return val;
      const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
      if (match) {
        const [_, d, m, y, h, min] = match;
        return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min)).toISOString();
      }
      return new Date().toISOString();
    };

    setTempDeadline(normalizeToIso(exam.expectedDeliveryDate || await calculateDeadline(exam.resultDeadlineDays || 1, exam.prazoContagem === 'uteis' ? 'uteis' : 'corridos')));
    setTempCollectionDate(new Date().toISOString());
    setShowDeadlineModal(true);
  };


  // ── Exames de apoio ────────────────────────────────────────────────
  const [opcoesPorExame, setOpcoesPorExame] = useState<Record<string, any[]>>({});
  const carregarOpcoes = async (examId: string): Promise<any[]> => {
    if (opcoesPorExame[examId]) return opcoesPorExame[examId];
    try {
      const { data } = await supabase.rpc('apoio_exame_atendimento' as any, { _exam: examId });
      const opc = ((data as any)?.opcoes || []) as any[];
      setOpcoesPorExame(prev => ({ ...prev, [examId]: opc }));
      return opc;
    } catch { return []; }
  };

  const updateExamAt = (index: number, fn: (e: any) => any) => {
    const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, exams: g.exams.map((e, i) => i === index ? fn(e) : e) } : g);
    setGuides(newGuides);
    update({ guides: newGuides });
  };

  const trocarDestino = (index: number, o: any) => {
    updateExamAt(index, (e) => {
      const base = {
        ...e, bancadaId: o.bancada_id, bancadaNome: o.bancada_nome, bancadaTipo: o.tipo, laudoId: o.laudo_id ?? null,
        bancadaOrigem: o.atual ? 'cadastro' : 'troca_atendimento',
        expectedDeliveryDate: o.prazo ? `${o.prazo}T15:00:00.000Z` : e.expectedDeliveryDate,
        prazoContagem: o.contagem ?? e.prazoContagem,
      };
      if (o.tipo === 'apoio') {
        return { ...base, apoioId: o.apoio_id, apoioNome: o.apoio_nome, apoioCodigo: o.codigo_apoio, apoioPreco: o.preco ?? null,
          apoioModo: o.modo, apoioInfoComp: o.info_comp || [], apoioCondicoes: o.condicoes || [],
          apoioInfo: e.apoioId === o.apoio_id ? (e.apoioInfo || {}) : { nome_envio: e.apoioInfo?.nome_envio } };
      }
      const { apoioId, apoioNome, apoioCodigo, apoioPreco, apoioModo, apoioInfoComp, apoioCondicoes, apoioInfo, ...rest } = base;
      return { ...rest, apoioId: null, apoioNome: null };
    });
    toast.success(o.tipo === 'apoio' ? `Exame vai para ${o.apoio_nome}` : `Exame será feito internamente (${o.bancada_nome})`);
  };

  const setApoioInfo = (index: number, patch: Partial<ApoioInfo>, comp?: Record<string, string>) => {
    updateExamAt(index, (e) => ({ ...e, apoioInfo: { ...(e.apoioInfo || {}), ...patch, ...(comp ? { info_comp: { ...(e.apoioInfo?.info_comp || {}), ...comp } } : {}) } }));
  };

  const fmtBRL = (v: any) => v == null ? '—' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const fmtData = (p?: string) => p ? p.split('-').reverse().join('/') : 'sem prazo';

  const temApoio = guides.some(g => g.exams.some((e: any) => e.bancadaTipo === 'apoio'));
  const nomePaciente = String(state.patient?.fullName || '');
  const precisaAbreviar = temApoio && nomePaciente.trim().length > APOIO_NOME_MAX;
  const nomeEnvio = state.apoioNomeEnvio ?? abreviarNome(nomePaciente);
  const errosApoio = temApoio ? validarApoio(state) : [];

  const handleAddOrUpdateExam = async () => {
    if (!selectedExam) {
      toast.error("Selecione um exame");
      return;
    }

    const convenio = activeConvenios.find(c => c.name === activeGuide?.plan);
    const examPrice = convenio?.examPrices?.find(p => p.examId === selectedExam.id)?.price;

    // Destino pela Bancada Técnica: apoio usa prazo do apoio + transporte; congela bancada/laudo no item
    let destino: any = null;
    try {
      const { data } = await supabase.rpc('exame_destino' as any, { _exam_id: selectedExam.id });
      destino = data;
    } catch { destino = null; }
    const destinoPrazo = destino?.tipo === 'apoio' && destino?.prazo ? `${destino.prazo}T15:00:00.000Z` : null;

    // Exame de apoio: opções de troca, informação complementar e condições do catálogo do apoio
    let apoioExtra: any = {};
    if (destino?.tipo === 'apoio') {
      const opcoes = await carregarOpcoes(selectedExam.id);
      const atual = opcoes.find((o: any) => o.bancada_id === destino.bancada_id);
      const anterior = editingExamIndex !== null ? activeGuide?.exams[editingExamIndex] : null;
      apoioExtra = {
        apoioCodigo: atual?.codigo_apoio ?? destino.codigo_apoio ?? null,
        apoioPreco: atual?.preco ?? null,
        apoioModo: atual?.modo ?? null,
        apoioInfoComp: atual?.info_comp || [],
        apoioCondicoes: atual?.condicoes || [],
        apoioInfo: anterior?.apoioInfo || {},
      };
    }

    const examData = {
      ...selectedExam,
      ...(destino?.bancada_id ? {
        bancadaId: destino.bancada_id, bancadaNome: destino.bancada_nome, bancadaTipo: destino.tipo,
        apoioId: destino.apoio_id ?? null, apoioNome: destino.apoio_nome ?? null, laudoId: destino.laudo_id ?? null,
        bancadaOrigem: 'cadastro',
      } : {}),
      ...apoioExtra,
      material: examMaterial,
      recipienteId: (selectedExam as any)?.materialTubos?.[materialPorNome(examMaterial)?.id ?? '']?.recipiente_id ?? null,
      collected: examCollected,
      isColeta: examCollected, // Consistent with other parts of the app
      quantity: 1,
      price: activeGuide?.plan === 'PARTICULAR' || convenio?.type === 'private' ? examPrice : undefined,
      expectedDeliveryDate: examDeadline || destinoPrazo || (selectedExam.resultDeadlineDays ? await calculateDeadline(selectedExam.resultDeadlineDays, selectedExam.prazoContagem === 'uteis' ? 'uteis' : 'corridos') : null)
    };

    const newGuides = guides.map(g => {
      if (g.id === activeGuideId) {
        const newExams = [...g.exams];
        if (editingExamIndex !== null) {
          newExams[editingExamIndex] = examData;
        } else {
          newExams.push(examData);
        }
        return { ...g, exams: newExams };
      }
      return g;
    });

    setGuides(newGuides);
    update({ guides: newGuides });
    setShowExamModal(false);
    toast.success(editingExamIndex !== null ? "Exame editado" : "Exame adicionado");
  };

  const removeExam = (index: number) => {
    const newGuides = guides.map(g => {
      if (g.id === activeGuideId) {
        const newExams = g.exams.filter((_, i) => i !== index);
        return { ...g, exams: newExams };
      }
      return g;
    });
    setGuides(newGuides);
    update({ guides: newGuides });
    toast.success("Exame removido");
  };

  const removeGuide = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (guides.length <= 1) {
      toast.error("Não é possível remover a última guia");
      return;
    }

    const newGuides = guides.filter(g => g.id !== id);
    setGuides(newGuides);
    update({ guides: newGuides });
    
    if (activeGuideId === id) {
      setActiveGuideId(newGuides[0].id);
    }
    toast.success("Guia removida");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        {guides.map((g) => (
          <div key={g.id} className="relative group">
            <button
              onClick={() => setActiveGuideId(g.id)}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-t-lg transition-all border border-b-0 flex items-center gap-2 pr-8",
                activeGuideId === g.id ? "bg-white border-border text-primary" : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {g.name}
            </button>
            {guides.length > 1 && (
              <button
                onClick={(e) => removeGuide(g.id, e)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addGuide} className="h-8 w-8 p-0"><PlusCircle className="h-4 w-4" /></Button>
      </div>

      {/* Dados do Plano/Guia */}
      <Card className="p-6 space-y-6 bg-muted/20 border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Plano">
             <select 
               className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
               value={activeGuide?.plan || ''} 
                onChange={(e) => {
                  const selectedPlan = e.target.value;
                  const convenio = activeConvenios.find(c => c.name === selectedPlan);
                  const newGuides = guides.map(g => g.id === activeGuideId ? { 
                    ...g, 
                    plan: selectedPlan,
                    name: selectedPlan,
                    convenioName: selectedPlan,
                    convenioId: convenio?.id || null,
                    operator: convenio?.operator || selectedPlan
                  } : g);
                  setGuides(newGuides);
                  update({ guides: newGuides });
                }}
             >
               <option value="">Selecione um plano</option>
               {activeConvenios.map(c => (
                 <option key={c.id} value={c.name}>{c.name}</option>
               ))}
             </select>
          </Field>
          <Field label="Operadora">
             <Input value={activeGuide?.operator || ''} onChange={(e) => {
               const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, operator: e.target.value } : g);
               setGuides(newGuides);
               update({ guides: newGuides });
             }} />
          </Field>
          <Field label="Nº Carteirinha">
             <Input value={activeGuide?.number} onChange={(e) => {
               const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, number: e.target.value } : g);
               setGuides(newGuides);
               update({ guides: newGuides });
             }} />
          </Field>
          <Field label="Validade">
             <Input type="date" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
          <Field label="Nº Guia">
            <Input />
          </Field>
          <Field label="Senha Autorização">
            <Input 
              value={state.authorizationPassword || ''} 
              onChange={(e) => update({ authorizationPassword: e.target.value })} 
            />
          </Field>
          <Field label="Data Autorização">
             <Input type="date" />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
            <Field label={
              <div className="flex items-center gap-2">
                <span>Dados Do Médico</span>
                <Popover open={showDoctorPopover} onOpenChange={setShowDoctorPopover}>
                  <PopoverTrigger asChild>
                    <button className="text-primary hover:opacity-80 transition-opacity">
                      <Stethoscope className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4" align="start">
                    <div className="space-y-4">
                      <div className="flex items-start gap-2 text-primary">
                        <HelpCircle className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold">Desabilitar médico</h4>
                        </div>
                      </div>
                      <div className="h-px bg-border w-full" />
                      <p className="text-xs text-muted-foreground font-medium">
                        Desabilitar campos referentes ao médico?
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-xs font-bold"
                          onClick={() => {
                            const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, isDoctorDisabled: false } : g);
                            setGuides(newGuides);
                            update({ guides: newGuides });
                            setShowDoctorPopover(false);
                          }}
                        >
                          NÃO
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 px-4 text-xs font-bold"
                          onClick={() => {
                            const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, isDoctorDisabled: true } : g);
                            setGuides(newGuides);
                            update({ guides: newGuides });
                            setShowDoctorPopover(false);
                            toast.info("Campos de médico desabilitados para esta guia");
                          }}
                        >
                          SIM
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            }>
                <div className="flex gap-2">
                    <div className="w-1/4">
                      <select 
                        disabled={activeGuide?.isDoctorDisabled}
                        className="flex h-10 w-full rounded-md border bg-background px-3 text-sm disabled:bg-muted disabled:cursor-not-allowed"
                        value={activeGuide?.doctorCouncil || 'CRM'}
                        onChange={(e) => {
                          const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, doctorCouncil: e.target.value } : g);
                          setGuides(newGuides);
                          update({ guides: newGuides });
                        }}
                      >
                        <option>CRM</option>
                        <option>CRO</option>
                        <option>COREM</option>
                        <option>CRBM</option>
                        <option>RMS</option>
                      </select>
                    </div>
                    <div className="w-1/4">
                      <select 
                        disabled={activeGuide?.isDoctorDisabled}
                        className="flex h-10 w-full rounded-md border bg-background px-3 text-sm disabled:bg-muted disabled:cursor-not-allowed"
                        value={activeGuide?.doctorCrmState || 'RN'}
                        onChange={(e) => {
                          const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, doctorCrmState: e.target.value } : g);
                          setGuides(newGuides);
                          update({ guides: newGuides });
                        }}
                      >
                        <option>RN</option>
                        <option>SP</option>
                        <option>RJ</option>
                        <option>MG</option>
                        <option>CE</option>
                      </select>
                    </div>
                    <div className="relative w-1/2">
                      <Input 
                        placeholder="Nº Inscrição" 
                        disabled={activeGuide?.isDoctorDisabled}
                        className="pr-8 disabled:bg-muted disabled:cursor-not-allowed" 
                        value={activeGuide?.doctorCrm || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, doctorCrm: val } : g);
                          setGuides(newGuides);
                          update({ guides: newGuides });
                          
                          // Auto-lookup by CRM/Number
                          const found = activeDoctors.find(d => d.crm === val);
                          if (found) {
                            selectDoctor(found);
                            toast.success(`Médico encontrado: ${found.fullName}`);
                          }
                        }}
                      />
                      <Search className="h-4 w-4 absolute right-2.5 top-3 text-muted-foreground" />
                    </div>
                </div>
            </Field>
             <Field label="Médico / CBOS">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="Nome do Médico" 
                      disabled={activeGuide?.isDoctorDisabled}
                      className="pr-8 disabled:bg-muted disabled:cursor-not-allowed" 
                      value={doctorSearch || activeGuide?.doctorName || ''}
                      onChange={(e) => {
                        setDoctorSearch(e.target.value);
                        setShowDoctorDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 200)}
                    />
                    <div className="absolute right-2.5 top-2 flex items-center gap-1">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <button
                        type="button"
                        title="Cadastrar novo médico"
                        disabled={activeGuide?.isDoctorDisabled}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowNewDoctorModal(true)}
                        className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {showDoctorDropdown && filteredDoctors.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                        {filteredDoctors.map(doc => (
                          <div 
                            key={doc.id}
                            className="p-2 hover:bg-primary/5 cursor-pointer text-xs flex flex-col gap-0.5"
                            onMouseDown={() => selectDoctor(doc)}
                          >
                            <span className="font-bold">{doc.fullName}</span>
                            <span className="text-muted-foreground">CRM: {doc.crm} - {doc.crmState}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-1/3">
                    <select 
                      disabled={activeGuide?.isDoctorDisabled}
                      className="flex h-10 w-full rounded-md border bg-background px-3 text-sm disabled:bg-muted disabled:cursor-not-allowed"
                      value={activeGuide?.doctorCbos || 'CBOS'}
                      onChange={(e) => {
                        const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, doctorCbos: e.target.value } : g);
                        setGuides(newGuides);
                        update({ guides: newGuides });
                      }}
                    >
                      <option value="CBOS">CBOS</option>
                      <option value="225125">Clínico Geral</option>
                      <option value="225133">Bioquímico</option>
                    </select>
                  </div>
                </div>
            </Field>
             <Field label="Tipo Atendimento">
                <select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option>5 - Exames</option>
                </select>
            </Field>
            <Field label="Caráter Atendimento">
                <select className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option>E - Eletiva</option>
                </select>
            </Field>
        </div>
      </Card>

      {/* Procedimentos */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="bg-muted/50 p-4 border-b flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Exames da Guia
            </h3>
            <Button size="sm" className="gap-2" onClick={() => handleOpenExamModal()}><Plus className="h-4 w-4" /> Adicionar Exame</Button>
        </div>
        
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Procedimento</th>
              <th className="px-4 py-3 text-left">Material</th>
              <th className="px-4 py-3 text-center">Coleta</th>
              <th className="px-4 py-3 text-left">Previsão Entrega</th>
              {(activeGuide?.plan === 'PARTICULAR' || activeConvenios.find(c => c.name === activeGuide?.plan)?.type === 'private') && (
                <th className="px-4 py-3 text-left">Valor (R$)</th>
              )}
              <th className="px-4 py-3 text-center">Qtd.</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {activeGuide?.exams.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                  Nenhum exame adicionado a esta guia.
                </td>
              </tr>
            ) : (
              activeGuide?.exams.map((exam, index) => (
                <React.Fragment key={index}>
                <tr className="border-b hover:bg-muted/10">
                    <td className="px-4 py-4 text-xs font-medium">
                      {exam.name} {exam.tussCode && `- ${exam.tussCode}`}
                      {exam.bancadaTipo === 'apoio' && (
                        <Popover onOpenChange={(o) => { if (o) void carregarOpcoes(exam.id); }}>
                          <PopoverTrigger asChild>
                            <button type="button" className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted/70">
                              <Truck className="h-3 w-3" /> Apoio: {exam.apoioNome || exam.bancadaNome} <ChevronDown className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-2" align="start">
                            {(() => {
                              const opc = opcoesPorExame[exam.id] || [];
                              const apoios = opc.filter(o => o.tipo === 'apoio');
                              const internas = opc.filter(o => o.tipo !== 'apoio');
                              return (
                                <div className="space-y-2 text-xs">
                                  <div className="font-bold uppercase text-[10px] text-muted-foreground px-1">Trocar apoio</div>
                                  {apoios.length === 0 && <div className="px-1 text-muted-foreground">Carregando...</div>}
                                  {apoios.map(o => (
                                    <button key={o.bancada_id} type="button" disabled={o.bancada_id === exam.bancadaId}
                                      onClick={() => trocarDestino(index, o)}
                                      className={cn('w-full text-left rounded-md px-2 py-1.5 hover:bg-muted', o.bancada_id === exam.bancadaId && 'bg-muted font-semibold')}>
                                      <div className="flex justify-between"><span>{o.apoio_nome}</span><span>{o.tem_preco ? fmtBRL(o.preco) : 'sem preço'}</span></div>
                                      <div className="text-[10px] text-muted-foreground">Prazo: {fmtData(o.prazo)}{o.modo === 'manual' ? ' · modo manual' : ''}</div>
                                    </button>
                                  ))}
                                  {internas.length > 0 && (
                                    <>
                                      <div className="font-bold uppercase text-[10px] text-muted-foreground px-1 pt-1 border-t">Fazer internamente</div>
                                      {internas.map(o => (
                                        <button key={o.bancada_id} type="button" onClick={() => trocarDestino(index, o)} className="w-full text-left rounded-md px-2 py-1.5 hover:bg-muted">
                                          <div>{o.bancada_nome}</div>
                                          <div className="text-[10px] text-muted-foreground">Prazo: {fmtData(o.prazo)}</div>
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </PopoverContent>
                        </Popover>
                      )}
                      {exam.bancadaTipo !== 'apoio' && exam.bancadaOrigem === 'troca_atendimento' && (opcoesPorExame[exam.id] || []).some(o => o.tipo === 'apoio') && (
                        <button type="button" className="ml-2 text-[10px] underline text-muted-foreground"
                          onClick={() => { const o = (opcoesPorExame[exam.id] || []).find(x => x.atual); if (o) trocarDestino(index, o); }}>
                          voltar para o apoio
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">{exam.material || '—'}</td>
                    <td className="px-4 py-4 text-center">
                      <div className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                        exam.collected ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      )}>
                        {exam.collected ? "SIM" : "NÃO"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {exam.collected && exam.expectedDeliveryDate ? (
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <span>{exam.expectedDeliveryDate}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {(activeGuide?.plan === 'PARTICULAR' || activeConvenios.find(c => c.name === activeGuide?.plan)?.type === 'private') && (
                      <td className="px-4 py-4 text-xs font-medium">
                        {exam.price ? `R$ ${exam.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-4 text-center">{exam.quantity}</td>
                    <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenExamModal(index)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {exam.collected && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setSelectedExam(exam);
                                  handleOpenDeadlineModal(exam);
                                }}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            )}

                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-rose-500"
                              onClick={() => removeExam(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </td>
                </tr>
                {exam.bancadaTipo === 'apoio' && ((exam.apoioInfoComp || []).length > 0 || (exam.apoioCondicoes || []).length > 0) && (
                  <tr className="border-b bg-muted/20">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Dados exigidos por {exam.apoioNome}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(exam.apoioInfoComp || []).map((c: string) => {
                          const v = exam.apoioInfo?.info_comp?.[c] ?? '';
                          const num = infoCompNumerico(c);
                          const invalido = !String(v).trim() || (num && !/^\d+(\.\d+)?$/.test(String(v).trim()));
                          return (
                            <div key={c}>
                              <Label className="text-[11px]">{c} *</Label>
                              <Input className={cn('h-8 text-xs', invalido && 'border-destructive')} value={v} inputMode={num ? 'decimal' : undefined}
                                placeholder={num ? 'ex.: 70.5' : ''}
                                onChange={(ev) => setApoioInfo(index, {}, { [c]: num ? ev.target.value.replace(',', '.') : ev.target.value })} />
                              {!String(v).trim() && <p className="text-[10px] text-destructive mt-0.5">Obrigatório para o apoio</p>}
                              {String(v).trim() && invalido && <p className="text-[10px] text-destructive mt-0.5">Use número com ponto decimal</p>}
                            </div>
                          );
                        })}
                        {(exam.apoioCondicoes || []).length > 0 && (
                          <div>
                            <Label className="text-[11px]">Condição *</Label>
                            <select className={cn('h-8 w-full rounded-md border bg-background px-2 text-xs', !exam.apoioInfo?.condicao && 'border-destructive')}
                              value={exam.apoioInfo?.condicao || ''} onChange={(ev) => setApoioInfo(index, { condicao: ev.target.value })}>
                              <option value="">Selecione...</option>
                              {(exam.apoioCondicoes as string[]).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {temApoio && (precisaAbreviar || errosApoio.length > 0) && (
        <div className="border rounded-xl bg-card p-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Truck className="h-4 w-4" /> Envio ao laboratório de apoio</h3>
          {precisaAbreviar && (
            <div>
              <Label className="text-xs">Nome que será enviado ao apoio (máx. {APOIO_NOME_MAX} caracteres)</Label>
              <p className="text-[11px] text-muted-foreground mb-1">O nome do paciente tem {nomePaciente.trim().length} caracteres. Sugestão abreviada — pode editar.</p>
              <Input className={cn('h-8 text-xs uppercase', nomeEnvio.trim().length > APOIO_NOME_MAX && 'border-destructive')} value={nomeEnvio}
                onChange={(ev) => update({ apoioNomeEnvio: ev.target.value.toUpperCase() })} />
              <p className={cn('text-[10px] mt-0.5', nomeEnvio.trim().length > APOIO_NOME_MAX ? 'text-destructive' : 'text-muted-foreground')}>{nomeEnvio.trim().length}/{APOIO_NOME_MAX}</p>
            </div>
          )}
          {errosApoio.filter(e => !e.includes('nome')).length > 0 && (
            <ul className="space-y-1">
              {errosApoio.map(e => (
                <li key={e} className="flex items-start gap-2 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modal Adicionar Exame */}
      <Dialog open={showExamModal} onOpenChange={setShowExamModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExamIndex !== null ? "Editar Exame" : "Adicionar Exame"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exam-search">Procedimento *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="exam-search"
                  placeholder="Nome ou código do exame..."
                  className="pl-9"
                  value={examSearch}
                  onChange={(e) => {
                    setExamSearch(e.target.value);
                    setSelectedExam(null);
                  }}
                />
                {filteredExams.length > 0 && !selectedExam && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-auto">
                    {filteredExams.map((exam) => (
                      <button
                        key={exam.id}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center justify-between"
                        onClick={() => {
                          setSelectedExam(exam);
                          setExamSearch(exam.name);
                          // Fix: Use configured materials from the exam
                          const materials = exam.selectedMaterials || [];
                          const defaultMat = exam.defaultMaterial || materials[0] || 'Sangue';
                          setExamMaterial(defaultMat);
                        }}
                      >
                        <span className="font-medium">{exam.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{exam.tussCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedExam && (
                <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded-md">
                  <span className="text-xs font-bold text-primary">{selectedExam.name}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedExam(null)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Material</Label>
              <div className="flex flex-wrap gap-2">
                {(selectedExam?.selectedMaterials && selectedExam.selectedMaterials.length > 0
                  ? selectedExam.selectedMaterials
                  : ['Sangue Total', 'Soro', 'Plasma', 'Urina', 'Fezes', 'Secreção', 'Líquor', 'Swab']
                ).map((mat: string) => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => setExamMaterial(mat)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5",
                      examMaterial === mat 
                        ? "bg-primary/5 border-primary text-primary shadow-sm font-bold" 
                        : "bg-background border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {selectedExam?.defaultMaterial === mat && <Star className="h-3 w-3 fill-primary text-primary" />}
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Coletado</Label>
                <p className="text-[10px] text-muted-foreground">O material já foi coletado?</p>
              </div>
              <Switch
                checked={examCollected}
                onCheckedChange={setExamCollected}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamModal(false)}>Cancelar</Button>
            <Button onClick={handleAddOrUpdateExam} className="gradient-bg text-white">
              {editingExamIndex !== null ? "Salvar Alterações" : "Adicionar Exame"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Previsao de Entrega */}
      <Dialog open={showDeadlineModal} onOpenChange={setShowDeadlineModal}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Alterar Previsao de Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data Coleta *</Label>
              <div className="relative">
                <Input 
                  type="datetime-local"
                  value={tempCollectionDate ? tempCollectionDate.slice(0, 16) : ''} 
                  onChange={(e) => setTempCollectionDate(new Date(e.target.value).toISOString())}
                  className="text-sm pr-10"
                  disabled={!canEditDeadline}
                />
                {!canEditDeadline && (
                  <Lock className="h-4 w-4 absolute right-2.5 top-3 text-muted-foreground/50" />
                )}
              </div>
              {!canEditDeadline && (
                <p className="text-[9px] text-rose-500 font-medium">Sem permissão para alterar data de coleta</p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Previsão de Entrega *</Label>
              <div className="relative">
                <Input 
                  type="datetime-local"
                  value={tempDeadline ? tempDeadline.slice(0, 16) : ''} 
                  onChange={(e) => setTempDeadline(new Date(e.target.value).toISOString())}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-center">
            <Button variant="ghost" className="flex-1 text-xs font-bold" onClick={() => setShowDeadlineModal(false)}>CANCELAR</Button>
            <Button 
              className="flex-1 text-xs font-bold gradient-bg text-white"
              onClick={() => {
                const newGuides = guides.map(g => {
                  if (g.id === activeGuideId) {
                    const newExams = g.exams.map(ex => {
                      // Note: We need a better way to target the specific exam if there are duplicates
                      // For now, if we match the name, we update it.
                      if (ex.name === selectedExam?.name) {
                        return { ...ex, expectedDeliveryDate: tempDeadline };
                      }
                      return ex;
                    });
                    return { ...g, exams: newExams };
                  }
                  return g;
                });
                setGuides(newGuides);
                update({ guides: newGuides });
                setShowDeadlineModal(false);
                toast.success("Previsão de entrega atualizada");
              }}
            >
              CONFIRMAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickDoctorModal
        open={showNewDoctorModal}
        onClose={() => setShowNewDoctorModal(false)}
        defaultName={doctorSearch}
        onCreated={(doc) => selectDoctor(doc)}
      />
    </div>
  );
}


function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase font-bold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
