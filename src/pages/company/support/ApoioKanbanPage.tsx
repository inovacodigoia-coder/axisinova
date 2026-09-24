import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Copy, FileText, GripVertical, Hand, Lock, MoreHorizontal, Pencil, Plus, RefreshCw, Repeat, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { useApoioEntitlement, useApoioPermissions } from '@/hooks/useApoio'
import { ApoioBloqueadoAviso } from '@/pages/company/support/SupportOutsourcingPage'
import { STATUS_APOIO } from '@/components/apoio/contingencia/ApoioContingenciaTab'
import { KanbanCardDrawer } from '@/components/apoio/kanban/KanbanCardDrawer'
import { COLUNAS, EXCECOES, VISOES_PADRAO, corPrazo, ehExcecao, fmtData, nomeCurto, passaFiltro, type Filtros, type KCard, type Visao } from '@/components/apoio/kanban/kanbanShared'

const err = (e: any) => e?.message || String(e)
const CARD_H = 112
const TODOS_STATUS = Object.keys(STATUS_APOIO)

export default function ApoioKanbanPage() {
  const { user } = useAuth()
  const userId = (user as any)?.id as string | undefined
  const { allOrigins } = useCompanyContext() as any
  const apoio = useApoioEntitlement()
  const { has } = useApoioPermissions()
  const bloqueado = !apoio.loading && !apoio.enabled
  const podeVer = has('apoio.kanban.ver') || has('apoio.manual.operar') || has('apoio.remessa.operar')

  const [cards, setCards] = useState<KCard[]>([])
  const [loading, setLoading] = useState(false)
  const [verTodosLiberados, setVerTodosLiberados] = useState(false)
  const [visoes, setVisoes] = useState<Visao[]>([])
  const [visaoId, setVisaoId] = useState('excecoes')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<KCard | null>(null)
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([])
  const [labs, setLabs] = useState<{ id: string; nome: string }[]>([])
  const [editVisao, setEditVisao] = useState<Visao | null>(null)
  const [excluir, setExcluir] = useState<Visao | null>(null)
  const [arrastando, setArrastando] = useState<KCard | null>(null)
  const [permitidos, setPermitidos] = useState<string[]>([])
  const [mover, setMover] = useState<{ card: KCard; status: string; motivo: string } | null>(null)
  const [faixaAberta, setFaixaAberta] = useState(true)
  const dragTab = useRef<string | null>(null)

  const carregar = useCallback(async () => {
    if (!apoio.enabled || !podeVer) return
    setLoading(true)
    const { data, error } = await supabase.rpc('apoio_kanban_lista' as any, { _desde_liberado: verTodosLiberados ? '1900-01-01' : null })
    setLoading(false)
    if (error) return toast.error(err(error))
    setCards((data as any) || [])
  }, [apoio.enabled, podeVer, verTodosLiberados])

  const carregarVisoes = useCallback(async () => {
    const { data } = await supabase.from('apoio_visao_kanban').select('*').order('ordem')
    setVisoes(((data as any) || []).map((v: any) => ({ ...v, filtros: v.filtros || {} })))
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    if (!apoio.companyId) return
    carregarVisoes()
    supabase.from('profiles').select('id, full_name').eq('company_id', apoio.companyId).order('full_name')
      .then(({ data }) => setUsuarios(((data as any) || []).map((u: any) => ({ id: u.id, nome: u.full_name || 'Usuário' }))))
    supabase.from('apoio_laboratorio').select('id, nome').order('nome').then(({ data }) => setLabs((data as any) || []))
  }, [apoio.companyId, carregarVisoes])

  // Realtime
  const timer = useRef<any>(null)
  useEffect(() => {
    if (!apoio.enabled || !apoio.companyId) return
    const ch = supabase.channel('apoio-kanban')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apoio_pedido_exame', filter: `company_id=eq.${apoio.companyId}` }, () => {
        clearTimeout(timer.current); timer.current = setTimeout(() => carregar(), 600)
      }).subscribe()
    return () => { clearTimeout(timer.current); supabase.removeChannel(ch) }
  }, [apoio.enabled, apoio.companyId, carregar])

  // mantém o drawer com dados atualizados
  useEffect(() => { if (aberto) { const n = cards.find(c => c.id === aberto.id); if (n && n !== aberto) setAberto(n) } }, [cards]) // eslint-disable-line

  const todasVisoes = [...VISOES_PADRAO, ...visoes]
  const visao = todasVisoes.find(v => v.id === visaoId) || VISOES_PADRAO[0]
  const f: Filtros = visao.filtros

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return cards.filter(c => passaFiltro(c, f, userId) && (!t || [c.paciente_nome, c.pedido_numero, c.pedido_protocolo, c.exame_nome, c.exame_codigo, c.cod_ped_apoio, ...(c.cod_barras || [])]
      .some(v => String(v || '').toLowerCase().includes(t))))
  }, [cards, f, userId, busca])

  const contadores = useMemo(() => ({
    no_prazo: filtrados.filter(c => c.situacao_prazo === 'no_prazo' || c.situacao_prazo === 'vence_amanha').length,
    hoje: filtrados.filter(c => c.situacao_prazo === 'vence_hoje').length,
    atrasados: filtrados.filter(c => c.situacao_prazo === 'atrasado').length,
    excecoes: filtrados.filter(ehExcecao).length,
  }), [filtrados])

  const onBuscaEnter = () => {
    const t = busca.trim().toLowerCase()
    if (!t) return
    const achado = cards.filter(c => (c.cod_barras || []).some(b => b.toLowerCase() === t) || c.cod_ped_apoio?.toLowerCase() === t || c.pedido_numero?.toLowerCase() === t)
    if (achado.length === 1) { setAberto(achado[0]); setBusca('') }
    else if (!achado.length && !filtrados.length) toast.error('Nenhum exame encontrado para este código')
  }

  // Arrastar
  const iniciarArraste = async (c: KCard) => {
    setArrastando(c)
    const { data } = await supabase.rpc('apoio_proximos_status', { _de: c.status as any })
    setPermitidos(((data as any) || []) as string[])
  }
  const soltar = (colStatus: string[]) => {
    const c = arrastando; setArrastando(null)
    if (!c) return
    const alvo = colStatus.find(s => permitidos.includes(s))
    if (!alvo) return toast.error('Transição não permitida para esta coluna')
    setMover({ card: c, status: alvo, motivo: '' })
  }
  const confirmarMover = async () => {
    if (!mover) return
    const { error } = await supabase.rpc('apoio_manual_mudar_status' as any, { _pe: mover.card.id, _status: mover.status, _motivo: mover.motivo })
    if (error) return toast.error(err(error))
    toast.success(`Movido para ${STATUS_APOIO[mover.status]}`); setMover(null); carregar()
  }

  // Visões
  const salvarVisao = async (v: Visao) => {
    if (!v.nome.trim()) return toast.error('Informe o nome da visão')
    const payload: any = { nome: v.nome.trim(), filtros: v.filtros, compartilhada: v.compartilhada }
    const { error } = v.id
      ? await supabase.from('apoio_visao_kanban').update(payload).eq('id', v.id)
      : await supabase.from('apoio_visao_kanban').insert({ ...payload, company_id: apoio.companyId, dono_id: userId, ordem: visoes.length })
    if (error) return toast.error(v.compartilhada ? 'Só gestores podem salvar visões compartilhadas com a equipe' : err(error))
    toast.success('Visão salva'); setEditVisao(null); carregarVisoes()
  }
  const duplicar = (v: Visao) => setEditVisao({ ...v, id: '', nome: `${v.nome} (cópia)`, compartilhada: false, padrao: false })
  const removerVisao = async () => {
    if (!excluir) return
    const { error } = await supabase.from('apoio_visao_kanban').delete().eq('id', excluir.id)
    if (error) return toast.error(err(error))
    if (visaoId === excluir.id) setVisaoId('todos')
    setExcluir(null); carregarVisoes()
  }
  const reordenar = async (destId: string) => {
    const src = dragTab.current; dragTab.current = null
    if (!src || src === destId) return
    const lista = [...visoes]; const i = lista.findIndex(v => v.id === src); const j = lista.findIndex(v => v.id === destId)
    if (i < 0 || j < 0) return
    const [m] = lista.splice(i, 1); lista.splice(j, 0, m)
    setVisoes(lista.map((v, k) => ({ ...v, ordem: k })))
    const res = await Promise.all(lista.map((v, k) => supabase.from('apoio_visao_kanban').update({ ordem: k }).eq('id', v.id)))
    if (res.some(r => r.error)) toast.error('Algumas visões não puderam ser reordenadas (sem permissão)')
  }

  const soExcecoes = !!f.excecoes

  return (
    <TooltipProvider>
      <div className="space-y-4 p-6">
        {bloqueado && <ApoioBloqueadoAviso />}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kanban Apoio</h1>
            <p className="text-sm text-muted-foreground">Acompanhe cada exame enviado ao apoio até a liberação</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={carregar} disabled={loading}><RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar</Button>
            <Button className="gradient-bg text-white" disabled={bloqueado} onClick={() => setEditVisao({ id: '', nome: '', filtros: {}, compartilhada: false, dono_id: userId || null, ordem: 0 })}><Plus className="mr-1 h-4 w-4" />Nova visão</Button>
          </div>
        </div>

        {!bloqueado && !podeVer && <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Você não tem a permissão “Ver o Kanban Apoio”.</div>}

        <div className="flex flex-wrap items-center gap-1 border-b border-border">
          {todasVisoes.map(v => (
            <div key={v.id} draggable={!v.padrao} onDragStart={() => { dragTab.current = v.id }} onDragOver={e => !v.padrao && e.preventDefault()} onDrop={() => !v.padrao && reordenar(v.id)}
              className={`group flex items-center gap-1 rounded-t-lg px-3 py-2 text-sm ${visaoId === v.id ? 'border-b-2 border-primary font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {!v.padrao && <GripVertical className="h-3 w-3 cursor-grab opacity-40" />}
              <button onClick={() => setVisaoId(v.id)}>{v.nome}</button>
              {!v.padrao && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button aria-label="Opções da visão" className="opacity-50 hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setEditVisao(v)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicar(v)}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setExcluir(v)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {v.padrao && <DropdownMenu>
                <DropdownMenuTrigger asChild><button aria-label="Opções da visão" className="opacity-0 group-hover:opacity-60"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                <DropdownMenuContent><DropdownMenuItem onClick={() => duplicar(v)}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && onBuscaEnter()} placeholder="Paciente, nº do pedido, código de barras ou exame" className="pl-9" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-success">No prazo {contadores.no_prazo}</span> · <span className="text-warning">Vence hoje {contadores.hoje}</span> · <span className="text-destructive">Atrasados {contadores.atrasados}</span> · Exceções {contadores.excecoes}
          </p>
        </div>

        {!soExcecoes && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUNAS.map(col => {
              const lista = filtrados.filter(c => col.status.includes(c.status))
              const pode = !arrastando || col.status.some(s => permitidos.includes(s))
              return (
                <div key={col.key} onDragOver={e => pode && e.preventDefault()} onDrop={() => soltar(col.status)}
                  className={`flex w-64 shrink-0 flex-col rounded-2xl border border-border bg-muted/40 transition-opacity ${arrastando && !pode ? 'opacity-30' : ''}`}>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="rounded-full bg-background px-2 text-xs">{lista.length}</span>
                  </div>
                  <ColunaVirtual itens={lista} render={c => <Cartao c={c} onOpen={() => setAberto(c)} onDragStart={() => iniciarArraste(c)} onDragEnd={() => setArrastando(null)} />} />
                  {col.key === 'liberado_local' && <button className="px-3 pb-2 text-left text-xs text-primary underline" onClick={() => setVerTodosLiberados(v => !v)}>{verTodosLiberados ? 'mostrar só últimos 7 dias' : 'ver todos'}</button>}
                </div>
              )
            })}
          </div>
        )}

        <div className="rounded-2xl border border-destructive/30 bg-destructive/5">
          <button className="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-destructive" onClick={() => setFaixaAberta(o => !o)}>
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />EXCEÇÕES ({contadores.excecoes})</span>
            {faixaAberta || soExcecoes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {(faixaAberta || soExcecoes) && (
            <div className="flex gap-3 overflow-x-auto px-3 pb-3">
              {EXCECOES.map(ex => {
                const lista = filtrados.filter(ex.test)
                return (
                  <div key={ex.key} className="flex w-64 shrink-0 flex-col rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between px-3 py-2"><span className="text-sm font-semibold">{ex.label}</span><span className="rounded-full bg-muted px-2 text-xs">{lista.length}</span></div>
                    <ColunaVirtual itens={lista} altura={soExcecoes ? 520 : 300} render={c => <Cartao c={c} onOpen={() => setAberto(c)} mostrarStatus />} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <KanbanCardDrawer card={aberto} companyId={apoio.companyId} usuarios={usuarios} onClose={() => setAberto(null)} onChanged={carregar}
        onMudarStatus={(c, s) => setMover({ card: c, status: s, motivo: '' })} />

      <Dialog open={!!mover} onOpenChange={o => !o && setMover(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mover para “{mover && STATUS_APOIO[mover.status]}”</DialogTitle></DialogHeader>
          <Label>Motivo*</Label>
          <Textarea value={mover?.motivo || ''} onChange={e => setMover(m => m && { ...m, motivo: e.target.value })} placeholder="Ex.: confirmado no portal do apoio" />
          {mover && ['pendencia_tecnica', 'nova_coleta'].includes(mover.status) && <p className="text-xs text-muted-foreground">Para pendência técnica ou nova coleta com detalhamento, use a aba Contingência › Status manual, ou “Abrir recoleta”.</p>}
          <DialogFooter><Button variant="outline" onClick={() => setMover(null)}>Voltar</Button><Button disabled={!mover?.motivo.trim()} onClick={confirmarMover}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {editVisao && <VisaoDialog visao={editVisao} labs={labs} origens={allOrigins || []} onClose={() => setEditVisao(null)} onSave={salvarVisao} />}

      <Dialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir a visão “{excluir?.nome}”?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Só o filtro salvo é apagado; nenhum exame é alterado.</p>
          <DialogFooter><Button variant="outline" onClick={() => setExcluir(null)}>Voltar</Button><Button variant="destructive" onClick={removerVisao}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

function ColunaVirtual({ itens, render, altura = 560 }: { itens: KCard[]; render: (c: KCard) => JSX.Element; altura?: number }) {
  const [top, setTop] = useState(0)
  const virtual = itens.length > 100
  const ini = virtual ? Math.max(0, Math.floor(top / CARD_H) - 5) : 0
  const fim = virtual ? Math.min(itens.length, ini + Math.ceil(altura / CARD_H) + 10) : itens.length
  return (
    <div className="overflow-y-auto px-2 pb-2" style={{ maxHeight: altura }} onScroll={e => virtual && setTop((e.target as HTMLDivElement).scrollTop)}>
      {!itens.length && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Nenhum exame</p>}
      <div style={virtual ? { height: itens.length * CARD_H, position: 'relative' } : undefined}>
        {itens.slice(ini, fim).map((c, k) => (
          <div key={c.id} style={virtual ? { position: 'absolute', top: (ini + k) * CARD_H, left: 0, right: 0, height: CARD_H } : { height: CARD_H }} className="pb-2">{render(c)}</div>
        ))}
      </div>
    </div>
  )
}

function Cartao({ c, onOpen, onDragStart, onDragEnd, mostrarStatus }: { c: KCard; onOpen: () => void; onDragStart?: () => void; onDragEnd?: () => void; mostrarStatus?: boolean }) {
  const p = corPrazo(c)
  const arrastavel = !!onDragStart && c.apoio_manual
  const corpo = (
    <div draggable={arrastavel} onDragStart={arrastavel ? onDragStart : undefined} onDragEnd={onDragEnd} onClick={onOpen}
      className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card p-2 pl-3 text-xs shadow-sm hover:border-primary/50">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${p.barra}`} />
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-sm font-semibold">{nomeCurto(c.paciente_nome)}</span>
        {c.responsavel_nome && <span title={c.responsavel_nome} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{c.responsavel_nome.slice(0, 1).toUpperCase()}</span>}
      </div>
      <span className="truncate text-muted-foreground">Pedido {c.pedido_numero || c.pedido_protocolo} · {c.apoio_nome}</span>
      <span className="truncate">{c.exame_nome}{c.exame_codigo ? ` (${c.exame_codigo})` : ''}</span>
      {mostrarStatus && <span className="truncate text-muted-foreground">{STATUS_APOIO[c.status]}</span>}
      {c.acao_pendente && <span className="truncate text-warning">✋ {c.acao_pendente}</span>}
      <div className="mt-auto flex items-center justify-between">
        <span className={p.cls}>{p.texto}{c.prazo_previsto ? ` · ${fmtData(c.prazo_previsto)}` : ''}</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {c.tem_pdf && <FileText className="h-3 w-3" aria-label="Tem PDF" />}
          {c.tem_pendencia && <AlertTriangle className="h-3 w-3 text-warning" aria-label="Pendência" />}
          {(c.apoio_manual || c.modo === 'manual') && <Hand className="h-3 w-3" aria-label="Modo manual" />}
          {c.retificado && <Repeat className="h-3 w-3" aria-label="Retificado" />}
          {c.critico && <span className="font-bold text-destructive" aria-label="Crítico">!</span>}
          {!c.apoio_manual && onDragStart && <Lock className="h-3 w-3 opacity-40" />}
        </span>
      </div>
    </div>
  )
  if (!onDragStart || c.apoio_manual) return corpo
  return <Tooltip><TooltipTrigger asChild>{corpo}</TooltipTrigger><TooltipContent>Status atualizado pela integração. Para alterar à mão, ative o modo manual do apoio</TooltipContent></Tooltip>
}

function VisaoDialog({ visao, labs, origens, onClose, onSave }: { visao: Visao; labs: { id: string; nome: string }[]; origens: any[]; onClose: () => void; onSave: (v: Visao) => void }) {
  const [v, setV] = useState<Visao>(visao)
  const setF = (p: Partial<Filtros>) => setV(x => ({ ...x, filtros: { ...x.filtros, ...p } }))
  const st = v.filtros.status || []
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{v.id ? 'Editar visão' : 'Nova visão'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome*</Label><Input value={v.nome} onChange={e => setV({ ...v, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Apoio</Label>
              <Select value={v.filtros.apoio_id || 'all'} onValueChange={x => setF({ apoio_id: x === 'all' ? undefined : x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todos</SelectItem>{labs.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Unidade</Label>
              <Select value={v.filtros.unidade_id || 'all'} onValueChange={x => setF({ unidade_id: x === 'all' ? undefined : x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas</SelectItem>{origens.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Criados de</Label><Input type="date" value={v.filtros.desde || ''} onChange={e => setF({ desde: e.target.value || undefined })} /></div>
            <div><Label>até</Label><Input type="date" value={v.filtros.ate || ''} onChange={e => setF({ ate: e.target.value || undefined })} /></div>
          </div>
          <div><Label>Status</Label>
            <div className="mt-1 grid grid-cols-2 gap-1">{TODOS_STATUS.filter(s => s !== 'cancelado').map(s => (
              <label key={s} className="flex items-center gap-2 text-xs"><Checkbox checked={st.includes(s)} onCheckedChange={c => setF({ status: c ? [...st, s] : st.filter(x => x !== s) })} />{STATUS_APOIO[s]}</label>))}</div></div>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!v.filtros.atrasados} onCheckedChange={c => setF({ atrasados: !!c })} />Somente atrasados</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!v.filtros.meus} onCheckedChange={c => setF({ meus: !!c })} />Somente meus</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!v.filtros.excecoes} onCheckedChange={c => setF({ excecoes: !!c })} />Mostrar só a faixa de exceções</label>
          <label className="flex items-center justify-between text-sm">Compartilhada com a equipe<Switch checked={v.compartilhada} onCheckedChange={c => setV({ ...v, compartilhada: c })} /></label>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(v)}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
