import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Layers, Loader2, Rows3, ScanBarcode, Search, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useMateriaisTubos } from '@/lib/tubos'
import { formatBirthBR } from '@/lib/attendanceDocHeader'
import { localizarNaSoroteca, useSorotecaAcesso, useSorotecaAcoes, useSorotecaAmostras, useSorotecaResumo } from '@/hooks/useSoroteca'
import { SorotecaGrid, SorotecaLegenda } from '@/components/lab/soroteca/SorotecaGrid'
import { SemAcessoSoroteca, StatusBadge } from '@/components/lab/soroteca/SorotecaDialogs'
import { PrateleiraAbas, prateleiraAtual } from '@/components/lab/soroteca/PrateleiraAbas'
import {
  bloqueioDoTubo, chavePosicao, enderecoPosicao, ocupadasDo, sugerirPosicao, tubosDoPedido,
  type EquipamentoSoroteca, type PedidoLocalizado, type PosicaoSoroteca, type TuboDoPedido,
} from '@/lib/soroteca'

type Posicao = PosicaoSoroteca
type ItemLote = { pedido: PedidoLocalizado; tubo: TuboDoPedido } & Posicao

export default function LabSorotecaEntradaPage() {
  const { user } = useAuth()
  const cad = useMateriaisTubos(user?.companyId)
  const acesso = useSorotecaAcesso()
  const pode = !!acesso?.ver
  const resumo = useSorotecaResumo(pode)
  const amostrasQ = useSorotecaAmostras(pode ? { situacao: 'armazenada' } : null, pode)
  const { armazenar } = useSorotecaAcoes()
  const [params] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pedidos, setPedidos] = useState<PedidoLocalizado[]>([])
  const [pedido, setPedido] = useState<PedidoLocalizado | null>(null)
  const [tubo, setTubo] = useState<TuboDoPedido | null>(null)
  const [eqAtual, setEqAtual] = useState<string | null>(null)
  const [pratAtual, setPratAtual] = useState<string | null>(null)
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const [modoLote, setModoLote] = useState(false)
  const [lote, setLote] = useState<ItemLote[]>([])
  const [loteSel, setLoteSel] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [presetUsado, setPresetUsado] = useState(false)

  const equipamentos = useMemo(() => (resumo.data?.equipamentos ?? []).filter(e => e.ativo), [resumo.data])
  const amostras = amostrasQ.data?.amostras ?? []
  const avisoDias = resumo.data?.aviso_dias ?? 7
  const eq = equipamentos.find(e => e.id === eqAtual) || equipamentos[0] || null
  const pr = prateleiraAtual(eq?.prateleiras, pratAtual)
  /** "Geladeira 01 > Prateleira 2 > B05" a partir dos ids. */
  const endereco = (pos: Posicao | null) => {
    if (!pos) return '—'
    const e = equipamentos.find(x => x.id === pos.equipamento_id)
    return enderecoPosicao(e?.nome, e?.prateleiras.find(x => x.id === pos.prateleira_id)?.nome, pos.linha, pos.coluna)
  }
  const irPara = (pos: { equipamento_id: string; prateleira_id: string }) => { setEqAtual(pos.equipamento_id); setPratAtual(pos.prateleira_id) }
  const escolherEquipamento = (e: EquipamentoSoroteca) => { setEqAtual(e.id); setPratAtual(null) }
  const tubos = useMemo(() => (pedido && cad.carregado ? tubosDoPedido(pedido) : []), [pedido, cad.carregado])

  useEffect(() => { if (!eqAtual && equipamentos[0]) setEqAtual(equipamentos[0].id) }, [equipamentos, eqAtual])
  useEffect(() => { inputRef.current?.focus() }, [acesso?.ver])

  const reservas = (exceto?: number) => lote.filter((_, i) => i !== exceto).map(i => ({ equipamento_id: i.equipamento_id, prateleira_id: i.prateleira_id, linha: i.linha, coluna: i.coluna }))

  /** Posição sugerida (ou a vinda do dashboard "Armazenar aqui", se ainda livre). */
  const sugerir = (t: TuboDoPedido): Posicao | null => {
    const pe = params.get('equipamento'), pp = params.get('prateleira'), pl = Number(params.get('linha')), pc = Number(params.get('coluna'))
    if (!presetUsado && pe && pp && pl && pc) {
      const p = equipamentos.find(x => x.id === pe)?.prateleiras.find(x => x.id === pp)
      if (p && pl <= p.linhas && pc <= p.colunas && !ocupadasDo(p.id, amostras, reservas()).has(chavePosicao(pl, pc))) {
        setPresetUsado(true)
        return { equipamento_id: pe, prateleira_id: pp, linha: pl, coluna: pc }
      }
    }
    return sugerirPosicao(equipamentos, amostras, t.bancadaId, reservas())
  }

  const escolherTubo = (p: PedidoLocalizado, t: TuboDoPedido) => {
    const bloq = bloqueioDoTubo(t)
    if (modoLote) {
      if (bloq) { toast.error(`${t.codigo}: ${bloq}`); return }
      if (lote.some(i => i.tubo.codigo === t.codigo)) { toast.info(`${t.codigo} já está no lote`); return }
      const s = sugerir(t)
      if (!s) { toast.error('Não há posição livre nos equipamentos ativos'); return }
      setLote(l => [...l, { pedido: p, tubo: t, ...s }])
      setLoteSel(lote.length)
      irPara(s)
      limparBusca()
      return
    }
    setPedido(p)
    setTubo(t)
    if (!bloq) {
      const s = sugerir(t)
      setPosicao(s)
      if (s) irPara(s)
    } else setPosicao(null)
  }

  const limparBusca = () => {
    setTermo(''); setPedidos([]); setPedido(null); setTubo(null); setPosicao(null); setAviso(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const buscar = async () => {
    const t = termo.trim()
    if (t.length < 2) return
    if (!cad.carregado) { toast.info('Carregando o cadastro de tubos, tente de novo em instantes'); return }
    setBuscando(true); setAviso(null); setPedido(null); setTubo(null); setPosicao(null)
    try {
      const r = await localizarNaSoroteca(t)
      setPedidos(r.pedidos)
      if (!r.pedidos.length) { setAviso('Nenhuma amostra ou pedido encontrado com esse código ou nome.'); return }
      if (r.modo === 'tubo' && r.pedidos.length === 1 && r.pedidos[0].tubo_indice) {
        const p = r.pedidos[0]
        const tb = tubosDoPedido(p).find(x => x.indice === p.tubo_indice)
        if (tb) { escolherTubo(p, tb); return }
      }
      if (r.pedidos.length === 1) setPedido(r.pedidos[0])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBuscando(false)
    }
  }

  const clicarCelula = (linha: number, coluna: number) => {
    if (!eq || !pr) return
    if (modoLote) {
      if (loteSel === null || !lote[loteSel]) return
      setLote(l => l.map((it, i) => (i === loteSel ? { ...it, equipamento_id: eq.id, prateleira_id: pr.id, linha, coluna } : it)))
      return
    }
    if (!tubo || bloqueioDoTubo(tubo)) return
    setPosicao({ equipamento_id: eq.id, prateleira_id: pr.id, linha, coluna })
  }

  const item = (t: TuboDoPedido, p: PedidoLocalizado, pos: Posicao) =>
    ({ order_id: p.order_id, tubo_indice: t.indice, exame_ids: t.exameIds, tubo_nome: t.nome,
       equipamento_id: pos.equipamento_id, prateleira_id: pos.prateleira_id, linha: pos.linha, coluna: pos.coluna })

  const confirmar = async () => {
    if (!pedido || !tubo || !posicao) return
    setSalvando(true)
    try {
      const [r] = await armazenar([item(tubo, pedido, posicao)])
      toast.success(`Amostra ${r.codigo_amostra} ${tubo.guardado?.status === 'armazenada' ? 'movida para' : 'armazenada em'} ${enderecoPosicao(r.equipamento_nome, r.prateleira_nome, r.linha, r.coluna)}`)
      limparBusca()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const confirmarLote = async () => {
    if (!lote.length) return
    setSalvando(true)
    try {
      const r = await armazenar(lote.map(i => item(i.tubo, i.pedido, i)))
      toast.success(`${r.length} amostra(s) armazenada(s)`)
      setLote([]); setLoteSel(null); limparBusca()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!pode) return <SemAcessoSoroteca />
  if (!acesso.armazenar) return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-lg font-semibold">Sem permissão para armazenar</p>
      <p className="mt-1 text-sm text-muted-foreground">Seu perfil pode consultar a Soroteca, mas não registrar entradas.</p>
    </div>
  )

  const bloqueio = tubo ? bloqueioDoTubo(tubo) : null
  const reservasPrat = pr ? lote.map((i, n) => ({ ...i, n })).filter(i => i.prateleira_id === pr.id).map(i => ({ linha: i.linha, coluna: i.coluna, rotulo: String(i.n + 1) })) : []
  const loteNaPrat = lote.reduce<Record<string, number>>((m, i) => ({ ...m, [i.prateleira_id]: (m[i.prateleira_id] ?? 0) + 1 }), {})
  const selLote = loteSel !== null ? lote[loteSel] : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entrada / Armazenar</h1>
          <p className="text-muted-foreground">Bipe a etiqueta do tubo e confirme a posição na soroteca</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Layers className="h-4 w-4 text-primary" />Modo lote
          <Switch checked={modoLote} onCheckedChange={v => { setModoLote(v); limparBusca() }} />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Localizar amostra</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="relative" onSubmit={e => { e.preventDefault(); void buscar() }}>
              <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-primary" />
              <Input ref={inputRef} value={termo} onChange={e => setTermo(e.target.value)} className="h-14 pl-12 pr-12 text-lg"
                placeholder="Bipe aqui: código da amostra, pedido ou nome" aria-label="Código da amostra, pedido ou nome do paciente" />
              <Button type="submit" size="icon" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2" disabled={buscando}>
                {buscando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              </Button>
            </form>
            {aviso && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">{aviso}</p>}

            {!pedido && pedidos.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pedidos.length} pedido(s) encontrados</p>
                {pedidos.map(p => (
                  <button key={p.order_id} type="button" onClick={() => setPedido(p)} className="w-full rounded-lg border border-border p-3 text-left text-sm hover:border-primary hover:bg-primary/5">
                    <span className="font-semibold">Pedido {p.protocolo}</span> · {p.patient_name}
                    <span className="block text-xs text-muted-foreground">Nascimento {formatBirthBR(p.patient_birth) || '—'}</span>
                  </button>
                ))}
              </div>
            )}

            {pedido && !tubo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm"><span className="font-semibold">Pedido {pedido.protocolo}</span> · {pedido.patient_name}</p>
                  {pedidos.length > 1 && <Button variant="ghost" size="sm" onClick={() => setPedido(null)}>Voltar</Button>}
                </div>
                <p className="text-xs text-muted-foreground">Escolha o tubo:</p>
                {!cad.carregado ? <Skeleton className="h-20" /> : tubos.map(t => {
                  const b = bloqueioDoTubo(t)
                  return (
                    <button key={t.indice} type="button" onClick={() => escolherTubo(pedido, t)} className={cn('w-full rounded-lg border border-border p-3 text-left text-sm hover:border-primary hover:bg-primary/5', b && 'opacity-60')}>
                      <span className="font-mono font-semibold">{t.codigo}</span> · {t.nome}
                      <span className="block text-xs text-muted-foreground">{t.examesNomes.join(', ')}</span>
                      {b && <span className="block text-xs text-destructive">{b}</span>}
                      {t.guardado?.status === 'armazenada' && <span className="block text-xs text-primary">Guardada em {enderecoPosicao(t.guardado.equipamento_nome, t.guardado.prateleira_nome, t.guardado.linha, t.guardado.coluna)}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {pedido && tubo && !modoLote && (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-lg font-bold">{tubo.codigo}</p>
                    <p className="text-xs text-muted-foreground">Código de barras {tubo.hash} · {tubo.nome}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={limparBusca} aria-label="Limpar"><X className="h-4 w-4" /></Button>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Paciente</dt><dd className="font-medium">{pedido.patient_name} · {formatBirthBR(pedido.patient_birth) || '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Pedido nº</dt><dd className="font-medium">{pedido.protocolo}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Bancada</dt><dd className="font-medium">{tubo.bancadaNome || '—'}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-muted-foreground">Exames</dt><dd>{tubo.examesNomes.join(', ')}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Status</dt><dd><StatusBadge status={tubo.status} /> <span className="text-xs text-muted-foreground">{tubo.liberados}/{tubo.total}</span></dd></div>
                  {tubo.temApoio && <div><dt className="text-xs text-muted-foreground">Apoio</dt><dd className="text-xs">Tem exame no apoio (fora do status)</dd></div>}
                </dl>
                {tubo.guardado?.status === 'armazenada' && (
                  <p className="rounded-lg bg-primary/10 p-2 text-sm text-primary">Já está em {enderecoPosicao(tubo.guardado.equipamento_nome, tubo.guardado.prateleira_nome, tubo.guardado.linha, tubo.guardado.coluna)}. Escolha a nova posição para mover.</p>
                )}
                {bloqueio && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">{bloqueio}</p>}
              </div>
            )}

            {modoLote && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lote ({lote.length})</p>
                {!lote.length && <p className="text-sm text-muted-foreground">Bipe as amostras em sequência. Cada uma recebe a próxima posição livre; clique numa linha e depois numa célula para trocar a posição.</p>}
                {lote.map((i, n) => (
                  <div key={i.tubo.codigo} onClick={() => setLoteSel(n)} role="button" tabIndex={0}
                    className={cn('flex items-center justify-between gap-2 rounded-lg border p-2 text-sm', loteSel === n ? 'border-success bg-success/10' : 'border-border')}>
                    <span><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-success-foreground">{n + 1}</span>
                      <span className="font-mono font-semibold">{i.tubo.codigo}</span> · {i.pedido.patient_name?.split(' ')[0]}</span>
                    <span className="flex items-center gap-2 text-xs">
                      {endereco(i)}
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Remover do lote"
                        onClick={ev => { ev.stopPropagation(); setLote(l => l.filter((_, k) => k !== n)); setLoteSel(null) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Escolher posição</CardTitle>
            <div className="flex flex-wrap gap-2">
              {equipamentos.map(e => (
                <Button key={e.id} size="sm" variant={eq?.id === e.id ? 'default' : 'outline'} onClick={() => escolherEquipamento(e)}>
                  <Rows3 className="mr-1.5 h-3.5 w-3.5" />{e.nome}{e.bancada_nome ? ` · ${e.bancada_nome}` : ''}
                </Button>
              ))}
            </div>
            {eq && <PrateleiraAbas prateleiras={eq.prateleiras} valor={pr?.id ?? null} onChange={setPratAtual} extra={loteNaPrat} />}
          </CardHeader>
          <CardContent className="space-y-3">
            {resumo.isLoading || amostrasQ.isLoading ? <Skeleton className="h-64" /> : !eq ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nenhum equipamento ativo. Cadastre um em Estrutura Física.</p>
            ) : !pr ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Este equipamento não tem prateleiras. Cadastre em Estrutura Física.</p>
            ) : (
              <>
                <SorotecaGrid prateleira={pr} equipamentoNome={eq.nome} amostras={amostras} avisoDias={avisoDias} modo="selecionar" comprimida={false}
                  selecionada={modoLote ? (selLote && selLote.prateleira_id === pr.id ? selLote : null) : (posicao?.prateleira_id === pr.id ? posicao : null)}
                  reservas={modoLote ? reservasPrat.filter(r => !(selLote && selLote.prateleira_id === pr.id && r.linha === selLote.linha && r.coluna === selLote.coluna)) : []}
                  onCelula={(l, c, a) => { if (!a) clicarCelula(l, c) }} />
                <SorotecaLegenda selecao />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 z-30 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
          {modoLote ? (
            <>
              <span>{lote.length} amostra(s) no lote</span>
              <Button variant="outline" onClick={() => { setLote([]); setLoteSel(null) }} disabled={!lote.length || salvando}>Limpar lote</Button>
              <Button onClick={confirmarLote} disabled={!lote.length || salvando}>{salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Confirmar tudo</Button>
            </>
          ) : (
            <>
              <span>Posição: <strong>{endereco(posicao)}</strong></span>
              {posicao && <Badge variant="outline" className="border-success/40 bg-success/10 text-success">✔ Selecionada</Badge>}
              <Button onClick={confirmar} disabled={!tubo || !posicao || !!bloqueio || salvando}>
                {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {tubo?.guardado?.status === 'armazenada' ? 'Confirmar mudança' : 'Confirmar armazenamento'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
