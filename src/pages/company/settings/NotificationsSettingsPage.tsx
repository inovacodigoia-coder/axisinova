import { useEffect, useMemo, useState } from 'react';
import { Save, Bell, Mail, MessageSquare, History, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { resolveCompanyId } from '@/utils/companyId';

const db = supabase as any;

type Publico = 'paciente' | 'medico' | 'parceiro' | 'setor';
interface Evento { publico: Publico; name: string; email: boolean; sms: boolean; sistema?: boolean; required?: boolean; assunto: string; template: string; vars: string }
interface Cfg { email: boolean; sms: boolean; sistema: boolean; assunto: string; template: string }

const EVENTOS: Evento[] = [
  { publico: 'paciente', name: 'Resultado disponível', email: true, sms: false, assunto: 'Seu resultado está disponível', template: 'Olá {paciente}, o resultado do protocolo {protocolo} já está disponível.', vars: '{paciente} {protocolo}' },
  { publico: 'paciente', name: 'Lembrete de exame (dia ant.)', email: false, sms: true, assunto: 'Lembrete do seu exame', template: 'Olá {paciente}, lembramos do seu exame amanhã às {hora}.', vars: '{paciente} {hora}' },
  { publico: 'paciente', name: 'Confirmação de agendamento', email: true, sms: true, assunto: 'Agendamento confirmado', template: 'Olá {paciente}, seu agendamento em {data} está confirmado.', vars: '{paciente} {data}' },
  { publico: 'paciente', name: 'Recoleta necessária (exame de apoio)', email: true, sms: true, assunto: 'Precisamos de uma nova coleta', template: 'Olá {paciente}, o exame {exame} precisa de nova coleta. Motivo: {motivo}. Orientação: {orientacao}. Nova data: {nova_data}.', vars: '{paciente} {exame} {motivo} {orientacao} {nova_data}' },
  { publico: 'medico', name: 'Resultado disponível', email: true, sms: false, assunto: 'Resultado disponível', template: 'Dr(a). {medico}, o resultado de {paciente} está disponível.', vars: '{medico} {paciente}' },
  { publico: 'medico', name: 'Valor crítico detectado', email: true, sms: true, required: true, assunto: 'Valor crítico', template: 'Valor crítico para {paciente}: {exame} = {valor}.', vars: '{paciente} {exame} {valor}' },
  { publico: 'parceiro', name: 'Resultado disponível', email: true, sms: false, assunto: 'Resultado disponível', template: 'O resultado do pedido {protocolo} está disponível.', vars: '{protocolo}' },
  { publico: 'parceiro', name: 'Recoleta solicitada', email: true, sms: false, assunto: 'Recoleta solicitada', template: 'O pedido {protocolo} precisa de recoleta: {motivo}.', vars: '{protocolo} {motivo}' },
  { publico: 'setor', name: 'Exame de apoio atrasado', email: true, sms: false, sistema: true, assunto: 'Exames de apoio atrasados', template: '{quantidade} exame(s) de apoio passaram a atrasar hoje.', vars: '{quantidade} {exame} {apoio}' },
  { publico: 'setor', name: 'Pendência técnica do apoio', email: true, sms: false, sistema: true, assunto: 'Pendência técnica do apoio', template: '{exame} ({apoio}): {motivo}.', vars: '{exame} {apoio} {motivo}' },
  { publico: 'setor', name: 'Integração com o apoio falhou', email: true, sms: false, sistema: true, assunto: 'Integração com o apoio falhou', template: '{apoio}: sem sucesso há mais de 1 hora.', vars: '{apoio}' },
  { publico: 'setor', name: 'Licença/certificação do apoio vencendo', email: true, sms: false, sistema: true, assunto: 'Licença/certificação vencendo', template: '{apoio} – {documento} vence em {validade}.', vars: '{apoio} {documento} {validade}' },
  { publico: 'setor', name: 'Resultado de apoio retificado', email: true, sms: false, sistema: true, assunto: 'Resultado de apoio retificado', template: 'O resultado de {exame} ({paciente}) foi retificado pelo {apoio}.', vars: '{exame} {paciente} {apoio}' },
];

const chave = (e: Evento) => `${e.publico}:${e.name}`;
// Eventos do setor usam o nome puro como chave no banco (usado pelas rotinas de alerta)
const chaveDb = (e: Evento) => e.publico === 'setor' ? e.name : chave(e);

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const companyId = resolveCompanyId(user?.companyId) || '';
  const [cfg, setCfg] = useState<Record<string, Cfg>>({});
  const [historico, setHistorico] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<string>(chave(EVENTOS[3]));

  useEffect(() => {
    const base: Record<string, Cfg> = {};
    EVENTOS.forEach(e => { base[chave(e)] = { email: e.email, sms: e.sms, sistema: e.sistema ?? false, assunto: e.assunto, template: e.template }; });
    if (!companyId) { setCfg(base); return; }
    db.from('notificacao_evento_config').select('*').then(({ data }: any) => {
      (data || []).forEach((r: any) => {
        const ev = EVENTOS.find(e => chaveDb(e) === r.evento);
        if (ev) base[chave(ev)] = { email: r.canal_email, sms: r.canal_sms, sistema: r.canal_sistema, assunto: r.assunto || ev.assunto, template: r.template || ev.template };
      });
      setCfg({ ...base });
    });
    db.from('notificacao_historico').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }: any) => setHistorico(data || []));
  }, [companyId]);

  const set = (k: string, patch: Partial<Cfg>) => setCfg(c => ({ ...c, [k]: { ...c[k], ...patch } }));

  const salvar = async () => {
    if (!companyId) return;
    setSaving(true);
    const rows = EVENTOS.map(e => ({
      company_id: companyId, publico: e.publico, evento: chaveDb(e), canal_email: cfg[chave(e)]?.email ?? e.email,
      canal_sms: cfg[chave(e)]?.sms ?? e.sms, canal_sistema: cfg[chave(e)]?.sistema ?? !!e.sistema,
      assunto: cfg[chave(e)]?.assunto, template: cfg[chave(e)]?.template, updated_at: new Date().toISOString(),
    }));
    const { error } = await db.from('notificacao_evento_config').upsert(rows, { onConflict: 'company_id,evento' });
    setSaving(false);
    if (error) toast.error('Não foi possível salvar', { description: error.message.includes('row-level') ? 'Somente administradores podem alterar.' : error.message });
    else toast.success('Configurações salvas');
  };

  const renderConfigTable = (publico: Publico) => {
    const setor = publico === 'setor';
    return (
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>{setor ? 'Sininho do sistema' : 'SMS / WhatsApp'}</TableHead>
              <TableHead className="text-right">Canal Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EVENTOS.filter(e => e.publico === publico).map((ev) => {
              const k = chave(ev); const c = cfg[k]; if (!c) return null;
              const segundo = setor ? c.sistema : c.sms;
              const ativo = c.email && segundo ? 'Ambos' : c.email ? 'E-mail' : segundo ? (setor ? 'Sininho' : 'SMS / WhatsApp') : 'Nenhum';
              return (
                <TableRow key={k}>
                  <TableCell className="font-medium">{ev.name}</TableCell>
                  <TableCell><input type="checkbox" checked={c.email} disabled={ev.required} onChange={e => set(k, { email: e.target.checked })} className="h-4 w-4 rounded border-input" /></TableCell>
                  <TableCell><input type="checkbox" checked={segundo} disabled={ev.required} onChange={e => set(k, setor ? { sistema: e.target.checked } : { sms: e.target.checked })} className="h-4 w-4 rounded border-input" /></TableCell>
                  <TableCell className="text-right">
                    <select value={ativo} disabled={ev.required} onChange={e => {
                      const v = e.target.value; const em = v === 'E-mail' || v === 'Ambos'; const sg = v !== 'E-mail' && v !== 'Nenhum';
                      set(k, setor ? { email: em, sistema: sg } : { email: em, sms: sg });
                    }} className="rounded-lg border border-input bg-background px-3 py-1 text-xs">
                      <option>E-mail</option>
                      <option>{setor ? 'Sininho' : 'SMS / WhatsApp'}</option>
                      <option>Ambos</option>
                      <option>Nenhum</option>
                    </select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const evEdit = useMemo(() => EVENTOS.find(e => chave(e) === editando)!, [editando]);
  const rotulo: Record<Publico, string> = { paciente: 'Paciente', medico: 'Médico', parceiro: 'Parceiro', setor: 'Setor' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificações Automáticas</h1>
          <p className="text-sm text-muted-foreground">Configure os disparos automáticos para pacientes, médicos, parceiros e setores internos.</p>
          {/* Remover quando o envio real (notificar_paciente_recoleta) existir */}
          <p className="mt-1 inline-block rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs text-muted-foreground">Envio automático ainda não disponível: os avisos viram tarefas no Kanban Apoio</p>
        </div>
        <Button onClick={salvar} disabled={saving} className="gradient-bg gap-2">
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
          <section className="space-y-4"><h3 className="text-lg font-bold">Para o PACIENTE</h3>{renderConfigTable('paciente')}</section>
          <section className="space-y-4"><h3 className="text-lg font-bold">Para o MÉDICO</h3>{renderConfigTable('medico')}</section>
          <section className="space-y-4"><h3 className="text-lg font-bold">Para o PARCEIRO</h3>{renderConfigTable('parceiro')}</section>
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">Para o SETOR (interno)</h3>
            <p className="text-xs text-muted-foreground">Atraso: resumo diário às 8h e imediato para exames críticos. Pendência/recoleta: imediato. Licença vencendo em 30 dias e integração sem sucesso há mais de 1 hora: para o administrador.</p>
            {renderConfigTable('setor')}
          </section>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            <Card className="max-h-[520px] overflow-auto p-2">
              {EVENTOS.map(e => (
                <button key={chave(e)} onClick={() => setEditando(chave(e))}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${editando === chave(e) ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>
                  <span className="block text-[10px] uppercase text-muted-foreground">{rotulo[e.publico]}</span>{e.name}
                </button>
              ))}
            </Card>
            {cfg[editando] && (
              <Card className="space-y-3 p-4">
                <h3 className="font-semibold">{evEdit.name}</h3>
                <div><label className="text-xs text-muted-foreground">Assunto</label>
                  <Input value={cfg[editando].assunto} onChange={e => set(editando, { assunto: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Mensagem</label>
                  <Textarea rows={6} value={cfg[editando].template} onChange={e => set(editando, { template: e.target.value })} /></div>
                <p className="text-xs text-muted-foreground">Variáveis: {evEdit.vars}</p>
                <div className="flex justify-end"><Button onClick={salvar} disabled={saving} className="gradient-bg gap-2"><Save className="h-4 w-4" /> Salvar template</Button></div>
              </Card>
            )}
          </div>
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
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="font-medium">{h.destinatario}</TableCell>
                    <TableCell className="text-sm" title={h.conteudo}>{h.evento}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {h.canal === 'E-mail' ? <Mail className="h-3 w-3" /> : h.canal === 'Sininho' ? <Bell className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {h.canal}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.status === 'sent' ? 'default' : 'destructive'}>{h.status === 'sent' ? 'Enviado' : 'Falhou'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!historico.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma notificação registrada ainda.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
