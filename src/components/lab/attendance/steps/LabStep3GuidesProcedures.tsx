import React, { useState, useMemo, useEffect } from 'react';
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

  const [guides, setGuides] = useState<AttendanceGuide[]>(state.guides || [{ id: '1', name: 'Guia 1', plan: 'PARTICULAR', operator: 'PARTICULAR', number: '', exams: [], isDoctorDisabled: false }]);
  const [activeGuideId, setActiveGuideId] = useState(guides[0]?.id || '1');
  const [showDoctorPopover, setShowDoctorPopover] = useState(false);
  
  // Doctor search state
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // Modal states for adding/editing exam
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExamIndex, setEditingExamIndex] = useState<number | null>(null);
  const [examSearch, setExamSearch] = useState('');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examMaterial, setExamMaterial] = useState('');
  const [examCollected, setExamCollected] = useState(false);
  const [examDeadline, setExamDeadline] = useState<string | null>(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [tempDeadline, setTempDeadline] = useState('');
  const [tempCollectionDate, setTempCollectionDate] = useState('');


  const addGuide = () => {
    const newId = (guides.length + 1).toString();
    const newGuide = { id: newId, name: `Guia ${newId}`, plan: 'PARTICULAR', operator: 'PARTICULAR', number: '', exams: [], isDoctorDisabled: false };
    setGuides([...guides, newGuide]);
    setActiveGuideId(newId);
    update({ guides: [...guides, newGuide] });
  };

  const activeGuide = guides.find(g => g.id === activeGuideId);

  const filteredExams = useMemo(() => {
    if (!examSearch || selectedExam) return [];
    return clinicExams.filter(e => 
      e.name.toLowerCase().includes(examSearch.toLowerCase()) || 
      e.tussCode?.toLowerCase().includes(examSearch.toLowerCase())
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
      doctorCrm: doc.crm,
      doctorCrmState: doc.crmState,
      doctorName: doc.fullName,
      doctorCbos: '225125' // Default or based on specialty if available
    } : g);
    setGuides(newGuides);
    update({ guides: newGuides });
    setDoctorSearch(doc.fullName);
    setShowDoctorDropdown(false);
  };

  const handleOpenExamModal = (index: number | null = null) => {
    if (index !== null && activeGuide) {
      const exam = activeGuide.exams[index];
      setSelectedExam(exam);
      setExamMaterial(exam.material || '');
      setExamCollected(exam.collected || false);
      setExamSearch(exam.name);
      setEditingExamIndex(index);
      setExamDeadline(exam.expectedDeliveryDate || null);
    } else {
      setSelectedExam(null);
      setExamMaterial('');
      setExamCollected(false);
      setExamSearch('');
      setEditingExamIndex(null);
      setExamDeadline(null);
    }
    setShowExamModal(true);
  };

  const calculateDeadline = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleString('pt-BR').split(',')[0] + ' ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
  };

  const handleOpenDeadlineModal = (exam: any) => {
    setTempDeadline(exam.expectedDeliveryDate || calculateDeadline(exam.resultDeadlineDays || 1));
    setTempCollectionDate(new Date().toLocaleString('pt-BR').split(',')[0] + ' ' + new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0'));
    setShowDeadlineModal(true);
  };


  const handleAddOrUpdateExam = () => {
    if (!selectedExam) {
      toast.error("Selecione um exame");
      return;
    }

    const convenio = activeConvenios.find(c => c.name === activeGuide?.plan);
    const examPrice = convenio?.examPrices?.find(p => p.examId === selectedExam.id)?.price;

    const examData = {
      ...selectedExam,
      material: examMaterial,
      collected: examCollected,
      quantity: 1,
      price: activeGuide?.plan === 'PARTICULAR' || convenio?.type === 'private' ? examPrice : undefined,
      expectedDeliveryDate: examDeadline || (selectedExam.resultDeadlineDays ? calculateDeadline(selectedExam.resultDeadlineDays) : null)
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
               value={activeGuide?.plan} 
                onChange={(e) => {
                  const selectedPlan = e.target.value;
                  const convenio = activeConvenios.find(c => c.name === selectedPlan);
                  const newGuides = guides.map(g => g.id === activeGuideId ? { 
                    ...g, 
                    plan: selectedPlan,
                    name: selectedPlan,
                    operator: convenio?.operator || selectedPlan // If not found, fallback to plan name
                  } : g);
                  setGuides(newGuides);
                  update({ guides: newGuides });
                }}
             >
               <option value="PARTICULAR">Particular</option>
               {activeConvenios.map(c => (
                 <option key={c.id} value={c.name}>{c.name}</option>
               ))}
             </select>
          </Field>
          <Field label="Operadora">
             <Input value={activeGuide?.operator} onChange={(e) => {
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
            <Input />
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
                      <button className="text-muted-foreground hover:text-primary transition-colors">
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
                <tr key={index} className="border-b hover:bg-muted/10">
                    <td className="px-4 py-4 text-xs font-medium">
                      {exam.name} {exam.tussCode && `- ${exam.tussCode}`}
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
                  value={tempCollectionDate} 
                  onChange={(e) => setTempCollectionDate(e.target.value)}
                  className="text-sm pr-10"
                  disabled={!canEditDeadline}
                />
                {!canEditDeadline ? (
                  <Lock className="h-4 w-4 absolute right-2.5 top-3 text-muted-foreground/50" />
                ) : (
                  <Calendar className="h-4 w-4 absolute right-2.5 top-3 text-muted-foreground" />
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
                  value={tempDeadline} 
                  onChange={(e) => setTempDeadline(e.target.value)}
                  className="text-sm"
                />
                <Calendar className="h-4 w-4 absolute right-2.5 top-3 text-muted-foreground" />
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
