import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Layers, Loader2, Lock, MinusCircle, PackageCheck, Plus, Printer, RotateCcw, Rows3, ScanBarcode, Trash2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import { useMateriaisTubos } from '@/lib/tubos'
import { localizarNaSoroteca, mensagemErro, useSorotecaAcesso, useSorotecaAcoes, useSorotecaAmostras, useSorotecaResumo } from '@/hooks/useSoroteca'
import { EstanteGrid } from '@/components/lab/soroteca/EstanteGrid'
import { SorotecaLegenda } from '@/components/lab/soroteca/SorotecaGrid'
import { SemAcessoSoroteca } from '@/components/lab/soroteca/SorotecaDialogs'
import { FinalizarEstanteDialog, NovaEstanteDialog, type NovaEstanteDados } from '@/components/lab/soroteca/EstanteDialogs'
import { DescartarEstanteDialog } from '@/components/lab/soroteca/DescarteEstante'
import { imprimirEtiquetaEquipamento } from '@/lib/sorotecaEtiqueta'
import {
  bloqueioDoTubo, ehEstante, enderecoGuardado, erroCodigoEstante, estanteDoCodigo, gradeDaEstante, localDaEstante, ocupadasDo,
  percentualOcupacao, podeRemoverNaEntrada, proximaPosicaoEstante, rotuloPosicao, sugerirCodigoEstante, tubosDoPedido,
  type AmostraSoroteca, type EquipamentoSoroteca, type PedidoLocalizado, type TuboDoPedido,
} from '@/lib/soroteca'

type Ultimo = { pedido: PedidoLocalizado; tubo: TuboDoPedido; linha: number; coluna: number }
/** Tubo escolhido com clique na grade (o cartão mostra ele em vez do último bipado). */
type Selecionado = Ultimo & { amostra: AmostraSoroteca }
type Erro = { texto: string; novaEstante?: boolean; reativar?: EquipamentoSoroteca }

export default function LabSorotecaEntradaPage() {
  const { user } = useAuth()
  const cad = useMateriaisTubos(user?.companyId)
  const { workbenches } = useRegisters()
  const bancadas = useMemo(() => (workbenches || []).filter((w: any) => w.isActive !== false && w.tipo !== 'apoio'), [workbenches])
  const acesso = useSorotecaAcesso()
  const pode = !!acesso?.ver
  const resumo = useSorotecaResumo(pode)
  const amostrasQ = useSorotecaAmostras(pode ? { situacao: 'armazenada' } : null, pode)
  const acoes = useSorotecaAcoes()
  const [params, setParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const [termo, setTermo] = useState('')
  const [erro, setErro] = useState<Erro | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [estanteId, setEstanteId] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<Ultimo | null>(null)
  /** Tubos guardados nesta sessão (acendem na hora, antes da lista do servidor voltar). */
  const [locais, setLocais] = useState<AmostraSoroteca[]>([])
  const [processando, setProcessando] = useState(false)
  const [nova, setNova] = useState<{ codigo: string; doBipe: boolean } | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  const [modoLote, setModoLote] = useState(false)
  const [outra, setOutra] = useState<string | null>(null)
  const [imprimindo, setImprimindo] = useState(false)
  const [descartando, setDescartando] = useState(false)
  const [reativando, setReativando] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [selecionado, setSelecionado] = useState<Selecionado | null>(null)
  const [remover, setRemover] = useState<AmostraSoroteca | null>(null)
  const [removendo, setRemovendo] = useState(false)
  const pedidoSel = useRef(0)

  const equipamentos = useMemo(() => resumo.data?.equipamentos ?? [], [resumo.data])
  const estante = equipamentos.find(e => e.id === estanteId) ?? null
  const grade = gradeDaEstante(estante)
  const visiveis = useMemo(() => {
    const doServidor = amostrasQ.data?.amostras ?? []
    const ids = new Set(doServidor.map(a => a.id))
    return [...doServidor, ...locais.filter(l => !ids.has(l.id))]
  }, [amostrasQ.data, locais])
  const preenchidas = grade ? ocupadasDo(grade.id, visiveis).size : 0
  const total = grade ? grade.linhas * grade.colunas : 0
  const emPreenchimento = equipamentos.filter(e => ehEstante(e) && e.ativo && e.situacao !== 'armazenada')

  // estado mais recente para a fila de bipes (leitor dispara vários códigos seguidos)
  const atual = useRef({ equipamentos, estante, visiveis })
  atual.current = { equipamentos, estante, visiveis }
  const fila = useRef<string[]>([])
  const rodando = useRef(false)
  const focar = () => setTimeout(() => inputRef.current?.focus(), 0)
  const limparSelecao = () => { pedidoSel.current++; setSelId(null); setSelecionado(null) }

  useEffect(() => { focar() }, [acesso?.ver])

  const abrirEstante = async (est: EquipamentoSoroteca) => {
    if (!est.ativo) { setErro({ texto: `Estante inativa: ${est.codigo} não recebe tubos.`, reativar: est }); return }
    const g = gradeDaEstante(est)
    if (g && ocupadasDo(g.id, atual.current.visiveis).size >= g.linhas * g.colunas) {
      setErro({ texto: `A estante ${est.codigo} está cheia (${g.linhas * g.colunas} posições). Crie uma nova estante.`, novaEstante: true })
      return
    }
    if (est.situacao === 'armazenada') {
      const r = await acoes.abrirEstante(est.id)
      if (r.aberta) setAviso(`Estante ${est.codigo} retirada de ${r.de} para receber tubos. Ao finalizar, escolha onde guardar.`)
    } else setAviso(null)
    atual.current.estante = est
    setEstanteId(est.id)
    setUltimo(null)
    limparSelecao()
  }

  // Vindo do Dashboard ("Abrir na Entrada"): ?estante=<id>
  useEffect(() => {
    const id = params.get('estante')
    if (!id || !equipamentos.length || !acesso?.armazenar) return
    const est = equipamentos.find(e => e.id === id && ehEstante(e))
    setParams({}, { replace: true })
    if (est) void abrirEstante(est).catch(e => setErro({ texto: mensagemErro(e) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, equipamentos.length, acesso?.armazenar])

  const processar = async (bruto: string) => {
    const codigo = bruto.trim()
    if (codigo.length < 2) return
    setErro(null)
    limparSelecao()
    const { equipamentos: eqs, estante: ativa } = atual.current

    // 1) etiqueta de estante
    let est = estanteDoCodigo(eqs, codigo)
    if (!est && !ativa && !erroCodigoEstante(codigo)) est = estanteDoCodigo((await resumo.refetch()).data?.equipamentos ?? [], codigo)
    if (est) { await abrirEstante(est); return }

    // 2) etiqueta de tubo
    if (!cad.carregado) { setErro({ texto: 'Carregando o cadastro de tubos; bipe de novo em instantes.' }); return }
    const r = await localizarNaSoroteca(codigo)
    const p = r.modo === 'tubo' && r.pedidos.length === 1 ? r.pedidos[0] : null
    const t = p?.tubo_indice ? tubosDoPedido(p).find(x => x.indice === p.tubo_indice) ?? null : null
    if (!ativa) {
      if (t) { setErro({ texto: 'Bipe primeiro a etiqueta da estante; depois os tubos.' }); return }
      if (!erroCodigoEstante(codigo)) { setNova({ codigo: codigo.toUpperCase(), doBipe: true }); return }
      setErro({ texto: 'Código não reconhecido: não é uma estante nem uma amostra.' })
      return
    }
    if (!p || !t) {
      setErro({ texto: r.modo === 'pedido' ? 'Esse é o número do pedido: bipe a etiqueta do tubo.' : `Amostra não encontrada (${codigo}).` })
      return
    }
    const bloq = bloqueioDoTubo(t)
    if (bloq) { setErro({ texto: `${t.codigo}: ${bloq}` }); return }
    if (t.guardado?.status === 'armazenada') {
      setErro({ texto: `Amostra ${t.codigo} já está armazenada em ${enderecoGuardado(t.guardado, eqs)}.` })
      return
    }
    const pos = proximaPosicaoEstante(ativa, atual.current.visiveis)
    if (!pos) { setErro({ texto: `A estante ${ativa.codigo} está cheia. Clique em Finalizar ou crie uma nova estante.`, novaEstante: true }); return }
    const [res] = await acoes.armazenar([{ order_id: p.order_id, tubo_indice: t.indice, exame_ids: t.exameIds, tubo_nome: t.nome, equipamento_id: ativa.id, ...pos }])
    const guardada: AmostraSoroteca = {
      id: res.id, codigo_amostra: t.codigo, codigo_alfanumerico: t.hash, order_id: p.order_id, tubo_indice: t.indice, protocolo: p.protocolo,
      patient_name: p.patient_name, workbench_id: t.bancadaId, bancada_nome: t.bancadaNome, tubo_nome: t.nome, exames_nomes: t.examesNomes,
      tem_apoio: t.temApoio, coletada_em: null, validade: null, status: 'armazenada', equipamento_id: ativa.id, equipamento_nome: ativa.nome,
      prateleira_id: pos.prateleira_id, prateleira_nome: '', linha: pos.linha, coluna: pos.coluna, armazenada_em: new Date().toISOString(),
      descartada_em: null, total: t.total, liberados: t.liberados, status_resultado: t.status,
    }
    atual.current.visiveis = [...atual.current.visiveis, guardada]
    setLocais(l => [...l, guardada])
    setUltimo({ pedido: p, tubo: t, linha: pos.linha, coluna: pos.coluna })
  }

  const rodarFila = async () => {
    if (rodando.current) return
    rodando.current = true
    setProcessando(true)
    try {
      while (fila.current.length) {
        const c = fila.current.shift()!
        try { await processar(c) } catch (e) { setErro({ texto: mensagemErro(e) }) }
      }
    } finally {
      rodando.current = false
      setProcessando(false)
      focar()
    }
  }

  const bipar = () => {
    const c = termo.trim()
    setTermo('')
    if (!c) return
    fila.current.push(c)
    void rodarFila()
  }

  const criarEstante = async (d: NovaEstanteDados) => {
    try {
      const id = await acoes.salvarEstante({ id: null, codigo: d.codigo, nome: '', linhas: d.linhas, colunas: d.colunas, workbench_id: d.workbench_id, ativo: true })
      const lista = (await resumo.refetch()).data?.equipamentos ?? []
      const est = lista.find(e => e.id === id)
      setNova(null)
      setErro(null)
      if (est) {
        atual.current.estante = est
        setEstanteId(est.id)
        setUltimo(null)
        setAviso(null)
        toast.success(`Estante ${est.codigo} criada. Bipe os tubos.`)
        if (d.imprimir) void imprimir(est)
      }
      focar()
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  const imprimir = async (e: EquipamentoSoroteca) => {
    setImprimindo(true)
    try { toast.success(await imprimirEtiquetaEquipamento(e)) } catch (err) { toast.error(mensagemErro(err)) } finally { setImprimindo(false); focar() }
  }

  const guardar = async (equipamentoId: string, prateleiraId: string) => {
    if (!estante) return
    try {
      const r = await acoes.guardarEstante(estante.id, equipamentoId, prateleiraId)
      const msg = `Estante ${estante.codigo} guardada em ${r.equipamento_nome} > ${r.prateleira_nome} (${r.tubos} tubo${r.tubos === 1 ? '' : 's'})`
      toast.success(msg)
      setFinalizando(false)
      setEstanteId(null); atual.current.estante = null
      setUltimo(null); setAviso(null); setErro(null); setLocais([])
      if (modoLote) setOutra(msg)
      else focar()
    } catch (e) {
      toast.error(mensagemErro(e))
    }
  }

  const reativar = async (est: EquipamentoSoroteca) => {
    setReativando(true)
    try {
      await acoes.reativarEstante(est.id)
      const nova = ((await resumo.refetch()).data?.equipamentos ?? []).find(e => e.id === est.id)
      setErro(null)
      toast.success(`Estante ${est.codigo} reativada.`)
      if (nova) await abrirEstante(nova)
    } catch (e) {
      setErro({ texto: mensagemErro(e) })
    } finally {
      setReativando(false)
      focar()
    }
  }

  const sair = () => { setEstanteId(null); atual.current.estante = null; setUltimo(null); limparSelecao(); setAviso(null); setErro(null); focar() }

  /** Clique num tubo da grade: seleciona (clicar de novo tira a seleção). O foco continua no bipe. */
  const selecionar = async (a: AmostraSoroteca) => {
    focar()
    if (selId === a.id) { limparSelecao(); return }
    const vez = ++pedidoSel.current
    setSelId(a.id)
    setSelecionado(null)
    try {
      const r = await localizarNaSoroteca(a.codigo_amostra)
      if (vez !== pedidoSel.current) return
      const p = r.pedidos.find(x => x.order_id === a.order_id) ?? null
      const t = p ? tubosDoPedido(p).find(x => x.indice === a.tubo_indice) ?? null : null
      if (!p || !t || !a.linha || !a.coluna) { setErro({ texto: `Não foi possível carregar os dados do tubo ${a.codigo_amostra}.` }); limparSelecao(); return }
      setSelecionado({ pedido: p, tubo: t, linha: a.linha, coluna: a.coluna, amostra: a })
    } catch (e) {
      if (vez === pedidoSel.current) { setErro({ texto: mensagemErro(e) }); limparSelecao() }
    } finally {
      focar()
    }
  }

  const confirmarRemocao = async () => {
    if (!remover) return
    setRemovendo(true)
    try {
      const r = await acoes.removerTubo(remover.id)
      const id = remover.id
      atual.current.visiveis = atual.current.visiveis.filter(x => x.id !== id)
      setLocais(l => l.filter(x => x.id !== id))
      setUltimo(u => (u && u.pedido.order_id === remover.order_id && u.tubo.indice === remover.tubo_indice ? null : u))
      limparSelecao()
      setRemover(null)
      toast.success(`Tubo ${r.codigo} removido da posição ${r.posicao}. A posição ficou livre.`)
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setRemovendo(false)
      focar()
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

  // cartão: tubo selecionado na grade, ou o último bipado
  const cartao: Ultimo | null = selId ? selecionado : ultimo
  const t = cartao?.tubo
  const todosLiberados = !!t && t.total > 0 && t.liberados >= t.total
  const local = estante ? localDaEstante(estante) : null
  const amostraSel = selecionado ? (visiveis.find(v => v.id === selecionado.amostra.id) ?? selecionado.amostra) : null
  const pct = percentualOcupacao(preenchidas, total)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entrada / Armazenar</h1>
          <p className="text-muted-foreground">Bipe a etiqueta da estante e depois os tubos; cada tubo vai para a próxima posição livre</p>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <Layers className="h-4 w-4 text-primary" />Modo lote
          <Switch checked={modoLote} onCheckedChange={setModoLote} />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        {/* Painel esquerdo: bipe, tubo, ações e Finalizar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start">
          <Card className="rounded-lg shadow-sm">
            <CardContent className="space-y-3 pt-6">
              <form className="relative" onSubmit={e => { e.preventDefault(); bipar() }}>
                <ScanBarcode className={cn('pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2', erro ? 'text-destructive' : 'text-primary')} />
                <Input ref={inputRef} value={termo} onChange={e => { setTermo(e.target.value); if (erro) setErro(null) }} autoFocus
                  className={cn('h-14 pl-12 pr-12 text-lg', erro && 'border-2 border-destructive focus-visible:ring-destructive')}
                  placeholder={estante ? 'Bipe o tubo' : 'Bipe a etiqueta da estante'} aria-label="Campo de bipe" aria-invalid={!!erro} />
                {processando && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />}
              </form>
              {erro && (
                <div className="space-y-2" role="alert">
                  <p className="text-sm font-medium text-destructive">{erro.texto}</p>
                  {erro.reativar && (acesso.descartar || acesso.configurar) && (
                    <Button size="sm" variant="outline" disabled={reativando} onClick={() => void reativar(erro.reativar!)}>
                      {reativando ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}Reativar estante
                    </Button>
                  )}
                  {erro.novaEstante && <Button size="sm" variant="outline" onClick={() => setNova({ codigo: sugerirCodigoEstante(equipamentos), doBipe: false })}><Plus className="mr-1 h-3.5 w-3.5" />Nova estante</Button>}
                </div>
              )}
              {aviso && !erro && <p className="rounded-md bg-info/10 p-2 text-sm text-info">{aviso}</p>}

              {estante ? (
                <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                  <div>
                    <p className="font-semibold"><Rows3 className="mr-1 inline h-4 w-4 text-primary" />{estante.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {grade ? `${grade.linhas}×${grade.colunas} · A01–${rotuloPosicao(grade.linhas, grade.colunas)}` : ''}
                      {estante.bancada_nome ? ` · ${estante.bancada_nome}` : ''} · {local ? `Guardada em ${local}` : 'Em preenchimento'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={sair} aria-label="Trocar de estante"><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma estante aberta. Bipe a etiqueta da estante (ex.: E79002) ou crie uma nova.</p>
              )}
            </CardContent>
          </Card>

          {selId && !selecionado && (
            <Card className="rounded-lg shadow-sm"><CardContent className="space-y-2 pt-5"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-16" /></CardContent></Card>
          )}
          {t && cartao && (
            <Card className={cn('rounded-lg shadow-sm', selecionado && 'border-2 border-foreground/60')} aria-live="polite">
              <CardContent className="space-y-2 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  {selecionado && <Badge variant="outline">Selecionado</Badge>}
                  {todosLiberados && <Badge className="bg-success text-success-foreground hover:bg-success">Todos liberados ✓</Badge>}
                </div>
                <p className="text-lg font-semibold leading-tight">{cartao.pedido.patient_name || '—'}</p>
                <p className="font-mono text-sm">{t.codigo} <span className="text-xs text-muted-foreground">· {t.hash} · posição {rotuloPosicao(cartao.linha, cartao.coluna)}</span></p>
                <p className="text-xs text-muted-foreground">Bancada{t.bancadas.length === 1 ? '' : 's'}: {t.bancadas.join(', ') || '—'}</p>
                <ul className="space-y-1 pt-1">
                  {t.exames.map(e => (
                    <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{e.nome}</span>
                      <Badge variant="outline" className={e.liberado ? 'border-success/40 bg-success/15 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive'}>
                        <span className={cn('mr-1.5 h-2 w-2 rounded-full', e.liberado ? 'bg-success' : 'bg-destructive')} />{e.liberado ? 'Liberado' : 'Pendente'}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {t.temApoio && <p className="text-xs text-muted-foreground">Tem exame no laboratório de apoio (fora do status).</p>}
                {amostraSel && (podeRemoverNaEntrada(amostraSel) ? (
                  <Button variant="outline" size="sm" className="mt-1 w-full text-destructive" onMouseDown={e => e.preventDefault()} onClick={() => setRemover(amostraSel)}>
                    <MinusCircle className="mr-1.5 h-4 w-4" />Remover tubo
                  </Button>
                ) : (
                  <p className="mt-1 flex items-center gap-1.5 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 shrink-0" />Tubo já finalizado: retire pela <Link className="underline" to="/app/soroteca/consulta">Consulta de Amostras</Link>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setNova({ codigo: sugerirCodigoEstante(equipamentos), doBipe: false })}><Plus className="mr-1.5 h-4 w-4" />Nova estante</Button>
            {estante && <Button variant="outline" onClick={() => imprimir(estante)} disabled={imprimindo}>{imprimindo ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />}Reimprimir etiqueta</Button>}
            {estante && acesso.descartar && <Button variant="outline" className="text-destructive" onClick={() => setDescartando(true)}><Trash2 className="mr-1.5 h-4 w-4" />Descartar estante</Button>}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm"><span>{preenchidas} / {total} posições preenchidas</span>{total > 0 && <span className="text-muted-foreground">{pct}%</span>}</div>
            <Progress value={pct} className="h-2.5 bg-muted" aria-label="Posições preenchidas" />
          </div>

          <Button size="lg" className="w-full bg-info text-info-foreground hover:bg-info/90" disabled={!estante || preenchidas === 0} onClick={() => setFinalizando(true)}>
            <PackageCheck className="mr-2 h-5 w-5" />Finalizar
          </Button>
        </div>

        {/* Painel direito: grade da estante */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">{estante ? estante.nome : 'Estante'}</CardTitle>
            <SorotecaLegenda />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4">
              {resumo.isLoading || amostrasQ.isLoading ? <Skeleton className="h-64" /> : estante && grade ? (
                <EstanteGrid grade={grade} amostras={visiveis} atual={ultimo ? { linha: ultimo.linha, coluna: ultimo.coluna } : null}
                  selecionada={selId} onAmostra={a => void selecionar(a)} />
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <ScanBarcode className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Bipe a etiqueta da estante para começar</p>
                  {!!emPreenchimento.length && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Estantes em preenchimento:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {emPreenchimento.map(e => (
                          <Button key={e.id} size="sm" variant="outline" className="font-mono" onClick={() => void abrirEstante(e).catch(err => setErro({ texto: mensagemErro(err) })).finally(focar)}>
                            {e.codigo} · {e.ocupadas}/{e.capacidade}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!equipamentos.some(e => !ehEstante(e)) && (
                    <p className="text-xs text-muted-foreground">Ainda não há geladeira ou freezer: cadastre em <Link className="underline" to="/app/soroteca/estrutura">Estrutura Física</Link> para guardar as estantes.</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <NovaEstanteDialog aberto={!!nova} codigoInicial={nova?.codigo ?? ''} doBipe={!!nova?.doBipe} bancadas={bancadas}
        onClose={() => { setNova(null); focar() }} onCriar={criarEstante} />
      <FinalizarEstanteDialog estante={finalizando ? estante : null} preenchidas={preenchidas} total={total} equipamentos={equipamentos}
        onClose={() => { setFinalizando(false); focar() }} onConfirmar={guardar} />

      <DescartarEstanteDialog estanteId={descartando ? estante?.id ?? null : null} onClose={() => { setDescartando(false); focar() }}
        onDone={() => { setLocais([]); sair() }} />

      <Dialog open={!!remover} onOpenChange={o => { if (!o && !removendo) { setRemover(null); focar() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover tubo</DialogTitle>
            <DialogDescription>
              Remover o tubo {remover?.codigo_amostra} da posição {remover?.linha && remover?.coluna ? rotuloPosicao(remover.linha, remover.coluna) : '—'}? A posição fica livre e a remoção entra no histórico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRemover(null); focar() }} disabled={removendo}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void confirmarRemocao()} disabled={removendo}>
              {removendo ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <MinusCircle className="mr-1.5 h-4 w-4" />}Remover tubo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!outra} onOpenChange={o => { if (!o) { setOutra(null); focar() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" />Estante guardada</DialogTitle>
            <DialogDescription>{outra} Deseja começar outra estante agora?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOutra(null); focar() }}>Não, terminar</Button>
            <Button variant="outline" onClick={() => { setOutra(null); setNova({ codigo: sugerirCodigoEstante(equipamentos), doBipe: false }) }}><Plus className="mr-1 h-4 w-4" />Nova estante</Button>
            <Button onClick={() => { setOutra(null); focar() }}><ScanBarcode className="mr-1 h-4 w-4" />Bipar a próxima estante</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
