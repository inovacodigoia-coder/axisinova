import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  protocol: string;
  onDownload: () => void;
  status?: string;
}

export default function PDFPreviewModal({ 
  isOpen, 
  onClose, 
  patientName, 
  protocol, 
  onDownload,
  status = 'waiting_approval'
}: PDFPreviewModalProps) {
  const [zoom, setZoom] = React.useState(100);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "flex flex-col p-0 overflow-hidden transition-all duration-300",
        isFullscreen ? "max-w-none w-screen h-screen rounded-none" : "sm:max-w-[800px] h-[90vh]"
      )}>
        <DialogHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg">Pré-visualização do Laudo</DialogTitle>
                <p className="text-xs text-muted-foreground">{patientName} • {protocol}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <Badge variant="outline" className={status === 'validated' || status === 'waiting_approval' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                {status === 'waiting_approval' ? 'Validado Tecnicamente' : status === 'validated' ? 'Liberado' : 'Em Digitação'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-zinc-800 p-8 overflow-hidden flex flex-col items-center relative">
          <div className="absolute top-4 right-4 flex gap-2 z-10 bg-zinc-700/80 backdrop-blur-md p-1.5 rounded-lg shadow-xl border border-zinc-600">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-zinc-600" onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-xs font-mono text-zinc-300 min-w-[45px] justify-center">{zoom}%</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-zinc-600" onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px bg-zinc-600 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-zinc-600" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          
          <ScrollArea className="w-full h-full">
            <div className="flex justify-center p-8">
              <div 
                className="bg-white shadow-2xl p-12 text-zinc-800 font-serif origin-top transition-transform duration-200"
                style={{ 
                  width: '595px', 
                  minHeight: '842px',
                  transform: `scale(${zoom / 100})`
                }}
              >
              {/* Mock PDF Header */}
              <div className="border-b-2 border-zinc-800 pb-4 mb-8 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold uppercase tracking-tighter">Laboratório Central</h1>
                  <p className="text-[10px]">Rua das Flores, 123 - Centro • (84) 3333-4444</p>
                  <p className="text-[10px]">www.laboratoriocentral.com.br</p>
                </div>
                <div className="text-right text-[10px] space-y-1">
                  <p><strong>Protocolo:</strong> {protocol}</p>
                  <p><strong>Data Coleta:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                  <p><strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Patient Info */}
              <div className="bg-zinc-50 p-4 mb-8 border border-zinc-200 rounded grid grid-cols-2 gap-y-2 text-xs">
                <div><strong>Paciente:</strong> {patientName}</div>
                <div><strong>Nascimento:</strong> 15/05/1985 (41 anos)</div>
                <div><strong>Médico:</strong> Dr. Carlos Lima (CRM 12345)</div>
                <div><strong>Convênio:</strong> Particular</div>
              </div>

              {/* Results Table */}
              <div className="space-y-8">
                <div>
                  <h3 className="font-bold border-b border-zinc-400 pb-1 mb-4 text-sm uppercase">Bioquímica</h3>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left pb-2">EXAME / PARÂMETRO</th>
                        <th className="text-left pb-2">RESULTADO</th>
                        <th className="text-left pb-2">VALORES DE REFERÊNCIA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr>
                        <td className="py-4">
                          <p className="font-bold">GLICOSE DE JEJUM</p>
                          <p className="text-[9px] text-zinc-500">Material: Plasma Fluoretado</p>
                        </td>
                        <td className="py-4 font-bold">95 mg/dL</td>
                        <td className="py-4">70 a 99 mg/dL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-20 pt-8 border-t border-zinc-200 text-center space-y-4">
                <div className="inline-block border-t border-zinc-400 px-8 pt-1">
                  <p className="font-bold text-xs uppercase">Dr. Responsável Técnico</p>
                  <p className="text-[10px]">CRBM 0000</p>
                </div>
                <p className="text-[8px] text-zinc-400 italic">
                  Laudo gerado eletronicamente em {new Date().toLocaleString('pt-BR')}. Autenticidade disponível via QR Code no site oficial.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

        <DialogFooter className="p-4 bg-background border-t gap-2">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" /> Fechar
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button className="gradient-bg text-white gap-2" onClick={onDownload}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
