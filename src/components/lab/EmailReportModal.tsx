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
import { Mail, Send, Checkbox as CheckboxIcon, FileText } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: any) => void;
  patientName: string;
  protocol: string;
}

export default function EmailReportModal({
  isOpen,
  onClose,
  onSend,
  patientName,
  protocol
}: EmailReportModalProps) {
  const [recipientType, setRecipientType] = React.useState('patient');
  const [customEmail, setCustomEmail] = React.useState('');
  const [subject, setSubject] = React.useState(`Resultado de Exame — ${patientName}`);
  const [message, setMessage] = React.useState(`Prezado(a) ${patientName},\n\nInformamos que o seu laudo laboratorial referente ao atendimento ${protocol} já está disponível.\n\nAtenciosamente,\nLaboratório Central`);
  const [attachPdf, setAttachPdf] = React.useState(true);

  const handleSend = () => {
    onSend({
      recipientType,
      email: recipientType === 'other' ? customEmail : (recipientType === 'patient' ? 'paciente@email.com' : 'medico@clinica.com'),
      subject,
      message,
      attachPdf
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Enviar Laudo por E-mail
          </DialogTitle>
          <DialogDescription>
            Envie o laudo em PDF diretamente para o paciente ou médico.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Destinatário:</Label>
            <RadioGroup value={recipientType} onValueChange={setRecipientType} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="patient" id="rec-patient" />
                <Label htmlFor="rec-patient" className="text-sm cursor-pointer">
                  Paciente: <span className="text-muted-foreground ml-1">paciente@email.com</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="doctor" id="rec-doctor" />
                <Label htmlFor="rec-doctor" className="text-sm cursor-pointer">
                  Médico solicitante: <span className="text-muted-foreground ml-1">medico@clinica.com</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="rec-other" />
                <Label htmlFor="rec-other" className="text-sm cursor-pointer">Outro e-mail</Label>
              </div>
            </RadioGroup>
          </div>

          {recipientType === 'other' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="exemplo@email.com" 
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input 
                id="subject" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea 
                id="message" 
                className="min-h-[120px] text-sm"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="attach-pdf" 
              checked={attachPdf} 
              onCheckedChange={(checked) => setAttachPdf(checked as boolean)}
            />
            <Label htmlFor="attach-pdf" className="text-xs font-medium cursor-pointer flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Anexar laudo em PDF
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            className="gradient-bg text-white gap-2"
            onClick={handleSend}
          >
            <Send className="h-4 w-4" /> Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
