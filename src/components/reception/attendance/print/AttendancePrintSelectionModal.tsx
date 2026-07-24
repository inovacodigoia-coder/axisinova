import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Printer, X, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';


interface PrintOption {
  id: string;
  label: string;
  enabled: boolean;
  formats: ('A4' | 'A5' | 'TÉRMICA' | 'ETIQUETA')[];
  selectedFormat: 'A4' | 'A5' | 'TÉRMICA' | 'ETIQUETA';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: any) => void;
  orderNumber?: string;
}

export function AttendancePrintSelectionModal({ open, onClose, onConfirm, orderNumber }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [options, setOptions] = useState<PrintOption[]>([
    { id: 'comprovante', label: 'Comprovante', enabled: true, formats: ['A4', 'A5', 'TÉRMICA', 'ETIQUETA'], selectedFormat: 'TÉRMICA' },
    { id: 'controle_interno', label: 'Controle Interno', enabled: false, formats: ['A4', 'A5', 'TÉRMICA'], selectedFormat: 'TÉRMICA' },
    { id: 'termo_consentimento', label: 'Termo de Consentimento', enabled: false, formats: ['A4', 'A5'], selectedFormat: 'A4' },
  ]);

  const [extras, setExtras] = useState({
    amostras: true,
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
      <DialogContent className="max-w-[1000px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-white">
          {/* Success Header */}
          <div className="bg-emerald-50 p-6 flex items-center justify-between border-b border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 rounded-full p-2 text-white">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-900">✅ Atendimento registrado!</h2>
                <p className="text-sm text-emerald-700">Pedido: {orderNumber || '---'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 font-bold uppercase text-[10px]",
                  showPreview ? "text-blue-600 bg-blue-50" : "text-slate-500"
                )}
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Ocultar Prévia' : 'Ver Prévia'}
              </Button>
              <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className={cn(
            "p-8 grid gap-8 transition-all duration-300",
            showPreview ? "grid-cols-1 md:grid-cols-[1fr_350px]" : "grid-cols-1 md:grid-cols-[280px_1fr]"
          )}>
            {/* Left/Main Column: Preview or Illustration */}
            <div className="flex flex-col h-full min-h-[400px]">
              {showPreview ? (
                <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 p-4 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pré-visualização do Documento</span>
                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {options.find(o => o.enabled)?.selectedFormat || 'A4'}
                    </span>
                  </div>
                  <ScrollArea className="flex-1 bg-white shadow-sm rounded-lg p-8">
                    {/* Mock Document Content */}
                    <div className="max-w-[500px] mx-auto space-y-6 text-slate-800">
                      <div className="flex justify-between border-b pb-4">
                        <div className="w-12 h-12 bg-slate-200 rounded"></div>
                        <div className="text-right">
                          <h4 className="font-bold text-sm uppercase">Comprovante de Atendimento</h4>
                          <p className="text-[10px] text-slate-500">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">PACIENTE:</span>
                          <span>JOÃO DA SILVA SAURO</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">PEDIDO:</span>
                          <span className="font-mono">{orderNumber || '00234'}</span>
                        </div>
                      </div>

                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="text-left py-2">EXAME</th>
                            <th className="text-right py-2">PRAZO</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="py-2">HEMOGRAMA COMPLETO</td>
                            <td className="text-right py-2">24h</td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td className="py-2">GLICOSE EM JEJUM</td>
                            <td className="text-right py-2">12h</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="flex justify-center pt-8">
                        <div className="w-24 h-24 bg-slate-100 border flex items-center justify-center">
                          <span className="text-[8px] text-slate-400">QR CODE</span>
                        </div>
                      </div>

                      <div className="pt-8 text-center text-[8px] text-slate-400 italic">
                        Este documento é um comprovante interno para conferência.
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 border border-slate-100 h-full">
                  <img 
                    src="https://illustrations.popsy.co/blue/document-management.svg" 
                    alt="Impressão"
                    className="w-full h-auto max-w-[200px] mb-4"
                  />
                  <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
                    Selecione os documentos que deseja imprimir agora. Clique em "Ver Prévia" para conferir o layout.
                  </p>
                </div>
              )}
            </div>


            <div className="space-y-6 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Opções de Impressão</h3>
                <Download className="h-4 w-4 text-amber-500 cursor-pointer hover:scale-110 transition-transform" />
              </div>


              <div className="space-y-4">
                {options.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => toggleOption(opt.id)}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all",
                          opt.enabled ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                        )}
                      >
                        {opt.enabled && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <span className={cn("text-sm font-medium transition-colors", opt.enabled ? "text-slate-900" : "text-slate-400")}>
                        {opt.label}
                      </span>
                    </div>

                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      {opt.formats.map((fmt) => (
                        <button
                          key={fmt}
                          disabled={!opt.enabled}
                          onClick={() => setFormat(opt.id, fmt)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase",
                            opt.selectedFormat === fmt && opt.enabled 
                              ? "bg-white text-blue-600 shadow-sm border border-blue-100" 
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Extras Checkboxes */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-x-8 gap-y-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setExtras(e => ({ ...e, amostras: !e.amostras }))}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      extras.amostras ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                    )}
                  >
                    {extras.amostras && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-xs font-medium text-slate-600">Amostras</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setExtras(e => ({ ...e, capa_guia: !e.capa_guia }))}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      extras.capa_guia ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                    )}
                  >
                    {extras.capa_guia && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-xs font-medium text-slate-600">Capa Guia</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setExtras(e => ({ ...e, etiqueta_cliente: !e.etiqueta_cliente }))}
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      extras.etiqueta_cliente ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                    )}
                  >
                    {extras.etiqueta_cliente && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-xs font-medium text-slate-600">Etiqueta Cliente</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-200">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6 font-bold text-slate-600 border-slate-300 uppercase text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => onConfirm({ options, extras })}
              className="px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg uppercase text-xs h-10"
            >
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
