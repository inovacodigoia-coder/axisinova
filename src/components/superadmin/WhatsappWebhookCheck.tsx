import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Inst { id: string; apelido: string | null; status: string }
interface Res { config: { enabled: boolean; events: string[]; aponta_para_axis: boolean }[]; erros: { quando: string | null; evento: string | null; status: number | null; erro: string }[]; erros_http: number; diagnostico?: { formato: string; chaves: string[]; message_type: string | null; button_or_listid: string | null; tamanho_texto: number | null; criado_em: string; motivo: string | null }[] }

const MOTIVOS: Record<string, string> = {
  processada: 'Resposta reconhecida e processada',
  proprio_numero: 'Toque feito no WhatsApp da clínica — ignorado',
  grupo: 'Mensagem de grupo — ignorada',
  sem_acao: 'Texto curto sem resposta reconhecida — ignorado',
  formato_desconhecido: 'Formato do botão não reconhecido — ignorado',
  sem_telefone: 'Telefone do paciente não identificado — ignorado',
}

/** Super Admin: lista números da empresa e mostra os últimos erros do webhook de cada um. */
export function WhatsappWebhookCheck({ companyId }: { companyId: string }) {
  const [insts, setInsts] = useState<Inst[]>([])
  const [aberto, setAberto] = useState<Inst | null>(null)
  const [res, setRes] = useState<Res | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    void supabase.from('whatsapp_instancias').select('id, apelido, status').eq('company_id', companyId).order('criado_em')
      .then(({ data }) => setInsts((data ?? []) as Inst[]))
  }, [companyId])

  const verificar = async (i: Inst) => {
    setAberto(i); setRes(null); setCarregando(true)
    const { data, error } = await supabase.functions.invoke('whatsapp-instancia', { body: { acao: 'verificar_webhook', instancia_id: i.id } })
    setCarregando(false)
    if (error || !data?.ok) { toast.error(data?.mensagem || 'Não foi possível verificar o webhook.'); setAberto(null); return }
    setRes(data.dados)
  }

  if (!insts.length) return null
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Webhook dos números</p>
      {insts.map(i => (
        <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
          <span className="text-sm text-foreground truncate">{i.apelido ?? 'sem apelido'} · {i.status}</span>
          <Button size="sm" variant="outline" onClick={() => void verificar(i)}>Verificar webhook</Button>
        </div>
      ))}
      <Dialog open={!!aberto} onOpenChange={v => { if (!v) setAberto(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Webhook — {aberto?.apelido ?? 'número'}</DialogTitle>
            <DialogDescription>Configuração atual e últimos erros registrados pelo servidor do WhatsApp.</DialogDescription>
          </DialogHeader>
          {carregando && <p className="text-sm text-muted-foreground">Consultando…</p>}
          {res && (
            <div className="space-y-3 text-sm">
              {res.config.length === 0
                ? <p className="text-destructive">Nenhum webhook configurado neste número.</p>
                : res.config.map((c, k) => (
                  <p key={k} className="text-foreground">
                    {c.enabled ? 'Ativo' : 'Desativado'} · {c.aponta_para_axis ? 'aponta para o Axis' : 'aponta para outro endereço'} · eventos: {c.events.join(', ') || '—'}
                  </p>
                ))}
              <div>
                <p className="font-medium text-foreground">Últimos erros</p>
                {res.erros_http === 404 && <p className="text-muted-foreground">O servidor não oferece histórico de erros.</p>}
                {res.erros_http !== 404 && res.erros.length === 0 && <p className="text-muted-foreground">Nenhum erro registrado.</p>}
                <ul className="mt-1 max-h-64 space-y-1 overflow-auto">
                  {res.erros.map((e, k) => (
                    <li key={k} className="rounded border border-border px-2 py-1 text-xs text-foreground">
                      {e.quando ? new Date(e.quando).toLocaleString('pt-BR') : '—'} · {e.evento ?? '—'} · {e.status ?? '—'} — {e.erro || 'sem detalhe'}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Respostas recebidas (7 dias)</p>
                {!res.events_messages_ok && res.config.length > 0 && !res.config.some(c => c.events.includes('messages')) && (
                  <p className="text-destructive">Este número não recebe respostas: use "Reconfigurar atualização automática".</p>
                )}
                {!res.diagnostico?.length && <p className="text-muted-foreground">Nenhuma resposta de paciente recebida ainda.</p>}
                <ul className="mt-1 max-h-64 space-y-1 overflow-auto">
                  {res.diagnostico?.map((d, k) => (
                    <li key={k} className="rounded border border-border px-2 py-1 text-xs text-foreground break-words">
                      <span className="block font-medium">{d.motivo ? (MOTIVOS[d.motivo] ?? d.motivo) : 'Resposta reconhecida'}</span>
                      {new Date(d.criado_em).toLocaleString('pt-BR')} · tipo {d.message_type ?? '—'} · botão {d.button_or_listid ?? '—'} · texto {d.tamanho_texto ?? 0} car.
                      <span className="block text-muted-foreground">Campos: {d.chaves.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
