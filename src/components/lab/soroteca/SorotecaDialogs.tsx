import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Archive, ArrowRightLeft, CheckCircle2, Eye, FlaskConical, LogOut, PackageOpen, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatBirthBR } from '@/lib/attendanceDocHeader'
import { useSorotecaAcoes, useSorotecaRastreio } from '@/hooks/useSoroteca'
import {
  dataBR, dataHoraBR, linhaDoTempo, MOTIVOS_RETIRADA, enderecoAmostra, STATUS_LABEL,
  type EventoLinhaDoTempo, type StatusResultado, type TipoEvento,
} from '@/lib/soroteca'

const ICONE: Record<TipoEvento, typeof Archive> = {
  coleta: FlaskConical, entrada: Archive, movimentacao: ArrowRightLeft, retirada: LogOut, consulta: Eye, descarte: Trash2, liberacao: CheckCircle2,
}
const COR_EVENTO: Record<TipoEvento, string> = {
  coleta: 'bg-muted text-foreground', entrada: 'bg-primary/15 text-primary', movimentacao: 'bg-primary/15 text-primary',
  retirada: 'bg-warning/20 text-warning', consulta: 'bg-warning/20 text-warning', descarte: 'bg-muted text-muted-foreground',
  liberacao: 'bg-info/15 text-info',
}

export function StatusBadge({ status, descartada }: { status: StatusResultado; descartada?: boolean }) {
  if (descartada) return <Badge variant="outline" className="border-border bg-muted text-muted-foreground">Descartada</Badge>
  const cls = status === 'liberado' ? 'border-info/40 bg-info/10 text-info' : status === 'parcial' ? 'border-warning/40 bg-warning/15 text-warning' : 'border-destructive/40 bg-destructive/10 text-destructive'
  return <Badge variant="outline" className={cls}>{STATUS_LABEL[status]}</Badge>
}

export function LinhaDoTempoView({ eventos }: { eventos: EventoLinhaDoTempo[] }) {
  if (!eventos.length) return <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {eventos.map((e, i) => {
        const Icone = ICONE[e.tipo]
        return (
          <li key={i} className="relative">
            <span className={cn('absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-card', COR_EVENTO[e.tipo])}>
              <Icone className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-semibold text-foreground"><span className="text-muted-foreground">{dataHoraBR(e.quando)}</span> — {e.titulo}</p>
            {e.linhas.map((l, j) => <p key={j} className="text-xs text-muted-foreground">{l}</p>)}
          </li>
        )
      })}
    </ol>
  )
}

/** Detalhes completos da amostra (pedido, exames e histórico). */
export function AmostraDetalheDialog({ amostraId, onClose, podeRetirar }: { amostraId: string | null; onClose: () => void; podeRetirar?: boolean }) {
  const q = useSorotecaRastreio(amostraId)
  const [retirar, setRetirar] = useState(false)
  const a = q.data?.amostra
  return (
    <>
      <Dialog open={!!amostraId && !retirar} onOpenChange={o => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{a ? `Amostra ${a.codigo_amostra}` : 'Amostra'}</DialogTitle>
            <DialogDescription>{a ? `${a.patient_name || '—'} · ${a.bancada_nome || 'Sem bancada'}` : 'Carregando…'}</DialogDescription>
          </DialogHeader>
          {q.isLoading ? <Skeleton className="h-48" /> : q.error ? (
            <p className="text-sm text-destructive">{(q.error as Error).message}</p>
          ) : a && q.data && (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted-foreground">Pedido</dt><dd className="font-medium">{a.protocolo || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Código de barras</dt><dd className="font-mono font-medium">{a.codigo_alfanumerico}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Nascimento</dt><dd className="font-medium">{formatBirthBR(a.patient_birth) || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Tubo</dt><dd className="font-medium">{a.tubo_nome || '—'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Posição</dt><dd className="font-medium">{enderecoAmostra(a) ?? (a.status === 'retirada' ? 'Retirada' : 'Descartada')}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Validade</dt><dd className="font-medium">{dataBR(a.validade)}</dd></div>
              </dl>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exames</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {q.data.exames.map(e => (
                    <li key={e.exam_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>{e.nome}</span>
                      <span className="text-xs text-muted-foreground">{e.status === 'released' ? `Liberado ${dataHoraBR(e.liberado_em)}` : e.status === 'cancelled' ? 'Cancelado' : 'Pendente'}</span>
                    </li>
                  ))}
                  {a.tem_apoio && <li className="px-3 py-2 text-xs text-muted-foreground">Este tubo também tem exame enviado ao laboratório de apoio (não entra no status).</li>}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico</p>
                <LinhaDoTempoView eventos={linhaDoTempo(q.data)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" asChild><Link to={`/app/soroteca/rastreabilidade?amostra=${amostraId}`}>Abrir rastreabilidade</Link></Button>
            {podeRetirar && a?.status === 'armazenada' && <Button variant="secondary" onClick={() => setRetirar(true)}><PackageOpen className="mr-1.5 h-4 w-4" />Registrar retirada</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RetiradaDialog amostra={retirar && a ? { id: a.id, codigo: a.codigo_amostra } : null} onClose={(ok) => { setRetirar(false); if (ok) onClose() }} />
    </>
  )
}

/** Retirada com motivo: libera a posição e registra no histórico. */
export function RetiradaDialog({ amostra, onClose }: { amostra: { id: string; codigo: string } | null; onClose: (ok: boolean) => void }) {
  const { retirar } = useSorotecaAcoes()
  const [motivo, setMotivo] = useState<string>('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const fechar = (ok: boolean) => { setMotivo(''); setObs(''); onClose(ok) }
  const confirmar = async () => {
    if (!amostra) return
    setSalvando(true)
    try {
      await retirar(amostra.id, motivo, obs)
      toast.success(`Retirada da amostra ${amostra.codigo} registrada. A posição ficou livre.`)
      fechar(true)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }
  return (
    <Dialog open={!!amostra} onOpenChange={o => !o && fechar(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar retirada</DialogTitle>
          <DialogDescription>Amostra {amostra?.codigo}. A posição fica livre e a retirada entra no histórico.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Escolha o motivo" /></SelectTrigger>
              <SelectContent>{MOTIVOS_RETIRADA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Observação {motivo === 'Outro' ? '(obrigatória)' : '(opcional)'}</Label>
            <Textarea value={obs} onChange={e => setObs(e.target.value)} maxLength={500} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!motivo || (motivo === 'Outro' && !obs.trim()) || salvando}>Confirmar retirada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Tela sem permissão (o servidor também bloqueia). */
export function SemAcessoSoroteca() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-lg font-semibold">Sem acesso à Soroteca</p>
      <p className="mt-1 text-sm text-muted-foreground">Peça ao administrador para liberar a Soroteca no seu perfil de acesso.</p>
    </div>
  )
}
