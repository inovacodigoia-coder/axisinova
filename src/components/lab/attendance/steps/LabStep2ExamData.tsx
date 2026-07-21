import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

export function LabStep2ExamData({ state, update }: any) {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Peso (kg)</Label>
          <Input 
            placeholder="___" 
            value={state.weight || ""} 
            onChange={(e) => update({ weight: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Altura (m)</Label>
          <Input 
            placeholder="___" 
            value={state.height || ""} 
            onChange={(e) => update({ height: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox 
            id="urgencia" 
            checked={state.isUrgent}
            onCheckedChange={(checked) => update({ isUrgent: !!checked })}
          />
          <Label htmlFor="urgencia">Urgência</Label>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox 
            id="febre" 
            checked={state.hasFever}
            onCheckedChange={(checked) => update({ hasFever: !!checked })}
          />
          <Label htmlFor="febre">Febre</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Jejum Desde</Label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={state.fastingSince || "Ontem"}
            onChange={(e) => update({ fastingSince: e.target.value })}
          >
            <option>Ontem</option>
            <option>Hoje</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Local de Entrega</Label>
          <select 
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={state.deliveryLocation || "INTERNET/LOCAL DE CADASTRO"}
            onChange={(e) => update({ deliveryLocation: e.target.value })}
          >
            <option>INTERNET/LOCAL DE CADASTRO</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Observação do Atendimento</Label>
        <Textarea 
          placeholder="Observações..." 
          className="resize-none" 
          maxLength={255} 
          value={state.observation || ""}
          onChange={(e) => update({ observation: e.target.value })}
        />
      </div>
    </div>
  );
}
