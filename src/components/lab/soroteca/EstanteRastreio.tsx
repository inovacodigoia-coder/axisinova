import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Archive, ArrowRightLeft, CheckCircle2, FileDown, FileText, Loader2, LogOut, PackageOpen, Plus, Power, Printer, Refrigerator, RotateCcw, Trash2, Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { buscarRastreioEstanteCompleto, useSorotecaEstanteRastreio } from '@/hooks/useSoroteca'
import { LabReportHeader, type LabReportHeaderProps } from '@/components/lab/LabReportHeader'
import { FolhaDescarteDialog, imprimirElemento, useCabecalhoLaboratorio } from '@/components/lab/soroteca/FolhaDescarte'
import {
  dataHoraBR, descreverEventoEstante, EVENTOS_POR_PAGINA, situacaoEstanteTexto, TIPO_EVENTO_ESTANTE,
  type CabecalhoEstante, type EventoEstante, type FiltrosRastreioEstante, type TipoEventoEstante,
} from '@/lib/soroteca'

const TODOS = '__todos__'
const ICONE: Record<TipoEventoEstante, typeof Archive> = {
  criada: Plus, etiqueta: Printer, folha: FileText, tubo_colocado: Archive, tubo_devolvido: Undo2, tubo_removido: LogOut,
  tubo_retirado: PackageOpen, tubo_descartado: Trash2, tubo_movido: ArrowRightLeft, finalizada: Refrigerator, reaberta: RotateCcw,
  descartada: Trash2, inativada: Power, reativada: CheckCircle2,
}
const COR: Partial<Record<TipoEventoEstante, string>> = {
  tubo_colocado: 'bg-primary/15 text-primary', tubo_devolvido: 'bg-primary/15 text-primary', tubo_movido: 'bg-primary/15 text-primary',
  tubo_removido: 'bg-warning/20 text-warning', tubo_retirado: 'bg-warning/20 text-warning',
  finalizada: 'bg-info/15 text-info', reaberta: 'bg-info/15 text-info',
  descartada: 'bg-destructive/10 text-destructive', tubo_descartado: 'bg-destructive/10 text-destructive', inativada: 'bg-muted text-muted-foreground',
}

function dadosCabecalho(e: CabecalhoEstante): [string, string][] {
  return [
    ['Dimensão', `${e.linhas} × ${e.colunas}`],
    ['Bancada', e.bancada_nome || '—'],
    ['Situação atual', situacaoEstanteTexto(e)],
    ['Tubos', String(e.tubos)],
    ['Criada', `${e.criada_por || 'usuário não registrado'} em ${dataHoraBR(e.criada_em)}`],
  ]
}

const celula: React.CSSProperties = { border: '0.5pt solid var(--document-ink)', padding: '3pt 5pt', textAlign: 'left', verticalAlign: 'top' }

/** PDF da estante: cabeçalho do laboratório, dados da estante e a linha do tempo completa. */
export function EstanteRastreioDocumento({ estante, eventos, header, filtrado }: {
  estante: CabecalhoEstante; eventos: EventoEstante[]; header: LabReportHeaderProps; filtrado?: boolean
}) {
  return (
    <div className="folha-descarte" style={{ background: 'var(--document-paper)', color: 'var(--document-ink)', fontFamily: "'Times New Roman', Georgia, serif", fontSize: '10pt', padding: '10mm', width: '210mm', maxWidth: '100%', boxSizing: 'border-box' }}>
      <LabReportHeader {...header} />
      <h2 style={{ fontSize: '13pt', fontWeight: 700, textAlign: 'center', margin: '0 0 8pt', textTransform: 'uppercase' }}>
        Rastreabilidade da estante {estante.codigo || estante.nome}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8pt' }}>
        <tbody>
          {dadosCabecalho(estante).map(([k, v]) => <tr key={k}><th style={{ ...celula, width: '28%' }}>{k}</th><td style={celula}>{v}</td></tr>)}
        </tbody>
      </table>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Data / hora', 'Usuário', 'Evento', 'Detalhes'].map(h => <th key={h} style={celula}>{h}</th>)}</tr></thead>
        <tbody>
          {eventos.map(e => {
            const d = descreverEventoEstante(e)
            return (
              <tr key={`${e.tipo}-${e.id}`}>
                <td style={{ ...celula, whiteSpace: 'nowrap' }}>{dataHoraBR(e.quando)}</td>
                <td style={celula}>{e.usuario_nome || '—'}</td>
                <td style={celula}>{d.titulo}</td>
                <td style={celula}>{d.linhas.join(' · ')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p style={{ marginTop: '8pt', fontSize: '8pt' }}>
        {eventos.length} evento(s){filtrado ? ' (com os filtros escolhidos)' : ''}. Emitido em {dataHoraBR(new Date().toISOString())}. O histórico da estante não pode ser editado nem apagado.
      </p>
    </div>
  )
}

/** Linha do tempo da estante (aba Estante da Rastreabilidade e botão "Histórico"). */
export function EstanteRastreioView({ estanteId, onAmostra }: { estanteId: string; onAmostra: (amostraId: string) => void }) {
  const [filtros, setFiltros] = useState<FiltrosRastreioEstante>({})
  const [pagina, setPagina] = useState(0)
  const [folha, setFolha] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [pdf, setPdf] = useState<{ estante: CabecalhoEstante; eventos: EventoEstante[] } | null>(null)
  const pdfRef = useRef<HTMLDivElement>(null)
  const { header } = useCabecalhoLaboratorio()
  useEffect(() => { setPagina(0); setFiltros({}) }, [estanteId])
  const q = useSorotecaEstanteRastreio(estanteId, filtros, pagina, EVENTOS_POR_PAGINA)
  const r = q.data
  const paginas = r ? Math.max(1, Math.ceil(r.total / EVENTOS_POR_PAGINA)) : 1
  const filtrado = !!(filtros.tipos?.length || filtros.usuario || filtros.de || filtros.ate)
  const mudar = (f: FiltrosRastreioEstante) => { setFiltros(f); setPagina(0) }

  // Monta o documento com a linha do tempo inteira e imprime (o navegador oferece "Salvar como PDF").
  useEffect(() => {
    if (!pdf) return
    const node = pdfRef.current?.querySelector('.folha-descarte') as HTMLElement | null
    if (!node) return
    imprimirElemento(node, `Rastreabilidade estante ${pdf.estante.codigo || ''}`.trim())
      .catch(e => toast.error(e instanceof Error ? e.message : 'Não foi possível exportar'))
      .finally(() => { setPdf(null); setExportando(false) })
  }, [pdf])
  const exportar = async () => {
    setExportando(true)
    try { const tudo = await buscarRastreioEstanteCompleto(estanteId, filtros); setPdf({ estante: tudo.estante, eventos: tudo.eventos }) }
    catch (e) { toast.error((e as Error).message); setExportando(false) }
  }

  if (q.isLoading && !r) return <Skeleton className="h-80 rounded-2xl" />
  if (q.error) return <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</p>
  if (!r) return null
  const e = r.estante

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              Estante <span className="font-mono">{e.codigo || e.nome}</span>
              <Badge variant="outline" className={cn(!e.ativo && 'border-border bg-muted text-muted-foreground', e.ativo && e.situacao === 'armazenada' && 'border-info/40 bg-info/10 text-info')}>
                {situacaoEstanteTexto(e)}
              </Badge>
            </CardTitle>
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {dadosCabecalho(e).filter(([k]) => k !== 'Situação atual').map(([k, v]) => (
                <div key={k}><dt className="inline">{k}: </dt><dd className="inline font-medium text-foreground">{v}</dd></div>
              ))}
            </dl>
          </div>
          <Button onClick={exportar} disabled={exportando} title="Abre a impressão; escolha “Salvar como PDF”">
            {exportando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}Exportar PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label>Tipo de evento</Label>
              <Select value={filtros.tipos?.[0] ?? TODOS} onValueChange={v => mudar({ ...filtros, tipos: v === TODOS ? undefined : [v as TipoEventoEstante] })}>
                <SelectTrigger aria-label="Tipo de evento"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {(Object.keys(TIPO_EVENTO_ESTANTE) as TipoEventoEstante[]).map(t => <SelectItem key={t} value={t}>{TIPO_EVENTO_ESTANTE[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Select value={filtros.usuario ?? TODOS} onValueChange={v => mudar({ ...filtros, usuario: v === TODOS ? undefined : v })}>
                <SelectTrigger aria-label="Usuário"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {[...r.usuarios].sort((a, b) => a.localeCompare(b)).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rastreio-est-de">De</Label>
              <Input id="rastreio-est-de" type="date" value={filtros.de ?? ''} onChange={ev => mudar({ ...filtros, de: ev.target.value || undefined })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rastreio-est-ate">Até</Label>
              <Input id="rastreio-est-ate" type="date" value={filtros.ate ?? ''} onChange={ev => mudar({ ...filtros, ate: ev.target.value || undefined })} />
            </div>
            <Button variant="ghost" disabled={!filtrado} onClick={() => mudar({})}>Limpar filtros</Button>
          </div>

          <p className="text-xs text-muted-foreground">{r.total.toLocaleString('pt-BR')} evento(s){filtrado ? ' com os filtros' : ''} · do mais novo para o mais antigo</p>
          {!r.eventos.length ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum evento{filtrado ? ' com esses filtros' : ''}.</p> : (
            <ol className={cn('relative space-y-4 border-l border-border pl-6', q.isFetching && 'opacity-60')}>
              {r.eventos.map(ev => {
                const d = descreverEventoEstante(ev)
                const Icone = ICONE[ev.tipo] ?? Archive
                const partes = ev.codigo_amostra ? d.titulo.split(ev.codigo_amostra) : null
                return (
                  <li key={`${ev.tipo}-${ev.id}`} className="relative">
                    <span className={cn('absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-card', COR[ev.tipo] ?? 'bg-muted text-foreground')}>
                      <Icone className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      <span className="text-muted-foreground">{dataHoraBR(ev.quando)}</span> · <span className="text-muted-foreground">{ev.usuario_nome || 'usuário não registrado'}</span> — {' '}
                      {partes && partes.length === 2 && ev.amostra_id ? (
                        <>{partes[0]}<button type="button" className="font-mono text-primary underline-offset-2 hover:underline" onClick={() => onAmostra(ev.amostra_id!)}
                          title="Abrir o histórico da amostra">{ev.codigo_amostra}</button>{partes[1]}</>
                      ) : d.titulo}
                    </p>
                    {d.linhas.map((l, j) => <p key={j} className="whitespace-pre-wrap text-xs text-muted-foreground">{l}</p>)}
                    {ev.descarte_id && (ev.tipo === 'descartada' || ev.tipo === 'folha') && (
                      <Button size="sm" variant="outline" className="mt-1.5 h-7" onClick={() => setFolha(ev.descarte_id)}><FileText className="mr-1 h-3.5 w-3.5" />Folha</Button>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
          {r.total > EVENTOS_POR_PAGINA && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">Página {pagina + 1} de {paginas}</span>
              <Button size="sm" variant="outline" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={pagina + 1 >= paginas} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Registrado no momento de cada ação, com o usuário logado. Ninguém pode editar ou apagar este histórico. Datas e horas no horário de Brasília.</p>
        </CardContent>
      </Card>
      <FolhaDescarteDialog alvo={folha ? { descarteId: folha } : null} reimpressao onClose={() => setFolha(null)} />
      {pdf && (
        <div ref={pdfRef} className="hidden" aria-hidden>
          <EstanteRastreioDocumento estante={pdf.estante} eventos={pdf.eventos} header={header} filtrado={filtrado} />
        </div>
      )}
    </div>
  )
}

/** Botão "Histórico" da estante (Estrutura Física e Descarte por estante): a mesma linha do tempo da Rastreabilidade. */
export function EstanteHistoricoDialog({ estante, onClose }: { estante: { id: string; codigo?: string | null } | null; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <Dialog open={!!estante} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico da estante {estante?.codigo || ''}</DialogTitle>
          <DialogDescription>Quem criou, colocou, removeu, retirou e devolveu cada tubo, finalizou, reabriu e descartou.</DialogDescription>
        </DialogHeader>
        {estante && <EstanteRastreioView estanteId={estante.id} onAmostra={id => { onClose(); navigate(`/app/soroteca/rastreabilidade?amostra=${id}`) }} />}
      </DialogContent>
    </Dialog>
  )
}
