import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, X, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2, Share2, Mail } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import LaudoDocument from './LaudoDocument';
import { LabAttendanceOrder } from '@/types/lab.types';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Partial<LabAttendanceOrder>;
  onDownload: () => void;
  onPrint?: () => void;
  onEmail?: () => void;
  onShare?: () => void;
}

export default function PDFPreviewModal({ 
  isOpen, 
  onClose, 
  order,
  onDownload,
  onPrint,
  onEmail,
  onShare
}: PDFPreviewModalProps) {
  const [zoom, setZoom] = React.useState(100);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Status mapping
  const getStatusBadge = () => {
    const status = order.exams?.[0]?.status; // Simplified check
    switch (status) {
      case 'validated':
      case 'liberado':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Liberado</Badge>;
      case 'waiting_approval':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Aprovado Tecnicamente</Badge>;
      default:
        return <Badge variant="outline">Em Processamento</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(
        "flex flex-col p-0 overflow-hidden transition-all duration-300",
        isFullscreen ? "max-w-none w-screen h-screen rounded-none" : "sm:max-w-[1000px] h-[95vh]"
      )}>
        <DialogHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg">Visualização do Laudo</DialogTitle>
                <p className="text-xs text-muted-foreground">{order.patientName} • {order.protocol}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-8">
              {getStatusBadge()}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-zinc-700/50 p-4 md:p-8 overflow-hidden flex flex-col items-center relative">
          {/* Zoom Controls Overlay */}
          <div className="absolute top-4 right-4 flex gap-2 z-10 bg-zinc-900/80 backdrop-blur-md p-1.5 rounded-lg shadow-xl border border-white/10">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-xs font-mono text-zinc-300 min-w-[45px] justify-center">{zoom}%</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          
          <ScrollArea className="w-full h-full">
            <div className="flex justify-center p-4 min-w-max">
              <div 
                className="origin-top transition-transform duration-200 shadow-2xl"
                style={{ 
                  transform: `scale(${zoom / 100})`,
                }}
              >
                <LaudoDocument 
                  order={order}
                  technicalResponsible={{
                    name: "Anderson Veríssimo O. Neto",
                    register: "CRBM-RN-08453",
                    role: "Biomédico"
                  }}
                  isRetified={order.exams?.some(e => e.isRetificado)}
                />
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 bg-background border-t gap-2 sm:justify-between flex-wrap">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEmail} className="gap-2">
              <Mail className="h-4 w-4" /> E-mail
            </Button>
            <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
              <Share2 className="h-4 w-4" /> Link Público
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" /> Fechar
            </Button>
            <Button variant="outline" className="gap-2" onClick={onPrint || (() => window.print())}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button className="gradient-bg text-white gap-2" onClick={onDownload}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
