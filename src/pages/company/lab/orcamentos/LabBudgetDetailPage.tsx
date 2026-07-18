/**
 * PROMPT 13-F — Orçamentos: Criação, Validade, Conversão em Guia e Importação
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  ArrowRightLeft, 
  Trash2,
  Calendar,
  Clock,
  User,
  History,
  Info,
  ExternalLink,
  FileText,
  Send,
  CheckCircle2,
  Settings
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import EmailReportModal from '@/components/lab/EmailReportModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

export default function LabBudgetDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'converted'>('pending');

  const handleConvert = () => {
    toast.info("Processando conversão em atendimento...");
    setTimeout(() => {
      toast.success("Orçamento convertido com sucesso! Redirecionando para o atendimento...");
      navigate('/app/recepcao');
    }, 1500);
  };

  const handleSendEmail = (data: any) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Enviando orçamento por e-mail...',
        success: 'Orçamento enviado com sucesso!',
        error: 'Erro ao enviar e-mail.',
      }
    );
    setEmailModalOpen(false);
  };

  const handleApprove = () => {
    setStatus('approved');
    setApprovalModalOpen(false);
    toast.success("Orçamento aprovado com sucesso!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app/orcamentos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">ORC-2025-001</h1>
              {status === 'pending' && <Badge className="bg-blue-500 text-white">● Pendente</Badge>}
              {status === 'approved' && <Badge className="bg-emerald-500 text-white">● Aprovado</Badge>}
              {status === 'converted' && <Badge className="bg-purple-500 text-white">● Convertido</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">Criado em 07/07/2025 · Válido até 14/07/2025</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/app/orcamentos/${id}/editar`)}>
            <Edit className="h-4 w-4" /> Editar
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setEmailModalOpen(true)}>
            <Mail className="h-4 w-4" /> Enviar
          </Button>
          {status === 'pending' && (
            <Button variant="outline" className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => setApprovalModalOpen(true)}>
              <CheckCircle2 className="h-4 w-4" /> Aprovar Orçamento
            </Button>
          )}
          <Button onClick={handleConvert} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
            <ArrowRightLeft className="h-4 w-4" /> Converter em Guia
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="bg-muted/30 p-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Dados do Paciente
              </h3>
            </div>
            <div className="p-6 flex items-start gap-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">JS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 flex-1">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Paciente</p>
                  <p className="font-bold text-lg">João da Silva</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Idade / Sexo</p>
                  <p className="font-medium">42 anos • Masculino</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">CPF</p>
                  <p className="font-medium">012.***.***-34</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Contato</p>
                  <p className="font-medium">(84) 99999-0001</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="bg-muted/30 p-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Exames do Orçamento
              </h3>
            </div>
            <div className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/20 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Exame</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground">Material</th>
                    <th className="px-6 py-3 font-medium text-muted-foreground text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { code: 'HEM', name: 'Hemograma Completo', material: 'Sangue Total', price: 45 },
                    { code: 'GLI', name: 'Glicose em Jejum', material: 'Soro', price: 18 },
                    { code: 'COL', name: 'Colesterol Total', material: 'Soro', price: 22 },
                    { code: 'TRI', name: 'Triglicerídeos', material: 'Soro', price: 25 },
                    { code: 'ACU', name: 'Ácido Úrico', material: 'Soro', price: 20 },
                  ].map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-primary mr-2">{item.code}</span>
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{item.material}</td>
                      <td className="px-6 py-4 text-right font-medium">R$ {item.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 bg-muted/5 flex flex-col items-end gap-2">
                <div className="flex justify-between w-64 text-sm text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>R$ 130,00</span>
                </div>
                <div className="flex justify-between w-64 text-sm text-emerald-600 font-medium">
                  <span>Desconto (10%):</span>
                  <span>- R$ 13,00</span>
                </div>
                <div className="flex justify-between w-64 text-xl font-bold border-t pt-2 mt-2">
                  <span>TOTAL:</span>
                  <span>R$ 117,00</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Configurações</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Convênio:</span>
                  <span className="font-medium">Particular</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tabela:</span>
                  <span className="font-medium">Particular 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Médico:</span>
                  <span className="font-medium">Dr. Carlos Lima</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validade:</span>
                  <div className="text-right">
                    <p className="font-medium">14/07/2025</p>
                    <p className="text-[10px] text-amber-600 font-bold">(7 dias restantes)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico
              </h3>
              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                <div className="pl-6 relative">
                  <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <p className="text-xs font-bold">Criado por Alexsandro</p>
                  <p className="text-[10px] text-muted-foreground">07/07/2025 14:32</p>
                </div>
                <div className="pl-6 relative">
                  <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </div>
                  <p className="text-xs font-bold">E-mail enviado</p>
                  <p className="text-[10px] text-muted-foreground">joao@email.com • 07/07/2025 14:35</p>
                </div>
              </div>
            </div>
          </Card>

          <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/5">
            <Trash2 className="h-4 w-4" /> Cancelar Orçamento
          </Button>
        </div>
      </div>

      <EmailReportModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        patientName="João da Silva"
        protocol="ORC-2025-001"
      />

      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Orçamento</DialogTitle>
            <DialogDescription>
              Confirmar a aprovação do orçamento <strong>ORC-2025-001</strong> para o paciente João da Silva.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="font-medium">Valor Total:</span>
              <span className="text-lg font-bold">R$ 117,00</span>
            </div>
            <p className="text-muted-foreground italic text-xs">
              Ao aprovar, o status do orçamento será atualizado e registrado no histórico. Você poderá convertê-lo em guia a qualquer momento.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleApprove}>
              <CheckCircle2 className="h-4 w-4" /> Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
