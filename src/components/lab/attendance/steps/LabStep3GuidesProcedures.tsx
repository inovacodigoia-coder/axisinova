import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, Trash2, Stethoscope, ClipboardCheck, 
  Table, AlertCircle, FileSpreadsheet, PlusCircle, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
}

export function LabStep3GuidesProcedures({ state, update }: Props) {
  const [guides, setGuides] = useState<AttendanceGuide[]>(state.guides || [{ id: '1', name: 'Guia 1', plan: 'PARTICULAR', operator: 'PARTICULAR', number: '', exams: [] }]);
  const [activeGuideId, setActiveGuideId] = useState(guides[0]?.id || '1');

  const addGuide = () => {
    const newId = (guides.length + 1).toString();
    const newGuide = { id: newId, name: `Guia ${newId}`, plan: 'PARTICULAR', operator: 'PARTICULAR', number: '', exams: [] };
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
             <Input value={activeGuide?.plan} onChange={(e) => {/* update guide logic */}} />
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
            <Field label="Médico Solicitante">
                <div className="flex gap-2">
                    <Input placeholder="Conselho..." className="w-1/3" />
                    <Input placeholder="CRM..." className="w-2/3" />
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase font-bold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
