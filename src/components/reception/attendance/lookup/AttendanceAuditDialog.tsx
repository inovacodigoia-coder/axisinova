import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

type Event = { id: string; acao: string; usuario_nome: string; created_at: string; antes: unknown; depois: unknown; total: number }
const actions: Record<string, string> = { insert: 'Inclusão', update: 'Alteração', delete: 'Remoção', cadastro: 'Pedido cadastrado', digitacao: 'Resultado digitado', liberacao: 'Resultado liberado', impressao: 'Documento impresso', substituicao_aparelho: 'Valor substituído pelo aparelho', status_apoio: 'Status no apoio', mudar_origem: 'Origem alterada', correcao: 'Horário de coleta corrigido', confirmacao: 'Coleta confirmada', programacao: 'Coleta programada' }
const labels: Record<string, string> = { campos: 'Alterações', fonte: 'Registro', exame: 'Exame', lab_guides: 'Guias / exames', status: 'Status', value: 'Valor', collected: 'Coletado', collectedAt: 'Horário da coleta', collectedBy: 'Colhedor', typed_by: 'Digitado por', released_by: 'Liberado por', attendance_orders: 'Pedido', lab_exam_results: 'Resultado', lab_result_values: 'Parâmetro', origin_name: 'Origem', convenio_name: 'Convênio', delivery_date: 'Previsão de entrega' }
function readable(value: unknown): string {
 if (value == null) return '—'
 if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
 if (Array.isArray(value)) return value.map(readable).join('\n')
 if (typeof value === 'object') return Object.entries(value).map(([key, val]) => `${labels[key] || key}: ${readable(val)}`).join('\n')
 return labels[String(value)] || String(value)
}
export function AttendanceAuditDialog({ orderId, orderNumber, onClose }: { orderId: string; orderNumber: string; onClose: () => void }) {
 const [events, setEvents] = useState<Event[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [offset, setOffset] = useState(0)
 const [refresh, setRefresh] = useState(0)
 const [search, setSearch] = useState('')
 useEffect(() => {
  let active = true
  setLoading(true); setError('')
  supabase.rpc('atendimento_auditoria_lista', { _pedido: orderId, _limite: 50, _offset: offset }).then(({ data, error: failure }) => {
   if (!active) return
   if (failure) setError(failure.message)
   else setEvents(previous => offset === 0 ? (data || []) : [...previous, ...(data || [])])
   setLoading(false)
  })
  return () => { active = false }
 }, [orderId, offset, refresh])
 const shown = events.filter(event => `${event.usuario_nome} ${actions[event.acao] || event.acao} ${readable(event.antes)} ${readable(event.depois)}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
 return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
  <DialogContent className="max-w-5xl max-h-[85dvh] flex flex-col">
   <DialogHeader><DialogTitle>Auditoria do atendimento · {orderNumber}</DialogTitle><DialogDescription>Histórico registrado · horário de Brasília. Alterações antigas sem registro não podem ser recuperadas.</DialogDescription></DialogHeader>
   <div className="flex gap-2"><Input aria-label="Buscar na auditoria" placeholder="Buscar usuário, ação ou exame" value={search} onChange={e => setSearch(e.target.value)} /><Button variant="outline" size="icon" aria-label="Atualizar auditoria" disabled={loading} onClick={() => { setOffset(0); setRefresh(v => v + 1) }}><RefreshCw className="h-4 w-4" /></Button></div>
   {error && <div role="alert" className="text-destructive">Não foi possível carregar a auditoria: {error}<Button variant="link" onClick={() => setRefresh(v => v + 1)}>Tentar novamente</Button></div>}
   <div className="overflow-auto flex-1 min-h-0 space-y-3">
    {shown.map(event => <article key={event.id} className="border-b border-border pb-3">
     <div className="flex flex-wrap justify-between gap-2"><strong>{actions[event.acao] || event.acao}</strong><time className="text-sm text-muted-foreground">{new Date(event.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time></div>
     <div className="text-sm text-muted-foreground mb-2">{event.usuario_nome}</div>
     <div className="grid sm:grid-cols-2 gap-3 text-xs"><div><span className="font-semibold">Antes</span><pre className="whitespace-pre-wrap break-words font-sans mt-1">{readable(event.antes)}</pre></div><div><span className="font-semibold">Depois / detalhes</span><pre className="whitespace-pre-wrap break-words font-sans mt-1">{readable(event.depois)}</pre></div></div>
    </article>)}
    {!loading && !error && shown.length === 0 && <p className="text-muted-foreground py-6 text-center">Nenhum registro encontrado.</p>}
    {loading && <div role="status" className="flex items-center justify-center gap-2 py-4"><Loader2 className="h-4 w-4 animate-spin" />Carregando auditoria…</div>}
   </div>
   <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground"><span>{events.length} de {events[0]?.total || 0} registros</span>{events.length < Number(events[0]?.total || 0) && <Button variant="outline" disabled={loading} onClick={() => setOffset(events.length)}>Carregar mais</Button>}<Button variant="outline" onClick={onClose}>Fechar</Button></div>
  </DialogContent>
 </Dialog>
}