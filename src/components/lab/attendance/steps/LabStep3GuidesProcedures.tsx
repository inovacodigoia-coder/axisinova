import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Trash2, Stethoscope, ClipboardCheck, 
  Table, AlertCircle, FileSpreadsheet, PlusCircle, Calendar,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRegisters } from '@/context/RegistersContext';

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
}

export function LabStep3GuidesProcedures({ state, update }: Props) {
  const { convenios } = useRegisters();
  const activeConvenios = useMemo(() => convenios.filter(c => c.isActive), [convenios]);
  const [guides, setGuides] = useState<AttendanceGuide[]>(state.guides || [{ id: '1', name: 'Guia 1', plan: 'PARTICULAR', operator: 'PARTICULAR', number: '', exams: [], isDoctorDisabled: false }]);
  const [activeGuideId, setActiveGuideId] = useState(guides[0]?.id || '1');
  const [showDoctorPopover, setShowDoctorPopover] = useState(false);

  const addGuide = () => {
    const newId = (guides.length + 1).toString();
    const newGuide = { id: newId, name: `Guia ${newId}`, plan: 'PARTICULAR', operator: 'PARTICULAR', number: '', exams: [], isDoctorDisabled: false };
    setGuides([...guides, newGuide]);
    setActiveGuideId(newId);
    update({ guides: [...guides, newGuide] });
  };

  const activeGuide = guides.find(g => g.id === activeGuideId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        {guides.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGuideId(g.id)}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg transition-all border border-b-0",
              activeGuideId === g.id ? "bg-white border-border text-primary" : "bg-muted text-muted-foreground border-transparent"
            )}
          >
            {g.name}
          </button>
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
                 const newGuides = guides.map(g => g.id === activeGuideId ? { ...g, plan: e.target.value } : g);
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
             <Input value={activeGuide?.operator} onChange={(e) => {}} />
          </Field>
          <Field label="Nº Carteirinha">
             <Input />
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
                      >
                        <option>RN</option>
                        <option>SP</option>
                        <option>RJ</option>
                      </select>
                    </div>
                    <div className="relative w-1/2">
                      <Input 
                        placeholder="Nº Inscrição" 
                        disabled={activeGuide?.isDoctorDisabled}
                        className="pr-8 disabled:bg-muted disabled:cursor-not-allowed" 
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
                    />
                    <div className="absolute right-2.5 top-2 flex items-center gap-1">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <button className="text-muted-foreground hover:text-primary transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-1/3">
                    <select 
                      disabled={activeGuide?.isDoctorDisabled}
                      className="flex h-10 w-full rounded-md border bg-background px-3 text-sm disabled:bg-muted disabled:cursor-not-allowed"
                    >
                      <option>CBOS</option>
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
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Adicionar Exame</Button>
        </div>
        
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-[10px] uppercase font-bold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Procedimento</th>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3 text-center">Coleta</th>
              <th className="px-4 py-3 text-center">Qtd.</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
                <td className="px-4 py-4 text-xs font-medium">HEMOGRAMA COMPLETO - 40304361</td>
                <td className="px-4 py-4 text-xs">Sangue total com EDTA</td>
                <td className="px-4 py-4 text-center"><input type="checkbox" checked /></td>
                <td className="px-4 py-4 text-center">1</td>
                <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Calendar className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </td>
            </tr>
          </tbody>
        </table>
      </div>
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
