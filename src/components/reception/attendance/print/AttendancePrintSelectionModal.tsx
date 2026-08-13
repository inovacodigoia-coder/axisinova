import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Printer, X, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SampleLabel } from '@/components/lab/print/SampleLabel';
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

export function AttendancePrintSelectionModal({ open, onClose, onConfirm, order, selectedExams, selectedTubes }: Props) {
  const orderNumber = order?.orderNumber;
  const [showPreview, setShowPreview] = useState(false);
  const [options, setOptions] = useState<PrintOption[]>([
    { id: 'comprovante', label: 'Comprovante', enabled: true, formats: ['A4', 'A5', 'TÉRMICA'], selectedFormat: 'TÉRMICA' },
    { id: 'controle_interno', label: 'Controle Interno', enabled: true, formats: ['A4', 'A5', 'TÉRMICA'], selectedFormat: 'TÉRMICA' },
    { id: 'termo_consentimento', label: 'Termo de Consentimento', enabled: false, formats: ['A4', 'A5'], selectedFormat: 'A4' },
  ]);

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

  const toggleOption = (id: string) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, enabled: !opt.enabled } : opt));
  };

  const setFormat = (id: string, format: any) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, selectedFormat: format } : opt));
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

          <div className="p-8">
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
                </div>
              ))}

            </div>
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
              onClick={() => onConfirm({ options, extras, printerSettings, watermark, emptyFields, selectedExams, selectedTubes })}
              className="px-8 font-bold bg-[#007AFF] hover:bg-blue-700 text-white shadow-lg uppercase text-xs h-10"
            >
              IMPRIMIR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
