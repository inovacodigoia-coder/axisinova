import React from 'react';
import { CadastroState } from '../../reception/attendance/AttendanceCadastroModal';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Printer, Download, User } from 'lucide-react';

interface Props { state: any; update: (patch: any) => void; }

export function LabStep1PatientReview({ state, update }: Props) {
  const patient = state.patient;
  if (!patient) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Quantidade de Pedidos</span>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1"><User className="h-3 w-3" /> 16</Badge>
              <Badge variant="outline" className="gap-1">📞 0</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon"><Printer className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider border-b border-border pb-2">Identificação</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 bg-muted/10">
            <User className="h-12 w-12 text-muted-foreground" />
            <span className="text-[10px] mt-2 text-muted-foreground uppercase font-bold">Foto</span>
          </div>
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Nome</Label>
              <Input defaultValue={patient.fullName} bs-size="sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Nome Social</Label>
              <Input placeholder="___" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Nascimento</Label>
              <Input type="date" defaultValue={patient.birthDate} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">CPF</Label>
              <Input defaultValue={patient.cpf} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Sexo</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${className}`}>{children}</span>;
}
