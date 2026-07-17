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
import { CheckCircle2, User, Printer, Mail, Globe, Clock, CreditCard } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface DeliveryTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  patientName: string;
  protocol: string;
}

export default function DeliveryTrackingModal({
  isOpen,
  onClose,
  onConfirm,
  patientName,
  protocol
}: DeliveryTrackingModalProps) {
  const [deliveredTo, setDeliveredTo] = React.useState('patient');
  const [recipientName, setRecipientName] = React.useState('');
  const [recipientDoc, setRecipientDoc] = React.useState('');
  const [deliveryMethod, setDeliveryMethod] = React.useState('printed');

  const handleConfirm = () => {
    onConfirm({
      deliveredTo,
      recipientName: deliveredTo === 'patient' ? patientName : recipientName,
      recipientDoc,
      deliveryMethod,
      deliveredAt: new Date().toISOString(),
      deliveredBy: 'Alexsandro' // Mock user
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Registrar Entrega do Laudo</DialogTitle>
          <DialogDescription>
            Documente quem recebeu o laudo e por qual meio.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Entregue para:</Label>
            <RadioGroup value={deliveredTo} onValueChange={setDeliveredTo} className="grid grid-cols-1 gap-2">
              <div className={cn(
                "flex items-center space-x-3 space-y-0 p-3 rounded-lg border transition-colors cursor-pointer",
                deliveredTo === 'patient' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )} onClick={() => setDeliveredTo('patient')}>
                <RadioGroupItem value="patient" id="patient" />
                <Label htmlFor="patient" className="flex-1 cursor-pointer flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Próprio paciente
                </Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 space-y-0 p-3 rounded-lg border transition-colors cursor-pointer",
                deliveredTo === 'relative' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )} onClick={() => setDeliveredTo('relative')}>
                <RadioGroupItem value="relative" id="relative" />
                <Label htmlFor="relative" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Familiar / Responsável
                </Label>
              </div>
              <div className={cn(
                "flex items-center space-x-3 space-y-0 p-3 rounded-lg border transition-colors cursor-pointer",
                deliveredTo === 'doctor' ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )} onClick={() => setDeliveredTo('doctor')}>
                <RadioGroupItem value="doctor" id="doctor" />
                <Label htmlFor="doctor" className="flex-1 cursor-pointer flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Médico solicitante
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(deliveredTo === 'relative' || deliveredTo === 'other') && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name" 
                  placeholder="Nome do receptor" 
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc">Documento (RG/CPF)</Label>
                <Input 
                  id="doc" 
                  placeholder="000.000.000-00" 
                  value={recipientDoc}
                  onChange={(e) => setRecipientDoc(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Forma de entrega:</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'printed', label: 'Impresso', icon: Printer },
                { id: 'email', label: 'E-mail', icon: Mail },
                { id: 'portal', label: 'Portal', icon: Globe },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setDeliveryMethod(method.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                    deliveryMethod === method.id 
                      ? "border-primary bg-primary/5 text-primary shadow-sm" 
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <method.icon className="h-5 w-5" />
                  <span className="text-[10px] font-bold uppercase">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 p-3 rounded-lg border border-dashed border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {new Date().toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
              <User className="h-3.5 w-3.5" /> Alexsandro
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={handleConfirm}
          >
            <CheckCircle2 className="h-4 w-4" /> Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simple icons from lucide that might be missing in scope
const Users = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)

const Stethoscope = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6v-4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><circle cx="12" cy="10" r="2"/></svg>
)
