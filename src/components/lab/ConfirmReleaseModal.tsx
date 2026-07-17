import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Signature as SignatureIcon, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConfirmReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  patientName: string;
  protocol: string;
  examsCount: number;
  technicalResponsible: {
    name: string;
    register: string;
    signatureUrl?: string;
  };
}

export default function ConfirmReleaseModal({
  isOpen,
  onClose,
  onConfirm,
  patientName,
  protocol,
  examsCount,
  technicalResponsible
}: ConfirmReleaseModalProps) {
  const [applySignature, setApplySignature] = React.useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-teal-600">
            <ShieldCheck className="h-5 w-5" /> Confirmar Liberação do Laudo
          </DialogTitle>
          <DialogDescription>
            Ao liberar o laudo, ele ficará disponível para o paciente e médico solicitante.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground uppercase font-bold tracking-wider">
              <span>Detalhes do Atendimento</span>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Protocolo:</span>
                <span className="text-xs font-mono font-bold">{protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Paciente:</span>
                <span className="text-xs font-bold">{patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Exames aprovados:</span>
                <Badge variant="outline" className="h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                  {examsCount} de {examsCount}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Assinatura Digital Aplicada</span>
            <div className="border rounded-xl p-4 bg-card flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-48 border-b border-dashed border-zinc-200 flex items-end justify-center pb-1">
                {technicalResponsible.signatureUrl ? (
                  <img src={technicalResponsible.signatureUrl} alt="Signature" className="h-full object-contain" />
                ) : (
                  <SignatureIcon className="h-8 w-8 text-muted-foreground/20" />
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold">{technicalResponsible.name}</p>
                <p className="text-[10px] text-muted-foreground">{technicalResponsible.register}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="apply-sig" 
                checked={applySignature} 
                onCheckedChange={(checked) => setApplySignature(checked as boolean)}
              />
              <Label htmlFor="apply-sig" className="text-xs font-medium cursor-pointer">
                Aplicar assinatura digital ao laudo
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            onClick={onConfirm}
          >
            <CheckCircle2 className="h-4 w-4" /> Confirmar e Liberar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
