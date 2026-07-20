import { Save, Bell, Mail, MessageSquare, History, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function NotificationsSettingsPage() {
  const patientEvents = [
    { name: 'Resultado disponível', email: true, sms: false },
    { name: 'Lembrete de exame (dia ant.)', email: false, sms: true },
    { name: 'Confirmação de agendamento', email: true, sms: true },
  ];

  const doctorEvents = [
    { name: 'Resultado disponível', email: true, sms: false },
    { name: 'Valor crítico detectado', email: true, sms: true, required: true },
  ];

  const partnerEvents = [
    { name: 'Resultado disponível', email: true, sms: false },
    { name: 'Recoleta solicitada', email: true, sms: false },
  ];

  const history = [
    { date: '16/07 15:32', dest: 'joao@email.com', type: 'Resultado disponível', channel: 'E-mail', content: 'Protocolo 20260716-360-80', status: 'sent' },
    { date: '16/07 15:30', dest: '(84) 99999-0001', type: 'Valor crítico', channel: 'SMS', content: 'Glicose 28 mg/dL', status: 'sent' },
    { date: '15/07 09:15', dest: 'dr.lima@email.com', type: 'Resultado disponível', channel: 'E-mail', content: 'Protocolo 20260715-756-75', status: 'sent' },
    { date: '14/07 14:00', dest: 'dra.paula@email.com', type: 'Valor crítico', channel: 'E-mail', content: 'Potássio 6,8 mEq/L', status: 'failed' },
  ];

  const renderConfigTable = (events: any[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>SMS / WhatsApp</TableHead>
            <TableHead className="text-right">Canal Ativo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((ev) => (
            <TableRow key={ev.name}>
              <TableCell className="font-medium">{ev.name}</TableCell>
              <TableCell>
                <input type="checkbox" defaultChecked={ev.email} disabled={ev.required} className="h-4 w-4 rounded border-gray-300" />
              </TableCell>
              <TableCell>
                <input type="checkbox" defaultChecked={ev.sms} disabled={ev.required} className="h-4 w-4 rounded border-gray-300" />
              </TableCell>
              <TableCell className="text-right">
                <select className="rounded-lg border border-input bg-background px-3 py-1 text-xs">
                  <option>E-mail</option>
                  <option>SMS / WhatsApp</option>
                  <option>Ambos</option>
                  <option>Nenhum</option>
                </select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações Automáticas</h1>
          <p className="text-sm text-muted-foreground">Configure os disparos automáticos para pacientes, médicos e parceiros.</p>
        </div>
        <Button onClick={() => toast.success('Configurações salvas')} className="gradient-bg gap-2">
          <Save className="h-4 w-4" /> Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" /> Configuração</TabsTrigger>
          <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" /> Templates</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6 space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">Para o PACIENTE</h3>
            {renderConfigTable(patientEvents)}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">Para o MÉDICO</h3>
            {renderConfigTable(doctorEvents)}
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">Para o PARCEIRO</h3>
            {renderConfigTable(partnerEvents)}
          </section>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card className="p-8 text-center text-muted-foreground border-dashed">
            Editor de templates de e-mail e SMS em desenvolvimento.
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{h.date}</TableCell>
                    <TableCell className="font-medium">{h.dest}</TableCell>
                    <TableCell className="text-sm">{h.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {h.channel === 'E-mail' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {h.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.status === 'sent' ? 'success' : 'destructive'} className={h.status === 'sent' ? 'bg-green-500 text-white' : ''}>
                        {h.status === 'sent' ? 'Enviado' : 'Falhou'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
