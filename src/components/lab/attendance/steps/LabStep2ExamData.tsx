import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useHospitals, FASTING_HOURS, FASTING_TYPES } from '@/hooks/useHospitals';

export function LabStep2ExamData({ state, update }: any) {
  const { hospitals, sectors, loadSectors, createHospital, createSector } = useHospitals();
  const [newHospital, setNewHospital] = useState<string | null>(null);
  const [newSector, setNewSector] = useState<string | null>(null);

  const isFasting = String(state.fastingSince || 'Não').toLowerCase().startsWith('s');

  useEffect(() => {
    loadSectors(state.hospitalId);
  }, [state.hospitalId, loadSectors]);

  const selectClass = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

  const handleCreateHospital = async () => {
    const created = await createHospital(newHospital || '');
    if (!created) return toast.error('Não foi possível adicionar o hospital');
    update({ hospitalId: created.id, hospitalName: created.name, hospitalSectorId: '', hospitalSectorName: '' });
    setNewHospital(null);
    toast.success('Hospital adicionado');
  };

  const handleCreateSector = async () => {
    const created = await createSector(state.hospitalId, newSector || '');
    if (!created) return toast.error('Não foi possível adicionar o setor');
    update({ hospitalSectorId: created.id, hospitalSectorName: created.name });
    setNewSector(null);
    toast.success('Setor adicionado');
  };

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
          <Label className="text-xs">Jejum do paciente</Label>
          <select 
            className={selectClass}
            value={state.fastingSince || "Não"}
            onChange={(e) => {
              const v = e.target.value;
              update(v.toLowerCase().startsWith('s')
                ? { fastingSince: v }
                : { fastingSince: v, fastingStartHour: '', fastingType: '' });
            }}
          >
            <option>Não</option>
            <option>Sim</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Local de Entrega</Label>
          <select 
            className={selectClass}
            value={state.deliveryLocation || "INTERNET/LOCAL DE CADASTRO"}
            onChange={(e) => update({ deliveryLocation: e.target.value })}
          >
            <option>INTERNET/LOCAL DE CADASTRO</option>
          </select>
        </div>
      </div>

      {isFasting && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Início Jejum</Label>
            <select
              className={selectClass}
              value={state.fastingStartHour || ""}
              onChange={(e) => update({ fastingStartHour: e.target.value })}
            >
              <option value="">Selecione...</option>
              {FASTING_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jejum</Label>
            <select
              className={selectClass}
              value={state.fastingType || ""}
              onChange={(e) => update({ fastingType: e.target.value })}
            >
              <option value="">Selecione...</option>
              {FASTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <Label className="text-xs">Hospital</Label>
          {newHospital === null ? (
            <div className="flex items-center gap-2">
              <select
                className={selectClass}
                value={state.hospitalId || ""}
                onChange={(e) => {
                  const h = hospitals.find(x => x.id === e.target.value);
                  update({ hospitalId: h?.id || '', hospitalName: h?.name || '', hospitalSectorId: '', hospitalSectorName: '', bed: '', medicalRecordNumber: '' });
                }}
              >
                <option value="">Selecione um hospital...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <Button type="button" variant="outline" size="sm" onClick={() => setNewHospital('')}>
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input autoFocus placeholder="Nome do hospital" value={newHospital} onChange={(e) => setNewHospital(e.target.value)} />
              <Button type="button" size="sm" onClick={handleCreateHospital}><Check className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewHospital(null)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        {state.hospitalId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Setor</Label>
              {newSector === null ? (
                <div className="flex items-center gap-2">
                  <select
                    className={selectClass}
                    value={state.hospitalSectorId || ""}
                    onChange={(e) => {
                      const s = sectors.find(x => x.id === e.target.value);
                      update({ hospitalSectorId: s?.id || '', hospitalSectorName: s?.name || '' });
                    }}
                  >
                    <option value="">Selecione...</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewSector('')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input autoFocus placeholder="Nome do setor" value={newSector} onChange={(e) => setNewSector(e.target.value)} />
                  <Button type="button" size="sm" onClick={handleCreateSector}><Check className="h-4 w-4" /></Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setNewSector(null)}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Leito</Label>
              <Input value={state.bed || ""} onChange={(e) => update({ bed: e.target.value })} placeholder="Ex: 203-B" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nº Prontuário</Label>
              <Input value={state.medicalRecordNumber || ""} onChange={(e) => update({ medicalRecordNumber: e.target.value })} placeholder="___" />
            </div>
          </div>
        )}
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
