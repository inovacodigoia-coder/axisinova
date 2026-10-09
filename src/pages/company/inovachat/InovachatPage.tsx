import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowLeft, Check, CheckCheck, FileText, Image as ImageIcon, Link2, MessagesSquare, Mic, RefreshCw, Search, Smile, Unlink, Video, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useInovachatAcesso, useInovachatSinais } from '@/hooks/useInovachat'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Contato { id: string; telefone: string; nome_exibicao: string | null; paciente_id: string | null; vinculo_status: string; criado_em: string }
interface Conversa {
  id: string; status: 'na_fila' | 'em_atendimento' | 'finalizada'; responsavel_id: string | null; instancia_id: string
  ultima_mensagem_em: string | null; ultima_mensagem_resumo: string | null; nao_lidas: number; criada_em: string
  contato: Contato | null
}
interface Mensagem {
  id: string; direcao: 'entrada' | 'saida'; origem: string; tipo: string; texto: string | null
  enviada_por_nome: string | null; status: string | null; criado_em: string
}

export const formatarTelefone = (t: string) => {
  const d = (t || '').replace(/\D/g, '')
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(d)
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : t
}
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '#'
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const diaChave = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
function rotuloDia(iso: string) {
  const k = diaChave(iso)
  const hoje = diaChave(new Date().toISOString())
  const ontem = diaChave(new Date(Date.now() - 864e5).toISOString())
  return k === hoje ? 'Hoje' : k === ontem ? 'Ontem' : k
}
function horarioLista(iso: string | null) {
  if (!iso) return ''
  const r = rotuloDia(iso)
  return r === 'Hoje' ? hora(iso) : r
}
const MIDIA: Record<string, { label: string; icon: any }> = {
  audio: { label: 'Áudio recebido', icon: Mic }, imagem: { label: 'Imagem recebida', icon: ImageIcon },
  documento: { label: 'Documento recebido', icon: FileText }, video: { label: 'Vídeo recebido', icon: Video },
  figurinha: { label: 'Figurinha recebida', icon: Smile }, outro: { label: 'Conteúdo recebido', icon: FileText },
}
const STATUS_CONV: Record<string, string> = { na_fila: 'Na fila', em_atendimento: 'Em atendimento', finalizada: 'Finalizada' }
const nomeContato = (c: Contato | null) => c?.nome_exibicao || (c ? formatarTelefone(c.telefone) : 'Contato')

export default function InovachatPage() {
  const acesso = useInovachatAcesso()
  const [conversas, setConversas] = useState<Conversa[] | null>(null)
  const [erro, setErro] = useState(false)
  const [instancias, setInstancias] = useState<Record<string, string>>({})
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [aba, setAba] = useState<'abertas' | 'finalizadas'>('abertas')
  const [sub, setSub] = useState<'em_atendimento' | 'na_fila'>('na_fila')
  const [busca, setBusca] = useState('')
  const [filtroNum, setFiltroNum] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Mensagem[] | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('whatsapp_conversas')
      .select('id, status, responsavel_id, instancia_id, ultima_mensagem_em, ultima_mensagem_resumo, nao_lidas, criada_em, contato:whatsapp_contatos(id, telefone, nome_exibicao, paciente_id, vinculo_status, criado_em)')
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false }).limit(500)
    if (error) { setErro(true); return }
    setErro(false)
    const lista = (data ?? []) as unknown as Conversa[]
    setConversas(lista)
    const resp = [...new Set(lista.map(c => c.responsavel_id).filter(Boolean))] as string[]
    if (resp.length) {
      const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', resp)
      setNomes(Object.fromEntries((ps ?? []).map((p: any) => [p.id, p.full_name ?? 'Usuário'])))
    }
  }, [])

  const carregarMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from('whatsapp_mensagens')
      .select('id, direcao, origem, tipo, texto, enviada_por_nome, status, criado_em')
      .eq('conversa_id', id).order('criado_em', { ascending: true }).limit(1000)
    setMsgs((data ?? []) as Mensagem[])
  }, [])

  useEffect(() => {
    if (!acesso?.ver) return
    void carregar()
    void supabase.from('whatsapp_instancias').select('id, apelido').then(({ data }) =>
      setInstancias(Object.fromEntries((data ?? []).map((i: any) => [i.id, i.apelido ?? 'Número']))))
  }, [acesso, carregar])

  const selRef = useRef<string | null>(null)
  selRef.current = selId
  const onSinal = useCallback((cid: string) => {
    void carregar()
    if (cid && cid === selRef.current) {
      void carregarMsgs(cid)
      void supabase.rpc('inovachat_abrir', { p_conversa: cid })
    }
  }, [carregar, carregarMsgs])
  useInovachatSinais(!!acesso?.ver, onSinal)

  const abrir = async (c: Conversa) => {
    setSelId(c.id); setMsgs(null)
    void carregarMsgs(c.id)
    const { error } = await supabase.rpc('inovachat_abrir', { p_conversa: c.id })
    if (!error) setConversas(prev => prev?.map(x => x.id === c.id ? { ...x, nao_lidas: 0 } : x) ?? prev)
  }

  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const qd = q.replace(/\D/g, '')
    return (conversas ?? []).filter(c => {
      if (aba === 'finalizadas' ? c.status !== 'finalizada' : c.status !== sub) return false
      if (filtroNum && c.instancia_id !== filtroNum) return false
      if (!q) return true
      return (c.contato?.nome_exibicao ?? '').toLowerCase().includes(q)
        || (qd.length >= 3 && (c.contato?.telefone ?? '').includes(qd))
        || (c.ultima_mensagem_resumo ?? '').toLowerCase().includes(q)
    })
  }, [conversas, aba, sub, busca, filtroNum])

  const contagem = (s: string) => (conversas ?? []).filter(c => c.status === s && (!filtroNum || c.instancia_id === filtroNum)).length
  const sel = conversas?.find(c => c.id === selId) ?? null

  if (acesso === null) return <div className="p-6"><Skeleton className="h-[70vh] w-full" /></div>
  if (!acesso.ver) return <Navigate to="/app/dashboard" replace />

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-card">
      {/* Lista */}
      <aside className={cn('flex w-full flex-col border-r border-border md:w-[340px] md:shrink-0', sel && 'hidden md:flex')}>
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-foreground">InovaChat</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome, telefone ou texto" className="h-11 pl-8" />
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['abertas', 'finalizadas'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)} className={cn('min-h-[40px] rounded-md text-sm font-medium', aba === a ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                {a === 'abertas' ? 'Abertas' : 'Finalizadas'}
              </button>
            ))}
          </div>
          {aba === 'abertas' && (
            <div className="flex gap-1">
              {(['em_atendimento', 'na_fila'] as const).map(s => (
                <button key={s} onClick={() => setSub(s)} className={cn('min-h-[40px] flex-1 rounded-md border px-2 text-xs font-medium', sub === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                  {STATUS_CONV[s]} ({contagem(s)})
                </button>
              ))}
            </div>
          )}
          {Object.keys(instancias).length > 1 && (
            <select value={filtroNum} onChange={e => setFiltroNum(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Todos os números</option>
              {Object.entries(instancias).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {erro ? (
            <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
              <p>Não foi possível carregar as conversas.</p>
              <Button variant="outline" onClick={() => void carregar()}><RefreshCw className="mr-2 h-4 w-4" />Tentar de novo</Button>
            </div>
          ) : conversas === null ? (
            <div className="space-y-2 p-3">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtradas.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessagesSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Nenhuma conversa aqui por enquanto. Quando um paciente mandar mensagem, ela aparece nesta lista.
            </div>
          ) : filtradas.map(c => (
            <button key={c.id} onClick={() => void abrir(c)}
              className={cn('flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left hover:bg-muted/60', c.id === selId && 'bg-muted')}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full gradient-bg text-sm font-semibold text-primary-foreground">
                {iniciais(nomeContato(c.contato))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{nomeContato(c.contato)}</p>
                  <span className={cn('shrink-0 text-[11px]', c.nao_lidas ? 'text-primary font-semibold' : 'text-muted-foreground')}>{horarioLista(c.ultima_mensagem_em)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{c.ultima_mensagem_resumo ?? ''}</p>
                  {c.nao_lidas > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.nao_lidas}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary">{instancias[c.instancia_id] ?? 'Número'}</span>
                  {c.responsavel_id && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{nomes[c.responsavel_id] ?? 'Responsável'}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversa */}
      <section className={cn('flex min-w-0 flex-1 flex-col', !sel && 'hidden md:flex')}>
        {!sel ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center text-muted-foreground">
            <MessagesSquare className="h-12 w-12 text-primary/40" />
            <p className="text-sm">Selecione uma conversa para ver as mensagens.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border px-3 py-2">
              <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden" onClick={() => setSelId(null)} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-bg text-sm font-semibold text-primary-foreground">{iniciais(nomeContato(sel.contato))}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{nomeContato(sel.contato)}</p>
                <p className="truncate text-xs text-muted-foreground">{formatarTelefone(sel.contato?.telefone ?? '')} · {instancias[sel.instancia_id] ?? 'Número'} · {STATUS_CONV[sel.status]}</p>
              </div>
            </header>
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 space-y-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6">
                  {msgs === null ? <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className={cn('h-12 w-2/3', i % 2 && 'ml-auto')} />)}</div>
                    : msgs.length === 0 ? <p className="text-center text-sm text-muted-foreground">Sem mensagens.</p>
                    : msgs.map((m, i) => {
                      const novoDia = i === 0 || diaChave(msgs[i - 1].criado_em) !== diaChave(m.criado_em)
                      const saida = m.direcao === 'saida'
                      const midia = m.tipo !== 'texto' ? MIDIA[m.tipo] ?? MIDIA.outro : null
                      return (
                        <div key={m.id}>
                          {novoDia && <div className="my-3 flex justify-center"><span className="rounded-full bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">{rotuloDia(m.criado_em)}</span></div>}
                          <div className={cn('flex flex-col', saida ? 'items-end' : 'items-start')}>
                            {saida && m.enviada_por_nome && <span className="mb-0.5 px-1 text-[10px] font-medium text-secondary">{m.enviada_por_nome}</span>}
                            <div className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[70%]', saida ? 'bg-primary/15 text-foreground' : 'bg-card text-foreground')}>
                              {midia && <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><midia.icon className="h-4 w-4" />{midia.label}</p>}
                              {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                              <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                                {hora(m.criado_em)}
                                {saida && (m.status === 'lida' ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : m.status === 'entregue' ? <CheckCheck className="h-3.5 w-3.5" /> : m.status === 'falha' ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <Check className="h-3.5 w-3.5" />)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  <div ref={fimRef} />
                </div>
                <div className="border-t border-border p-3">
                  <Input disabled placeholder="Responder chega na próxima etapa" className="h-11" />
                </div>
              </div>
              <PainelContato contato={sel.contato} numero={instancias[sel.instancia_id] ?? 'Número'} podeGerenciar={acesso.gerenciar} onMudou={() => void carregar()} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function PainelContato({ contato, numero, podeGerenciar, onMudou }: { contato: Contato | null; numero: string; podeGerenciar: boolean; onMudou: () => void }) {
  const [pac, setPac] = useState<{ name: string; cpf: string | null; convenios: any } | null>(null)
  const [ags, setAgs] = useState<{ id: string; date: string; time: string; doctor: string | null; exam_name: string | null }[]>([])
  const [vincular, setVincular] = useState(false)

  useEffect(() => {
    setPac(null); setAgs([])
    if (!contato?.paciente_id) return
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    void supabase.from('patients').select('name, cpf, convenios').eq('id', contato.paciente_id).maybeSingle().then(({ data }) => setPac(data as any))
    void supabase.from('appointments').select('id, date, time, doctor, exam_name').eq('patient_id', contato.paciente_id)
      .gte('date', hoje).neq('status', 'cancelled').order('date').order('time').limit(5).then(({ data }) => setAgs((data ?? []) as any))
  }, [contato?.paciente_id])

  if (!contato) return null
  const convenio = Array.isArray(pac?.convenios) ? (pac!.convenios[0]?.name ?? pac!.convenios[0]?.convenioName ?? pac!.convenios[0]?.nome) : null

  const desvincular = async () => {
    const { error } = await supabase.rpc('inovachat_vincular', { p_contato: contato.id, p_paciente: null as any })
    if (error) toast.error(error.message); else { toast.success('Vínculo removido.'); onMudou() }
  }

  return (
    <aside className="hidden w-[280px] shrink-0 space-y-4 overflow-y-auto border-l border-border p-4 lg:block">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full gradient-bg text-lg font-semibold text-primary-foreground">{iniciais(nomeContato(contato))}</div>
        <p className="mt-2 font-semibold text-foreground">{nomeContato(contato)}</p>
        <p className="text-xs text-muted-foreground">{formatarTelefone(contato.telefone)}</p>
        <p className="text-xs text-muted-foreground">via {numero}</p>
      </div>
      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paciente</p>
        {contato.paciente_id ? (
          <>
            <p className="text-sm font-medium text-foreground">{pac?.name ?? '…'}</p>
            {convenio && <p className="text-xs text-muted-foreground">Convênio: {convenio}</p>}
            <div>
              <p className="text-xs font-medium text-foreground">Próximos agendamentos</p>
              {ags.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum.</p> : ags.map(a => (
                <p key={a.id} className="text-xs text-muted-foreground">{a.date.split('-').reverse().join('/')} {String(a.time).slice(0, 5)} · {a.exam_name || a.doctor || ''}</p>
              ))}
            </div>
            {podeGerenciar && <Button size="sm" variant="outline" className="min-h-[44px] w-full" onClick={() => void desvincular()}><Unlink className="mr-2 h-4 w-4" />Desvincular</Button>}
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{contato.vinculo_status === 'varios' ? 'Vários cadastros com este telefone' : 'Contato novo'}</p>
            {podeGerenciar && <Button size="sm" variant="outline" className="min-h-[44px] w-full" onClick={() => setVincular(true)}><Link2 className="mr-2 h-4 w-4" />Vincular a um paciente</Button>}
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Primeira conversa: {new Date(contato.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
      <VincularDialog open={vincular} onClose={() => setVincular(false)} contatoId={contato.id} onFeito={() => { setVincular(false); onMudou() }} />
    </aside>
  )
}

function VincularDialog({ open, onClose, contatoId, onFeito }: { open: boolean; onClose: () => void; contatoId: string; onFeito: () => void }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ id: string; name: string; cpf: string | null; birth_date: string | null }[]>([])
  useEffect(() => {
    const t = q.trim()
    if (t.length < 3) { setRes([]); return }
    const h = setTimeout(async () => {
      const dig = t.replace(/\D/g, '')
      let qb = supabase.from('patients').select('id, name, cpf, birth_date').limit(20)
      qb = dig.length >= 3 && dig.length === t.replace(/[.\-\s]/g, '').length ? qb.ilike('cpf', `%${dig}%`) : qb.ilike('name', `%${t}%`)
      const { data } = await qb
      setRes((data ?? []) as any)
    }, 300)
    return () => clearTimeout(h)
  }, [q])
  const escolher = async (id: string) => {
    const { error } = await supabase.rpc('inovachat_vincular', { p_contato: contatoId, p_paciente: id })
    if (error) toast.error(error.message); else { toast.success('Contato vinculado ao paciente.'); onFeito() }
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Vincular a um paciente</DialogTitle></DialogHeader>
        <div className="relative">
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nome ou CPF" className="h-11 pr-8" />
          {q && <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setQ('')} aria-label="Limpar"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {res.map(p => (
            <button key={p.id} onClick={() => void escolher(p.id)} className="min-h-[44px] w-full rounded-md border border-border px-3 py-2 text-left hover:bg-muted">
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.cpf ?? 'sem CPF'}{p.birth_date ? ` · ${p.birth_date.split('-').reverse().join('/')}` : ''}</p>
            </button>
          ))}
          {q.trim().length >= 3 && res.length === 0 && <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
