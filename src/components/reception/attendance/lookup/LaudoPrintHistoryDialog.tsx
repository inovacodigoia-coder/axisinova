import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

type PrintExam = { id?: string; codigo?: string; nome?: string }
type PrintEvent = { id: string; tipo: 'laudo' | 'documento'; acao: string; usuario_nome: string; created_at: string; exames: PrintExam[]; detalhe: string | null }

export const LAUDO_PRINT_ACTIONS: Record<string, string> = {
  abrir: 'Clicou em Imprimir Laudo',
  imprimir: 'Imprimiu o laudo',
  download: 'Baixou o laudo em PDF',
}

export function LaudoPrintHistoryDialog({ orderId, orderNumber, onClose }: { orderId: string; orderNumber: string; onClose: () => void }) {
  const [events, setEvents] = useState<PrintEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    ;(supabase.rpc as any)('laudo_impressao_lista', { _pedido: orderId }).then(({ data, error: failure }: any) => {
      if (!active) return
      if (failure) setError(failure.message)
      else setEvents((data || []) as PrintEvent[])
      setLoading(false)
    })
    return () => { active = false }
  }, [orderId, refresh])

  const label = (e: PrintEvent) => e.tipo === 'documento' ? 'Documento impresso' : (LAUDO_PRINT_ACTIONS[e.acao] || e.acao)
  const term = search.toLocaleLowerCase('pt-BR')
  const shown = events.filter(e => `${e.usuario_nome} ${label(e)} ${e.detalhe || ''} ${(e.exames || []).map(x => `${x.codigo} ${x.nome}`).join(' ')}`.toLocaleLowerCase('pt-BR').includes(term))

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico de impressões · {orderNumber}</DialogTitle>
          <DialogDescription>Cada clique em Imprimir Laudo, impressão e download do laudo · horário de Brasília. Impressões anteriores a este registro não aparecem.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input aria-label="Buscar no histórico de impressões" placeholder="Buscar usuário ou exame" value={search} onChange={e => setSearch(e.target.value)} />
          <Button variant="outline" size="icon" aria-label="Atualizar histórico" disabled={loading} onClick={() => setRefresh(v => v + 1)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <div role="alert" className="text-destructive text-sm">
            Não foi possível carregar o histórico: {error}
            <Button variant="link" onClick={() => setRefresh(v => v + 1)}>Tentar novamente</Button>
          </div>
        )}
        <div className="overflow-auto flex-1 min-h-0 space-y-3">
          {shown.map(e => (
            <article key={e.id} className="border-b border-border pb-3">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{label(e)}</strong>
                <time className="text-sm text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time>
              </div>
              <div className="text-sm text-muted-foreground mb-2">Usuário: {e.usuario_nome}</div>
              {e.tipo === 'documento' ? (
                <div className="text-xs">{e.detalhe}</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(e.exames || []).map((x, i) => (
                    <Badge key={`${x.id}-${i}`} variant="secondary" className="font-normal">
                      {x.codigo ? <span className="font-semibold mr-1">{x.codigo}</span> : null}{x.nome}
                    </Badge>
                  ))}
                </div>
              )}
            </article>
          ))}
          {!loading && !error && shown.length === 0 && <p className="text-muted-foreground py-6 text-center">Nenhuma impressão registrada.</p>}
          {loading && <div role="status" className="flex items-center justify-center gap-2 py-4"><Loader2 className="h-4 w-4 animate-spin" />Carregando histórico…</div>}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{events.length} registro(s)</span>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
