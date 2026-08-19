import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, Droplets, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro';
import { TUBE_TYPES } from '@/types/lab.types';
import type { AttendanceOrder } from '@/types/attendance-cadastro.types';

interface PrintOption {
  id: string;
  label: string;
  enabled: boolean;
  formats: ('A4' | 'A5' | 'TÉRMICA' | 'ETIQUETA')[];
  selectedFormat: 'A4' | 'A5' | 'TÉRMICA' | 'ETIQUETA';
}

interface PrinterSettings {
  dpi: number;
  orientation: 'portrait' | 'landscape';
  scale: number;
  batchSize: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: any) => void;
  order: AttendanceOrder | null;
  selectedExams?: string[];
  selectedTubes?: string[];
}

// Normaliza o material do exame para o tipo de tubo correspondente
export const tubeTypeForMaterial = (material: any): string => {
  const m = String(material || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
  if (!m) return 'gel';
  if (m.includes('urina') || m.includes('frasco')) return 'urina';
  if (m.includes('edta') || m.includes('sangue total') || m.includes('hemograma')) return 'edta';
  if (m.includes('citrat') || m.includes('coagulacao')) return 'citrato';
  if (m.includes('plasma')) return 'citrato';
  if (m.includes('soro') || m.includes('gel') || m.includes('sangue')) return 'gel';
  return 'gel';
};

export function AttendancePrintSelectionModal({ open, onClose, onConfirm, order, selectedExams, selectedTubes }: Props) {
  const { toast } = useToast();
  const { updateOrder } = useAttendanceCadastro();
  const [options, setOptions] = useState<PrintOption[]>([
    { id: 'comprovante', label: 'Comprovante', enabled: true, formats: ['A4', 'A5', 'TÉRMICA'], selectedFormat: 'TÉRMICA' },
    { id: 'controle_interno', label: 'Controle Interno', enabled: false, formats: ['A4', 'A5', 'TÉRMICA'], selectedFormat: 'TÉRMICA' },
    { id: 'termo_consentimento', label: 'Termo de Consentimento', enabled: false, formats: ['A4', 'A5'], selectedFormat: 'A4' },
    { id: 'etiquetas', label: 'Etiquetas de Amostra', enabled: false, formats: ['ETIQUETA'], selectedFormat: 'ETIQUETA' },
  ]);

  const [confirmCollection, setConfirmCollection] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Sempre iniciar com apenas o Comprovante selecionado
  React.useEffect(() => {
    if (open) {
      setOptions(prev => prev.map(o => ({ ...o, enabled: o.id === 'comprovante' })));
      setConfirmCollection(false);
      setSelectedMaterials(new Set());
    }
  }, [open]);

  const [watermark, setWatermark] = useState(false);
  const [emptyFields, setEmptyFields] = useState(false);

  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
    dpi: 203,
    orientation: 'portrait',
    scale: 100,
    batchSize: order?.labGuides?.reduce((acc, g) => acc + (g.exams?.length || 0), 0) || 1
  });

  const [extras, setExtras] = useState({
    amostras: false,
    guias: false,
    capa_guia: false,
    etiqueta_cliente: false
  });

  const guides: any[] = (order as any)?.labGuides || [];
  const allExams: any[] = useMemo(() => guides.flatMap((g: any) => g.exams || []), [guides]);

  // Materiais (tipos de tubo) presentes no pedido
  const materials = useMemo(() => {
    const map = new Map<string, { type: string; label: string; color: string; collected: boolean; exams: string[] }>();
    allExams.forEach((e: any) => {
      const type = tubeTypeForMaterial(e.material);
      const tube = TUBE_TYPES.find(t => t.type === type) || TUBE_TYPES[0];
      const current = map.get(type) || { type, label: tube.label, color: tube.color, collected: true, exams: [] };
      current.collected = current.collected && !!e.collected;
      current.exams.push(e.name);
      map.set(type, current);
    });
    return Array.from(map.values());
  }, [allExams]);

  const pendingMaterials = materials.filter(m => !m.collected);
  const hasCollectedMaterial = materials.some(m => m.collected);

  const labelsSelected = options.find(o => o.id === 'etiquetas')?.enabled;
  // Etiquetas só podem ser impressas com amostra coletada (ou coleta confirmada agora)
  const willCollect = confirmCollection && selectedMaterials.size > 0;
  const labelsBlocked = !!labelsSelected && !hasCollectedMaterial && !willCollect;

  // Seleção única: apenas um tipo de impressão por vez
  const toggleOption = (id: string) => {
    setOptions(prev => prev.map(opt => ({ ...opt, enabled: opt.id === id })));
    if (id === 'etiquetas' && pendingMaterials.length > 0) setConfirmCollection(true);
  };

  const setFormat = (id: string, format: any) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, selectedFormat: format } : opt));
  };

  const toggleMaterial = (type: string) => {
    setSelectedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (labelsBlocked) {
      toast({
        title: 'Coleta pendente',
        description: 'Para imprimir etiquetas é necessário confirmar a coleta do material.',
        variant: 'destructive',
      });
      return;
    }

    let collectedTypes: string[] = [];

    if (willCollect && order) {
      setIsSaving(true);
      try {
        const now = new Date().toISOString();
        collectedTypes = Array.from(selectedMaterials);
        const nextGuides = guides.map((g: any) => ({
          ...g,
          exams: (g.exams || []).map((e: any) =>
            collectedTypes.includes(tubeTypeForMaterial(e.material))
              ? { ...e, collected: true, isColeta: true, collectedAt: e.collectedAt || now }
              : e
          ),
        }));

        await updateOrder(order.id, { labGuides: nextGuides, status: 'collection_done' } as any);
        toast({ title: 'Coleta confirmada', description: `${collectedTypes.length} material(is) marcado(s) como coletado(s).` });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível confirmar a coleta.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    onConfirm({
      options,
      extras,
      printerSettings,
      watermark,
      emptyFields,
      selectedExams,
      selectedTubes,
      confirmCollection: willCollect,
      collectedMaterials: collectedTypes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[1000px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <div className="bg-white">
          {/* Header */}
          <div className="bg-white p-6 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-xl font-bold text-[#007AFF]">Escolha o Tipo de Impressão</h2>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-8 max-h-[65vh] overflow-y-auto">
            {/* Options */}
            <div className="space-y-6">
              {options.map((opt) => (
                <div key={opt.id} className="flex flex-col gap-2 border-b border-slate-50 pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => toggleOption(opt.id)}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all",
                          opt.enabled ? "bg-[#007AFF] border-[#007AFF]" : "bg-white border-slate-300"
                        )}
                      >
                        {opt.enabled && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <span className={cn("text-sm font-medium transition-colors", opt.enabled ? "text-slate-900" : "text-slate-400")}>
                        {opt.label}
                      </span>
                    </div>

                    {opt.formats.length > 0 && (
                      <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
                        {opt.formats.map((fmt) => (
                          <button
                            key={fmt}
                            disabled={!opt.enabled}
                            onClick={() => setFormat(opt.id, fmt)}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded transition-all uppercase",
                              opt.selectedFormat === fmt && opt.enabled 
                                ? "bg-white text-[#007AFF] shadow-sm border border-blue-50" 
                                : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {opt.id === 'etiquetas' && opt.enabled && labelsBlocked && (
                    <div className="flex items-center gap-2 ml-8 text-[11px] font-medium text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      A impressão de etiquetas exige que a amostra esteja coletada.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Confirmar coleta */}
            {materials.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setConfirmCollection(v => !v)}
                    className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all",
                      confirmCollection ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300"
                    )}
                  >
                    {confirmCollection && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <span className={cn("text-sm font-medium", confirmCollection ? "text-slate-900" : "text-slate-400")}>
                    Confirmar coleta
                  </span>
                </div>

                {confirmCollection && (
                  <div className="mt-4 ml-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Materiais para Coleta
                    </p>
                    <div className="space-y-2">
                      {materials.map((m) => (
                        <label
                          key={m.type}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md bg-white border px-3 py-2 cursor-pointer transition-all",
                            selectedMaterials.has(m.type) ? "border-emerald-400" : "border-slate-200",
                            m.collected && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-emerald-500"
                              disabled={m.collected}
                              checked={m.collected || selectedMaterials.has(m.type)}
                              onChange={() => !m.collected && toggleMaterial(m.type)}
                            />
                            <span className={cn("h-2.5 w-2.5 rounded-full", m.color)} />
                            <div>
                              <p className="text-xs font-bold text-slate-700 uppercase">{m.label}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[420px]">{m.exams.join(', ')}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase",
                            m.collected ? "text-emerald-600" : "text-amber-500"
                          )}>
                            {m.collected ? 'Coletado' : 'Pendente'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Droplets className="h-3 w-3" />
                      Ao confirmar, o pedido passa para <strong>Coleta Realizada</strong> e as amostras para <strong>Coletado</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6 font-bold text-slate-600 border-slate-300 uppercase text-xs"
            >
              CANCELAR
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={labelsBlocked || isSaving}
              className="px-8 font-bold bg-[#007AFF] hover:bg-blue-700 text-white shadow-lg uppercase text-xs h-10 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'IMPRIMIR'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
