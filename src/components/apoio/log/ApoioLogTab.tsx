import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle, Server, Globe, Building2, Laptop, Copy, RefreshCw, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useApoioPermissions } from '@/hooks/useApoio'
import { LinhaLog, TIPOS, LADOS, Lado, traduzir } from './traducaoLog'

const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
const hojeISO = () => new Date().toISOString().slice(0, 10)
const menos = (dias: number) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
const POR_PAG = 30

export function SituacaoIcone({ s }: { s: string }) {
  if (s === 'sucesso') return <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]"><CheckCircle2 className="h-4 w-4" />Sucesso</span>
  if (s === 'aviso') return <span className="inline-flex items-center gap-1 text-[hsl(38,92%,40%)]"><AlertTriangle className="h-4 w-4" />Aviso</span>
  return <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Erro</span>
}
const LADO_ICONE: Record<Lado, JSX.Element> = { nosso: <Laptop className="h-4 w-4" />, pardini: <Server className="h-4 w-4" />, rede: <Globe className="h-4 w-4" />, cadastro: <Building2 className="h-4 w-4" /> }

function useTabelaErros() {
  const [m, setM] = useState<Map<string, string>>(new Map())
  useEffect(() => { supabase.from('apoio_erro').select('codigo, mensagem').then(({ data }) => setM(new Map(((data as any) || []).map((e: any) => [String(e.codigo), e.mensagem])))) }, [])
  return m
}

/** Lista reaproveitada na aba e no histórico da remessa */
export function ListaLog({ linhas, erros, onAbrir, compacta }: { linhas: LinhaLog[]; erros: Map<string, string>; onAbrir: (l: LinhaLog) => void; compacta?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Data/hora</th>
            {!compacta && <th className="px-3 py-2 text-left">Apoio</th>}
            <th className="px-3 py-2 text-left">Operação</th>
            {!compacta && <th className="px-3 py-2 text-left">Origem</th>}
            <th className="px-3 py-2 text-left">Situação</th>
            <th className="px-3 py-2 text-left">Resumo</th>
            {!compacta && <th className="px-3 py-2 text-left">Remessa</th>}
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => {
            const t = traduzir(l, erros)
            return (
              <tr key={l.id} className="cursor-pointer border-t border-border hover:bg-muted/20" onClick={() => onAbrir(l)}>
                <td className="whitespace-nowrap px-3 py-2">{fmt(l.created_at)}</td>
                {!compacta && <td className="px-3 py-2">{l.apoio_nome}</td>}
                <td className="px-3 py-2">{TIPOS[l.tipo] || l.tipo}</td>
                {!compacta && <td className="px-3 py-2 text-xs">{l.origem === 'manual' ? `Manual${l.usuario_nome ? ` · ${l.usuario_nome}` : ''}` : l.origem === 'automatico' ? 'Automático' : '—'}</td>}
                <td className="whitespace-nowrap px-3 py-2 text-xs"><SituacaoIcone s={l.situacao} />{l.resolvido_em && <span className="ml-1 text-muted-foreground">(resolvido)</span>}</td>
                <td className="px-3 py-2">{t.resumo}{t.pendente && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">tradução pendente</span>}</td>
                {!compacta && <td className="px-3 py-2">{l.remessa_id ? <button className="text-primary hover:underline" onClick={e => { e.stopPropagation(); navigate(`/app/apoio/terceirizacao?aba=remessas&remessa=${l.remessa_id}`) }}>nº {l.remessa_numero ?? l.cod_lote}</button> : (l.cod_lote ? `lote ${l.cod_lote}` : '—')}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DetalheLog({ linha, erros, onClose, onChanged }: { linha: LinhaLog; erros: Map<string, string>; onClose: () => void; onChanged: () => void }) {
  const { has } = useApoioPermissions()
  const admin = has('apoio.laboratorio.gerenciar')
  const navigate = useNavigate()
  const t = traduzir(linha, erros)
  const [rep, setRep] = useState<{ vezes: number; desde: string } | null>(null)
  const [tec, setTec] = useState<any>(null)
  const [abrirTec, setAbrirTec] = useState(false)
  const [obs, setObs] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (linha.situacao !== 'sucesso') supabase.rpc('apoio_log_repeticoes' as any, { _id: linha.id }).then(({ data }) => { const r = (data as any)?.[0]; if (r) setRep({ vezes: Number(r.vezes), desde: r.desde }) })
  }, [linha])
  useEffect(() => {
    if (abrirTec && !tec && admin) supabase.rpc('apoio_log_tecnico' as any, { _id: linha.id }).then(({ data, error }) => error ? toast.error(error.message) : setTec((data as any)?.[0] || {}))
  }, [abrirTec, tec, admin, linha.id])

  const copiar = () => {
    const txt = [`Operação: ${tec?.operacao} (${TIPOS[linha.tipo] || linha.tipo})`, `Data: ${fmt(linha.created_at)}`, `HTTP: ${tec?.http_status ?? '—'} · ${tec?.duracao_ms ?? '—'} ms`, `Resumo: ${t.resumo}`, '', '--- Enviado ---', tec?.requisicao || '', '', '--- Recebido ---', tec?.resposta || tec?.erro || ''].join('\n')
    navigator.clipboard.writeText(txt).then(() => toast.success('Copiado para enviar ao suporte'))
  }
  const resolver = async () => {
    setOcupado(true)
    const { error } = await supabase.rpc('apoio_log_resolver' as any, { _id: linha.id, _obs: obs })
    setOcupado(false)
    if (error) return toast.error(error.message)
    toast.success('Marcado como resolvido'); onChanged(); onClose()
  }
  const reprocessar = async () => {
    setOcupado(true)
    const { data, error } = await supabase.functions.invoke('apoio-resultado', { body: { reprocessar_log_id: linha.id } })
    setOcupado(false)
    if (error || !(data as any)?.ok) return toast.error((data as any)?.motivo || 'Não foi possível reprocessar')
    toast.success('Resultado reprocessado'); onChanged()
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2">{TIPOS[linha.tipo] || linha.tipo} · <SituacaoIcone s={linha.situacao} /></DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{fmt(linha.created_at)} · {linha.apoio_nome} · {linha.origem === 'manual' ? `Manual${linha.usuario_nome ? ` (${linha.usuario_nome})` : ''}` : linha.origem === 'automatico' ? 'Automático' : 'Origem não registrada'}</p>
          <div><p className="text-xs font-semibold uppercase text-muted-foreground">O que aconteceu</p><p className="text-foreground">{t.resumo}</p></div>
          <div><p className="text-xs font-semibold uppercase text-muted-foreground">O que fazer</p><p className="text-foreground">{t.oQueFazer}</p></div>
          <div><p className="text-xs font-semibold uppercase text-muted-foreground">De que lado veio</p><p className="flex items-center gap-2 text-foreground">{LADO_ICONE[t.lado]}{LADOS[t.lado]}</p></div>
          {rep && rep.vezes > 1 && <p className="rounded-md bg-muted/50 p-2 text-xs">Este mesmo erro aconteceu <b>{rep.vezes} vezes</b> nos últimos 30 dias, desde {fmt(rep.desde)}.</p>}
          {linha.resolvido_em && <p className="rounded-md bg-[hsl(var(--success))]/10 p-2 text-xs">Resolvido em {fmt(linha.resolvido_em)}{linha.resolvido_obs ? `: ${linha.resolvido_obs}` : ''}</p>}

          <div className="flex flex-wrap gap-2">
            {linha.remessa_id && <Button size="sm" variant="outline" onClick={() => navigate(`/app/apoio/terceirizacao?aba=remessas&remessa=${linha.remessa_id}`)}>Abrir remessa</Button>}
            {t.lado === 'cadastro' && <Button size="sm" variant="outline" onClick={() => navigate('/app/apoio/terceirizacao?aba=laboratorios')}>Abrir cadastro do apoio</Button>}
            {admin && linha.tipo === 'resultados' && <Button size="sm" variant="outline" disabled={ocupado} onClick={reprocessar}><RefreshCw className="mr-1 h-4 w-4" />Reprocessar</Button>}
          </div>

          {admin && linha.situacao !== 'sucesso' && !linha.resolvido_em && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Textarea placeholder="Observação (opcional)" value={obs} onChange={e => setObs(e.target.value)} rows={2} />
              <Button size="sm" disabled={ocupado} onClick={resolver}>{ocupado && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Marcar como resolvido</Button>
            </div>
          )}

          {admin && (
            <div className="rounded-md border border-border">
              <button className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold" onClick={() => setAbrirTec(v => !v)}>
                Detalhe técnico <ChevronDown className={`h-4 w-4 transition-transform ${abrirTec ? 'rotate-180' : ''}`} />
              </button>
              {abrirTec && (
                <div className="space-y-2 border-t border-border p-3 text-xs">
                  {!tec ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                    <p>Operação SOAP: <b>{tec.operacao}</b> · HTTP {tec.http_status ?? '—'} · {tec.duracao_ms ?? '—'} ms</p>
                    <p className="font-semibold">Enviado (senha mascarada)</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">{tec.requisicao || '—'}</pre>
                    <p className="font-semibold">Recebido</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">{(tec.resposta || tec.erro || '—').slice(0, 20000)}</pre>
                    <Button size="sm" variant="outline" onClick={copiar}><Copy className="mr-1 h-4 w-4" />Copiar para o suporte</Button>
                  </>}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Seção "Histórico com o Pardini" dentro da remessa */
export function HistoricoRemessa({ remessaId }: { remessaId: string }) {
  const erros = useTabelaErros()
  const [linhas, setLinhas] = useState<LinhaLog[] | null>(null)
  const [aberta, setAberta] = useState<LinhaLog | null>(null)
  const carregar = useCallback(() => {
    supabase.rpc('apoio_log_lista' as any, { _ini: '2020-01-01', _fim: new Date(Date.now() + 60000).toISOString(), _remessa: remessaId, _limite: 100 })
      .then(({ data, error }) => setLinhas(error ? [] : ((data as any) || [])))
  }, [remessaId])
  useEffect(() => { carregar() }, [carregar])
  if (!linhas) return null
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Histórico com o Pardini</h3>
      {linhas.length ? <ListaLog linhas={linhas} erros={erros} onAbrir={setAberta} compacta /> : <p className="text-xs text-muted-foreground">Nenhuma comunicação com o apoio para esta remessa.</p>}
      {aberta && <DetalheLog linha={aberta} erros={erros} onClose={() => setAberta(null)} onChanged={carregar} />}
    </div>
  )
}

export function ApoioLogTab() {
  const [params, setParams] = useSearchParams()
  const erros = useTabelaErros()
  const ini = params.get('ini') || menos(7), fim = params.get('fim') || hojeISO()
  const apoio = params.get('apoio') || '', tipo = params.get('tipo') || '', sit = params.get('sit') || '', q = params.get('q') || ''
  const pag = Number(params.get('pag') || 0)
  const [busca, setBusca] = useState(q)
  const [linhas, setLinhas] = useState<LinhaLog[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [aberta, setAberta] = useState<LinhaLog | null>(null)
  const [apoios, setApoios] = useState<{ id: string; nome: string }[]>([])
  const [errosHoje, setErrosHoje] = useState(0)
  const [cursores, setCursores] = useState<any[]>([])

  const setP = (k: string, v: string) => setParams(p => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); if (k !== 'pag') n.delete('pag'); return n }, { replace: true })

  const carregar = useCallback(async () => {
    setCarregando(true)
    const fimTs = new Date(`${fim}T23:59:59`).toISOString()
    const { data, error } = await supabase.rpc('apoio_log_lista' as any, {
      _ini: new Date(`${ini}T00:00:00`).toISOString(), _fim: fimTs, _apoio: apoio || null, _tipo: tipo || null, _situacao: sit || null, _busca: q || null, _limite: POR_PAG, _offset: pag * POR_PAG,
    })
    setCarregando(false)
    if (error) { setErroCarga(error.message); setLinhas([]); return }
    setErroCarga(null); setLinhas((data as any) || [])
    const hoje = await supabase.rpc('apoio_log_lista' as any, { _ini: new Date(`${hojeISO()}T00:00:00`).toISOString(), _fim: new Date().toISOString(), _situacao: 'erro', _limite: 1 })
    setErrosHoje(Number((hoje.data as any)?.[0]?.total || 0))
    const { data: cs } = await supabase.from('apoio_cursor').select('apoio_id, rotina, ultimo_sucesso, ultimo_erro_em, resolvido_em')
    setCursores((cs as any) || [])
  }, [ini, fim, apoio, tipo, sit, q, pag])
  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { supabase.from('apoio_laboratorio').select('id, nome').order('nome').then(({ data }) => setApoios((data as any) || [])) }, [])

  const falhando = useMemo(() => cursores.filter(c => c.ultimo_erro_em && (!c.ultimo_sucesso || c.ultimo_erro_em > c.ultimo_sucesso) && (!c.resolvido_em || c.ultimo_erro_em > c.resolvido_em)), [cursores])
  const ultimoSucesso = useMemo(() => cursores.filter(c => c.ultimo_sucesso).sort((a, b) => String(b.ultimo_sucesso).localeCompare(String(a.ultimo_sucesso)))[0], [cursores])
  const total = Number(linhas[0]?.total || 0)
  const sel = 'h-9 rounded-md border border-input bg-background px-2 text-sm'

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <button className="rounded-xl border border-border bg-card p-4 text-left hover:border-destructive/50" onClick={() => setParams(() => new URLSearchParams({ aba: 'log', ini: hojeISO(), fim: hojeISO(), sit: 'erro' }), { replace: true })}>
          <p className="text-xs text-muted-foreground">Erros hoje</p><p className="text-2xl font-bold text-destructive">{errosHoje}</p>
        </button>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Última execução com sucesso</p>
          <p className="text-sm font-semibold text-foreground">{ultimoSucesso ? `${fmt(ultimoSucesso.ultimo_sucesso)}` : '—'}</p>
          {ultimoSucesso && <p className="text-xs text-muted-foreground">rotina: {ultimoSucesso.rotina}</p>}
        </div>
        <button className="rounded-xl border border-border bg-card p-4 text-left hover:border-destructive/50" onClick={() => setP('sit', 'nao_sucesso')}>
          <p className="text-xs text-muted-foreground">Rotinas com falha agora</p><p className="text-2xl font-bold text-foreground">{falhando.length}</p>
          {falhando.length > 0 && <p className="text-xs text-muted-foreground">{falhando.map(f => f.rotina).join(', ')}</p>}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">De<Input type="date" className="h-9 w-36" value={ini} onChange={e => setP('ini', e.target.value)} /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" className="h-9 w-36" value={fim} onChange={e => setP('fim', e.target.value)} /></label>
        <select className={sel} value={apoio} onChange={e => setP('apoio', e.target.value)}><option value="">Todos os apoios</option>{apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
        <select className={sel} value={tipo} onChange={e => setP('tipo', e.target.value)}><option value="">Todas as operações</option>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={sel} value={sit} onChange={e => setP('sit', e.target.value)}>
          <option value="">Todas as situações</option><option value="sucesso">Sucesso</option><option value="aviso">Aviso</option><option value="erro">Erro</option><option value="nao_sucesso">Só erros e avisos</option>
        </select>
        <label className="flex h-9 items-center gap-1 text-xs"><input type="checkbox" checked={sit === 'erro'} onChange={e => setP('sit', e.target.checked ? 'erro' : '')} />Só erros</label>
        <form className="flex gap-1" onSubmit={e => { e.preventDefault(); setP('q', busca.trim()) }}>
          <Input className="h-9 w-56" placeholder="Remessa, pedido ou código de erro" value={busca} onChange={e => setBusca(e.target.value)} />
          <Button size="sm" type="submit" variant="outline">Buscar</Button>
        </form>
        <span className="ml-auto text-xs text-muted-foreground">{total} registro(s)</span>
      </div>

      {erroCarga ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-destructive">{erroCarga}</div>
      ) : carregando ? (
        <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !linhas.length ? (
        <div className="rounded-2xl border border-border bg-card"><EmptyState icon={<CheckCircle2 className="h-10 w-10" />} title="Nenhum registro" description="Nenhuma comunicação com o apoio neste filtro." /></div>
      ) : (
        <>
          <ListaLog linhas={linhas} erros={erros} onAbrir={setAberta} />
          <div className="flex items-center justify-end gap-2 text-xs">
            <Button size="sm" variant="outline" disabled={pag === 0} onClick={() => setP('pag', String(pag - 1))}>Anterior</Button>
            <span>Página {pag + 1} de {Math.max(1, Math.ceil(total / POR_PAG))}</span>
            <Button size="sm" variant="outline" disabled={(pag + 1) * POR_PAG >= total} onClick={() => setP('pag', String(pag + 1))}>Próxima</Button>
          </div>
        </>
      )}
      {aberta && <DetalheLog linha={aberta} erros={erros} onClose={() => setAberta(null)} onChanged={carregar} />}
    </div>
  )
}
