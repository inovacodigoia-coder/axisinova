import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, History, Loader2, ScanBarcode, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
  useSorotecaAcoes, useSorotecaAmostras, useSorotecaConfig, useSorotecaEstanteConferir, useSorotecaEstantesDescarte, useSorotecaResumo,
  type DescarteEstanteResultado,
} from '@/hooks/useSoroteca'
import { EstanteGrid } from './EstanteGrid'
import { EstanteHistoricoDialog, FolhaDescarteDialog } from './FolhaDescarte'
import { SorotecaLegenda } from './SorotecaGrid'
import {
  dataBR, gradeDaEstante, MOTIVOS_DESCARTE_ESTANTE, ondeEstaEstante, riscoDescarteTubo, rotuloPosicao, situacaoDescarteEstante,
  type DestinoEstante, type SituacaoDescarte,
} from '@/lib/soroteca'

const SITUACAO: Record<SituacaoDescarte, { label: string; cls: string }> = {
  vencida: { label: 'Vencida', cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
  vencendo: { label: 'Vencendo', cls: 'border-warning/40 bg-warning/15 text-warning' },
  no_prazo: { label: 'No prazo', cls: 'border-border text-muted-foreground' },
  vazia: { label: 'Vazia', cls: 'border-border text-muted-foreground' },
}

export function SituacaoEstanteBadge({ s }: { s: SituacaoDescarte }) {
  return <Badge variant="outline" className={SITUACAO[s].cls}>{SITUACAO[s].label}</Badge>
}

/**
 * Confirmação do descarte da estante inteira: resumo, aviso de tubos pendentes/no prazo
 * ("Descartar mesmo assim" + justificativa), responsável, motivo e o que fazer com a estante.
 */
export function DescartarEstanteDialog({ estanteId, onClose, onDone }: {
  estanteId: string | null
  onClose: () => void
  onDone?: (r: DescarteEstanteResultado) => void
}) {
  const { user } = useAuth()
  const conf = useSorotecaEstanteConferir(estanteId)
  const cfg = useSorotecaConfig(!!estanteId)
  const { descartarEstante } = useSorotecaAcoes()
  const [responsavel, setResponsavel] = useState('')
  const [motivo, setMotivo] = useState<string>(MOTIVOS_DESCARTE_ESTANTE[0])
  const [obs, setObs] = useState('')
  const [destino, setDestino] = useState<DestinoEstante>('reaproveitar')
  const [forcar, setForcar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [folhaId, setFolhaId] = useState<string | null>(null)

  const est = conf.data
  const tubos = est?.tubos ?? []
  const vazia = !!est && !tubos.length
  const riscos = useMemo(() => {
    const agora = Date.now()
    return tubos.map(t => ({ t, motivos: riscoDescarteTubo(t, agora) })).filter(x => x.motivos.length)
  }, [tubos])

  useEffect(() => {
    if (!estanteId) return
    setMotivo(MOTIVOS_DESCARTE_ESTANTE[0]); setObs(''); setForcar(false); setDestino('reaproveitar')
  }, [estanteId])
  useEffect(() => { if (estanteId) setResponsavel(cfg.data?.responsavel_descarte || user?.name || '') }, [estanteId, cfg.data?.responsavel_descarte, user?.name])
  useEffect(() => { if (vazia) setDestino('inativar') }, [vazia])

  const precisaObs = motivo === 'Outro' || riscos.length > 0
  const bloqueio = !est ? 'Carregando…'
    : !est.ativo ? 'Estante inativa'
    : !responsavel.trim() ? 'Informe o responsável'
    : riscos.length && !forcar ? 'Marque "Descartar mesmo assim"'
    : precisaObs && !obs.trim() ? (riscos.length ? 'Explique por que descartar mesmo assim' : 'Descreva o motivo')
    : null

  const confirmar = async () => {
    if (!est || bloqueio) return
    setSalvando(true)
    try {
      const r = await descartarEstante({ id: est.id, motivo, responsavel, observacao: obs, destino: vazia ? 'inativar' : destino, forcar: riscos.length > 0 && forcar })
      toast.success(r.tubos
        ? `Estante ${r.codigo}: ${r.tubos} tubo(s) descartado(s). ${r.destino === 'reaproveitar' ? 'A estante está vazia e pronta para uso.' : 'A estante foi inativada.'}`
        : `Estante ${r.codigo} inativada.`)
      onDone?.(r)
      onClose()
      if (r.descarte_id) setFolhaId(r.descarte_id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
    <FolhaDescarteDialog alvo={folhaId ? { descarteId: folhaId } : null} onClose={() => setFolhaId(null)} />
    <Dialog open={!!estanteId} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Descartar estante{est ? ` ${est.codigo}` : ''}</DialogTitle>
          <DialogDescription>
            {est ? `Estante ${est.codigo} — ${tubos.length} tubo${tubos.length === 1 ? '' : 's'} — ${ondeEstaEstante(est)}` : 'Carregando a estante…'}
          </DialogDescription>
        </DialogHeader>
        {conf.isLoading ? <Skeleton className="h-40" /> : conf.error ? (
          <p className="text-sm text-destructive">{(conf.error as Error).message}</p>
        ) : est && (
          <div className="space-y-4">
            {vazia && <p className="rounded-md border border-border bg-muted/50 p-3 text-sm">A estante está vazia: não há tubos para descartar. Você pode apenas inativá-la.</p>}
            {!!riscos.length && (
              <div className="space-y-2 rounded-md border-2 border-warning/60 bg-warning/10 p-3" role="alert">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning"><AlertTriangle className="h-4 w-4" />{riscos.length} tubo(s) com exame pendente ou dentro do prazo</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                  {riscos.map(({ t, motivos }) => (
                    <li key={t.id}><span className="font-mono font-semibold">{t.codigo_amostra}</span> ({rotuloPosicao(t.linha, t.coluna)}) · {t.patient_name || '—'} — {motivos.join('; ')}</li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 pt-1 text-sm font-medium">
                  <Checkbox checked={forcar} onCheckedChange={v => setForcar(v === true)} />Descartar mesmo assim
                </label>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="desc-est-resp">Responsável pelo descarte</Label><Input id="desc-est-resp" value={responsavel} maxLength={120} onChange={e => setResponsavel(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger aria-label="Motivo"><SelectValue /></SelectTrigger>
                <SelectContent>{MOTIVOS_DESCARTE_ESTANTE.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc-est-obs">{riscos.length ? 'Justificativa (obrigatória)' : motivo === 'Outro' ? 'Descreva o motivo (obrigatório)' : 'Observação (opcional)'}</Label>
              <Textarea id="desc-est-obs" rows={2} maxLength={500} value={obs} onChange={e => setObs(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Depois do descarte, a estante</Label>
              <RadioGroup value={vazia ? 'inativar' : destino} onValueChange={v => setDestino(v as DestinoEstante)} className="gap-2">
                {!vazia && (
                  <label className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm">
                    <RadioGroupItem value="reaproveitar" className="mt-0.5" />
                    <span><span className="font-medium">Reaproveitar</span><span className="block text-xs text-muted-foreground">Fica vazia, com o mesmo código e etiqueta, pronta para receber tubos.</span></span>
                  </label>
                )}
                <label className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm">
                  <RadioGroupItem value="inativar" className="mt-0.5" />
                  <span><span className="font-medium">Inativar</span><span className="block text-xs text-muted-foreground">Estante aposentada: some das listas de uso e continua no histórico.</span></span>
                </label>
              </RadioGroup>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={salvando || !!bloqueio} title={bloqueio || undefined}>
            {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {vazia ? 'Inativar estante' : 'Descartar estante'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

/** Aba "Por estante" do Descarte: bipe/lista das estantes, situação do prazo, grade e tubos, e o descarte da estante inteira. */
export function DescartePorEstante({ podeDescartar, ativa }: { podeDescartar: boolean; ativa: boolean }) {
  const q = useSorotecaEstantesDescarte(true)
  const resumo = useSorotecaResumo(true)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [soVencidas, setSoVencidas] = useState(false)
  const [aberta, setAberta] = useState<string | null>(null)
  const [descartar, setDescartar] = useState<string | null>(null)
  const [historico, setHistorico] = useState<{ id: string; codigo: string } | null>(null)
  const conf = useSorotecaEstanteConferir(aberta)
  const amostrasQ = useSorotecaAmostras(aberta ? { situacao: 'armazenada', equipamento_id: aberta } : null, !!aberta)

  const lista = useMemo(() => (q.data?.estantes ?? []).map(e => ({ e, s: situacaoDescarteEstante(e) })), [q.data])
  const visiveis = lista.filter(x => !soVencidas || x.s === 'vencida')
  const sel = lista.find(x => x.e.id === aberta) ?? null
  const grade = gradeDaEstante(resumo.data?.equipamentos.find(e => e.id === aberta))

  const bipar = () => {
    const c = codigo.trim().toUpperCase()
    setCodigo('')
    if (!c) return
    const achou = lista.find(x => x.e.codigo.toUpperCase() === c)
    if (!achou) { setErro(`Estante ${c} não encontrada ou inativa.`); return }
    setErro(null)
    setAberta(achou.e.id)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <form className="relative max-w-xl" onSubmit={e => { e.preventDefault(); bipar() }}>
            <ScanBarcode className={cn('pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2', erro ? 'text-destructive' : 'text-primary')} />
            <Input value={codigo} onChange={e => { setCodigo(e.target.value); if (erro) setErro(null) }} className={cn('h-12 pl-11', erro && 'border-destructive')}
              placeholder="Bipe a etiqueta da estante ou escolha na lista" aria-label="Etiqueta da estante" autoFocus={ativa} />
          </form>
          {erro && <p className="text-sm font-medium text-destructive" role="alert">{erro}</p>}
          <label className="flex w-fit items-center gap-2 text-sm"><Switch checked={soVencidas} onCheckedChange={setSoVencidas} />Só vencidas</label>
        </CardContent>
      </Card>

      {q.isLoading ? <Skeleton className="h-48 rounded-2xl" /> : q.error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {!visiveis.length ? <p className="py-8 text-center text-sm text-muted-foreground">{soVencidas ? 'Nenhuma estante com todos os tubos vencidos.' : 'Nenhuma estante ativa.'}</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estante</TableHead><TableHead>Onde está</TableHead><TableHead>Tubos</TableHead><TableHead>Tubo mais antigo</TableHead>
                    <TableHead>Situação</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map(({ e, s }) => (
                    <TableRow key={e.id} className={cn(aberta === e.id && 'bg-muted/60')}>
                      <TableCell className="font-mono font-semibold">{e.codigo}</TableCell>
                      <TableCell className="text-sm">{ondeEstaEstante(e)}</TableCell>
                      <TableCell>{e.tubos}{e.pendentes ? <span className="block text-[11px] text-destructive">{e.pendentes} com exame pendente</span> : null}</TableCell>
                      <TableCell className="text-sm">{dataBR(e.mais_antigo)}</TableCell>
                      <TableCell><SituacaoEstanteBadge s={s} /></TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" onClick={() => setAberta(e.id)}>Abrir</Button>
                        {podeDescartar && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDescartar(e.id)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />Descartar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {sel && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              Estante {sel.e.codigo} <SituacaoEstanteBadge s={sel.s} />
              <span className="text-sm font-normal text-muted-foreground">{ondeEstaEstante(sel.e)}</span>
            </CardTitle>
            <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistorico({ id: sel.e.id, codigo: sel.e.codigo })}><History className="mr-1.5 h-4 w-4" />Histórico</Button>
            {podeDescartar && <Button variant="destructive" size="sm" onClick={() => setDescartar(sel.e.id)}><Trash2 className="mr-1.5 h-4 w-4" />{sel.e.tubos ? 'Descartar estante' : 'Inativar estante'}</Button>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              {amostrasQ.isLoading || resumo.isLoading ? <Skeleton className="h-40" /> : grade
                ? <EstanteGrid grade={grade} amostras={amostrasQ.data?.amostras ?? []} />
                : <p className="text-sm text-muted-foreground">Estante sem grade cadastrada.</p>}
            </div>
            <SorotecaLegenda />
            {conf.isLoading ? <Skeleton className="h-24" /> : !conf.data?.tubos.length ? <p className="text-sm text-muted-foreground">Estante vazia.</p> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Posição</TableHead><TableHead>Amostra</TableHead><TableHead>Paciente</TableHead><TableHead>Exames pendentes</TableHead><TableHead>Vence em</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {conf.data.tubos.map(t => {
                    const vencida = !!t.validade && new Date(t.validade).getTime() < Date.now()
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono">{rotuloPosicao(t.linha, t.coluna)}</TableCell>
                        <TableCell className="font-mono font-semibold">{t.codigo_amostra}</TableCell>
                        <TableCell>{t.patient_name || '—'}</TableCell>
                        <TableCell className={cn('text-xs', t.pendentes.length && 'text-destructive')}>{t.pendentes.join(', ') || '—'}</TableCell>
                        <TableCell className={cn('text-xs font-medium', vencida && 'text-destructive')}>{dataBR(t.validade)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <DescartarEstanteDialog estanteId={descartar} onClose={() => setDescartar(null)} onDone={() => setAberta(null)} />
      <EstanteHistoricoDialog estante={historico} onClose={() => setHistorico(null)} />
    </div>
  )
}
