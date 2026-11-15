import { useState } from 'react'
import { format } from 'date-fns'
import { Cpu } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { usePainelAparelhoLog, usePainelAparelhos, type AparelhoPainel } from '@/hooks/usePainelOperacional'
import { haQuantoTempo, statusDoAparelho, STATUS_APARELHO_LABEL, type StatusAparelho } from '@/lib/painelOperacional'

const BOLINHA: Record<StatusAparelho, string> = {
  conectado: 'bg-success', aguardando: 'bg-warning', erro: 'bg-destructive', sem_comunicacao: 'bg-muted-foreground',
}
const TEXTO: Record<StatusAparelho, string> = {
  conectado: 'text-success', aguardando: 'text-warning', erro: 'text-destructive', sem_comunicacao: 'text-muted-foreground',
}

const RESULTADO_LOG: Record<string, string> = {
  processed: 'Recebido', error: 'Falhou', duplicate: 'Reenvio', ignored_older: 'Ignorado (mais antigo)',
}

function StatusBolinha({ status }: { status: StatusAparelho }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-full', BOLINHA[status])} />
      <span className={cn('text-xs font-semibold', TEXTO[status])}>{STATUS_APARELHO_LABEL[status]}</span>
    </span>
  )
}

function LogDialog({ aparelho, onClose }: { aparelho: AparelhoPainel | null; onClose: () => void }) {
  const log = usePainelAparelhoLog(aparelho?.equipment_id ?? null)
  return (
    <Dialog open={!!aparelho} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{aparelho?.nome} — últimas 10 mensagens</DialogTitle>
          <DialogDescription>Mensagens que o ServidorAisaxius enviou deste aparelho, da mais nova para a mais antiga.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          {log.isLoading ? <Skeleton className="h-32 w-full" /> : log.error ? (
            <p className="py-6 text-center text-sm text-destructive">Não foi possível carregar as mensagens agora.</p>
          ) : !log.data?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Este aparelho ainda não mandou nenhuma mensagem.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2">Data/hora</th><th className="px-2 py-2">Resultado</th><th className="px-2 py-2">Amostra</th>
                <th className="px-2 py-2">Exame</th><th className="px-2 py-2">Valor</th><th className="px-2 py-2">Detalhe</th>
              </tr></thead>
              <tbody>
                {log.data.map((l, i) => (
                  <tr key={i} className={cn('border-b border-border/60', l.status === 'error' && 'bg-destructive/5')}>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{format(new Date(l.criado_em), 'dd/MM HH:mm:ss')}</td>
                    <td className={cn('px-2 py-2 text-xs font-semibold', l.status === 'error' ? 'text-destructive' : l.status === 'processed' ? 'text-success' : 'text-muted-foreground')}>
                      {RESULTADO_LOG[l.status ?? ''] ?? l.status ?? '—'}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{l.amostra || '—'}</td>
                    <td className="px-2 py-2">{l.exame || l.codigo_teste || '—'}</td>
                    <td className="px-2 py-2 tabular-nums">{l.valor ?? '—'}</td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{l.mensagem || (l.protocolo ? `Pedido ${l.protocolo}` : '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

/** Card compacto: status de cada aparelho pela última mensagem recebida. */
export function StatusAparelhos({ agora, habilitado }: { agora: number; habilitado: boolean }) {
  const aparelhos = usePainelAparelhos(habilitado)
  const [aberto, setAberto] = useState<AparelhoPainel | null>(null)
  const lista = aparelhos.data ?? []

  return (
    <Card className="painel-bloco p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Cpu className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Status dos aparelhos</h2>
        <span className="painel-sem-impressao ml-auto text-[11px] text-muted-foreground">🟢 até 5 min · 🟡 5–30 min · 🔴 mais de 30 min sem mensagem</span>
      </div>
      {aparelhos.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div> : aparelhos.error ? (
        <p className="p-4 text-sm text-destructive">Não foi possível carregar os aparelhos agora. Tenta de novo sozinho em 60 segundos.</p>
      ) : !lista.length ? (
        <p className="p-4 text-sm text-muted-foreground">Nenhum aparelho ativo cadastrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="painel-tabela w-full text-sm">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Aparelho</th><th className="px-3 py-2">Bancada</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Última comunicação</th>
            </tr></thead>
            <tbody>
              {lista.map(a => {
                const status = statusDoAparelho(a.ultima_comunicacao, agora)
                return (
                  <tr key={a.equipment_id} className="cursor-pointer border-b border-border/60 hover:bg-muted/40" onClick={() => setAberto(a)} title="Ver últimas mensagens">
                    <td className="px-3 py-2 font-semibold">{a.nome}</td>
                    <td className="px-3 py-2">{a.bancada || '—'}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <StatusBolinha status={status} />
                        {a.ultimo_status === 'error' && <Badge variant="outline" className="border-destructive/50 text-[10px] text-destructive">última mensagem falhou</Badge>}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{haQuantoTempo(a.ultima_comunicacao, agora)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <LogDialog aparelho={aberto} onClose={() => setAberto(null)} />
    </Card>
  )
}
