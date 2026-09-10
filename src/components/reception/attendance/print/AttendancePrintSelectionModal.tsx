import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, Droplets, AlertTriangle, Loader2, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro';
import { TUBE_TYPES } from '@/types/lab.types';
import type { AttendanceOrder } from '@/types/attendance-cadastro.types';
import { canSetCollectionDone } from '@/utils/orderStatusFlow';

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
  /** Permite marcar vários documentos e imprimir todos no CONFIRMAR (fluxo de cadastro). */
  multiSelect?: boolean;
}

// Normaliza o material do exame para o tipo de tubo correspondente
export const tubeTypeForMaterial = (material: any): string => {
  const m = String(material || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
  if (!m) return 'gel';
  if (m.includes('fezes') || m.includes('fecal')) return 'fezes';
  if (m.includes('escarro') || m.includes('secrec') || m.includes('swab') || m.includes('saliva')) return 'escarro';
  if (m.includes('urina')) return 'urina';
  if (m.includes('edta') || m.includes('sangue total') || m.includes('hemograma')) return 'edta';
  if (m.includes('citrat') || m.includes('coagulacao')) return 'citrato';
  if (m.includes('plasma')) return 'citrato';
  if (m.includes('soro') || m.includes('gel') || m.includes('sangue')) return 'gel';
  if (m.includes('frasco')) return 'urina';
  return 'gel';
};

export function AttendancePrintSelectionModal({ open, onClose, onConfirm, order, selectedExams, selectedTubes, multiSelect }: Props) {
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
  const allCollected = materials.length > 0 && materials.every(m => m.collected);

  const labelsSelected = options.find(o => o.id === 'etiquetas')?.enabled;
  // Etiquetas só podem ser impressas com amostra coletada (ou coleta confirmada agora)
  const willCollect = confirmCollection && selectedMaterials.size > 0;
  // O status do pedido é a fonte de verdade: pedidos novos/em espera ainda não
  // tiveram a coleta confirmada, mesmo que algum exame venha marcado por padrão.
  const isAwaitingCollection = order?.status === 'waiting_collection' || order?.status === 'waiting';

  // Ao marcar "Confirmar coleta", pré-seleciona todos os materiais
  React.useEffect(() => {
    if (confirmCollection && materials.length > 0) {
      setSelectedMaterials(prev => (prev.size ? prev : new Set(materials.map(m => m.type))));
    }
  }, [confirmCollection, materials]);
  // Bloqueio independe da seleção e também considera o status AGUARDANDO.
  const labelsBlocked = (isAwaitingCollection || !allCollected) && !willCollect;

  // Seleção única: apenas um tipo de impressão por vez
  const toggleOption = (id: string) => {
    if (id === 'etiquetas' && labelsBlocked) {
      setConfirmCollection(true);
      toast({
        title: 'Coleta pendente',
        description: 'Confirme a coleta do material para liberar a impressão de etiquetas.',
        variant: 'destructive',
      });
      return;
    }
    setOptions(prev => prev.map(opt => ({ ...opt, enabled: opt.id === id })));
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

  const persistCollection = async () => {
    if (!willCollect || !order) return []
    const now = new Date().toISOString();
    const collectedTypes = Array.from(selectedMaterials);
    const nextGuides = guides.map((g: any) => ({
      ...g,
      exams: (g.exams || []).map((e: any) =>
        collectedTypes.includes(tubeTypeForMaterial(e.material))
          ? { ...e, collected: true, isColeta: true, collectedAt: e.collectedAt || now }
          : e
      ),
    }));
    const patch: any = { labGuides: nextGuides };
    if (canSetCollectionDone((order as any).status)) patch.status = 'collection_done';
    await updateOrder(order.id, patch);
    return collectedTypes;
  };

  // Botão "Imprimir" ao lado da opção marcada
  const handlePrintOption = async (opt: PrintOption) => {
    if (opt.id === 'etiquetas' && labelsBlocked) {
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
        collectedTypes = await persistCollection();
        setConfirmCollection(false);
        setSelectedMaterials(new Set());
        toast({ title: 'Coleta confirmada', description: `${collectedTypes.length} material(is) marcado(s) como coletado(s).` });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível confirmar a coleta.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    onConfirm({
      action: 'print',
      optionId: opt.id,
      options: options.map(o => ({ ...o, enabled: o.id === opt.id })),
      extras,
      printerSettings,
      watermark,
      emptyFields,
      selectedExams,
      selectedTubes,
      confirmCollection: !!collectedTypes.length,
      collectedMaterials: collectedTypes,
    });
  };

  // Botão do rodapé: apenas confirma a coleta (se marcada) e fecha
  const handleConfirm = async () => {
    if (willCollect && order) {
      setIsSaving(true);
      try {
        const collectedTypes = await persistCollection();
        toast({ title: 'Coleta confirmada', description: `${collectedTypes.length} material(is) marcado(s) como coletado(s).` });
      } catch {
        toast({ title: 'Erro', description: 'Não foi possível confirmar a coleta.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    onConfirm({ action: 'confirm', options, extras, printerSettings });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[620px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <div className="bg-white">
          {/* Header */}
          <div className="bg-white px-5 py-3 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-base font-bold text-[#007AFF]">Escolha o Tipo de Impressão</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-5 py-4 max-h-[62vh] overflow-y-auto">
            {/* Options */}
            <div className="divide-y divide-slate-100">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  className={cn(
                    "flex flex-col gap-1 py-2",
                    opt.id === 'etiquetas' && labelsBlocked && "rounded-md border border-red-300 bg-red-50 px-2"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        onClick={() => toggleOption(opt.id)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0",
                          opt.id === 'etiquetas' && labelsBlocked
                            ? (opt.enabled ? "bg-red-500 border-red-500" : "bg-white border-red-300")
                            : opt.enabled ? "bg-[#007AFF] border-[#007AFF]" : "bg-white border-slate-300"
                        )}
                      >
                        {opt.enabled && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <span className={cn(
                        "text-[13px] font-medium truncate transition-colors",
                        opt.id === 'etiquetas' && labelsBlocked ? "text-red-600" : opt.enabled ? "text-slate-900" : "text-slate-400"
                      )}>
                        {opt.label}
                      </span>
                      {opt.enabled && (
                        <Button
                          size="sm"
                          onClick={() => handlePrintOption(opt)}
                          disabled={isSaving || (opt.id === 'etiquetas' && labelsBlocked)}
                          className={cn(
                            "h-6 px-2.5 text-white text-[10px] font-bold uppercase gap-1 shrink-0",
                            opt.id === 'etiquetas' && labelsBlocked
                              ? "bg-red-400 hover:bg-red-400 cursor-not-allowed"
                              : "bg-[#007AFF] hover:bg-blue-700"
                          )}
                        >
                          <Printer className="h-3 w-3" /> Imprimir
                        </Button>
                      )}
                    </div>

                    {opt.formats.length > 0 && (
                      <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200 shrink-0">
                        {opt.formats.map((fmt) => (
                          <button
                            key={fmt}
                            disabled={!opt.enabled}
                            onClick={() => setFormat(opt.id, fmt)}
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded transition-all uppercase",
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

                  {opt.id === 'etiquetas' && labelsBlocked && (
                    <div className="flex items-center gap-1.5 ml-6 text-[10px] font-medium text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      A impressão de etiquetas exige que a amostra esteja coletada.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Confirmar coleta */}
            {materials.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2.5">
                  <div
                    onClick={() => setConfirmCollection(v => !v)}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all",
                      confirmCollection ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300"
                    )}
                  >
                    {confirmCollection && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={cn("text-[13px] font-medium", confirmCollection ? "text-slate-900" : "text-slate-400")}>
                    Confirmar coleta
                  </span>
                </div>

                {confirmCollection && (
                  <div className="mt-2 ml-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Materiais para Coleta
                    </p>
                    <div className="space-y-1.5">
                      {materials.map((m) => (
                        <label
                          key={m.type}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md bg-white border px-2.5 py-1.5 cursor-pointer transition-all",
                            selectedMaterials.has(m.type) ? "border-emerald-400" : "border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-emerald-500"
                              checked={selectedMaterials.has(m.type)}
                              onChange={() => toggleMaterial(m.type)}
                            />
                            <span className={cn("h-2 w-2 rounded-full shrink-0", m.color)} />
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 uppercase">{m.label}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[300px]">{m.exams.join(', ')}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase shrink-0",
                            m.collected ? "text-emerald-600" : "text-amber-500"
                          )}>
                            {m.collected ? 'Coletado' : 'Pendente'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Droplets className="h-3 w-3" />
                      Ao confirmar, o pedido passa para <strong>Coleta Realizada</strong> e as amostras para <strong>Coletado</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3 bg-slate-50 flex items-center justify-end gap-2 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="px-5 font-bold text-slate-600 border-slate-300 uppercase text-xs"
            >
              CANCELAR
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isSaving}
              className="px-6 font-bold bg-[#007AFF] hover:bg-blue-700 text-white shadow uppercase text-xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONFIRMAR'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

