import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCheck, FileText, Image as ImageIcon, Link2, MessagesSquare, Mic, RefreshCw, Search, Smile, Unlink, Video, X, AlertTriangle, Send, Zap, Settings, ArrowRightLeft, CheckCircle2, RotateCcw, UserCheck, Loader2, Plus, Pencil, Trash2, Palette } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useInovachatAcesso, useInovachatSinais } from '@/hooks/useInovachat'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { ChatColorsDialog, DEFAULT_CHAT_COLORS, type ChatColors } from '@/components/inovachat/ChatColorsDialog'
import { MidiaBolha } from '@/components/inovachat/MidiaBolha'
import { AnexoBotoes } from '@/components/inovachat/AnexoBotoes'
import { HorarioDialog } from '@/components/inovachat/HorarioDialog'
import { ExcluirContatoDialog } from '@/components/inovachat/ExcluirContatoDialog'
import { Clock } from 'lucide-react'

interface Contato { id: string; telefone: string; nome_exibicao: string | null; paciente_id: string | null; vinculo_status: string; criado_em: string }
interface Conversa {
  id: string; status: 'na_fila' | 'em_atendimento' | 'finalizada'; responsavel_id: string | null; instancia_id: string; setor_id: string | null
  ultima_mensagem_em: string | null; ultima_mensagem_resumo: string | null; nao_lidas: number; criada_em: string; fora_horario?: boolean
  contato: Contato | null
}
interface Mensagem {
  id: string; direcao: 'entrada' | 'saida' | 'interna'; origem: string; tipo: string; texto: string | null
  enviada_por_nome: string | null; status: string | null; criado_em: string; evento_tipo: string | null; erro: string | null
  midia_status: string | null; midia_nome: string | null; midia_tamanho: number | null; duracao_seg: number | null; midia_mime: string | null
}
interface RespostaRapida { id: string; titulo: string; atalho: string; texto: string; setor_id: string | null; ativo: boolean }

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
const VARIAVEIS = ['nome_contato', 'atendente', 'empresa']
type Aba = 'minhas' | 'fila' | 'todas' | 'finalizadas'

export default function InovachatPage() {
  const acesso = useInovachatAcesso()
  const [params, setParams] = useSearchParams()
  const [conversas, setConversas] = useState<Conversa[] | null>(null)
  const [erro, setErro] = useState(false)
  const [instancias, setInstancias] = useState<Record<string, { apelido: string; status: string }>>({})
  const [setores, setSetores] = useState<Record<string, string>>({})
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [aba, setAba] = useState<Aba>('fila')
  const [busca, setBusca] = useState('')
  const [filtroNum, setFiltroNum] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Mensagem[] | null>(null)
  const [gestao, setGestao] = useState(false)
  const [coresOpen, setCoresOpen] = useState(false)
  const [horarioOpen, setHorarioOpen] = useState(false)
  const [cores, setCores] = useState<ChatColors>(DEFAULT_CHAT_COLORS)
  const [transferir, setTransferir] = useState(false)
  const [confFinalizar, setConfFinalizar] = useState(false)
  const [empresa, setEmpresa] = useState('')
  const [rapidas, setRapidas] = useState<RespostaRapida[]>([])
  const [meusSetores, setMeusSetores] = useState<string[]>([])
  const fimRef = useRef<HTMLDivElement>(null)
  const eu = acesso?.usuario_id ?? null

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('whatsapp_conversas')
      .select('id, status, responsavel_id, instancia_id, setor_id, ultima_mensagem_em, ultima_mensagem_resumo, nao_lidas, criada_em, fora_horario, contato:whatsapp_contatos(id, telefone, nome_exibicao, paciente_id, vinculo_status, criado_em)')
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false }).limit(500)
    if (error) { setErro(true); return }
    setErro(false)
    const lista = (data ?? []) as unknown as Conversa[]
    setConversas(lista)
    const resp = [...new Set(lista.map(c => c.responsavel_id).filter(Boolean))] as string[]
    if (resp.length) {
      const { data: ps } = await supabase.rpc('inovachat_nomes' as any, { p_ids: resp })
      setNomes(prev => ({ ...prev, ...Object.fromEntries(((ps as any[]) ?? []).map(p => [p.id, p.nome])) }))
    }
  }, [])

  const carregarMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from('whatsapp_mensagens')
      .select('id, direcao, origem, tipo, texto, enviada_por_nome, status, criado_em, evento_tipo, erro, midia_status, midia_nome, midia_tamanho, duracao_seg, midia_mime')
      .eq('conversa_id', id).order('criado_em', { ascending: true }).limit(1000)
    setMsgs((data ?? []) as Mensagem[])
  }, [])

  const carregarRapidas = useCallback(async () => {
    const { data } = await supabase.from('whatsapp_respostas_rapidas' as any).select('id, titulo, atalho, texto, setor_id, ativo').order('atalho')
    setRapidas((data ?? []) as any)
  }, [])

  const carregarInstancias = useCallback(() => {
    void supabase.from('whatsapp_instancias').select('id, apelido, status').then(({ data }) =>
      setInstancias(Object.fromEntries((data ?? []).map((i: any) => [i.id, { apelido: i.apelido ?? 'Número', status: i.status }]))))
  }, [])

  useEffect(() => {
    if (!acesso?.ver) return
    void carregar(); carregarInstancias(); void carregarRapidas()
    void supabase.from('company_sectors').select('id, name').order('name').then(({ data }) =>
      setSetores(Object.fromEntries((data ?? []).map((s: any) => [s.id, s.name]))))
    void supabase.from('companies').select('name, nome_fantasia').maybeSingle().then(({ data }) =>
      setEmpresa((data as any)?.nome_fantasia || (data as any)?.name || ''))
    if (eu) void supabase.from('sector_users').select('sector_id').eq('user_id', eu).then(({ data }) =>
      setMeusSetores((data ?? []).map((s: any) => s.sector_id)))
    if (eu) void supabase.rpc('inovachat_nomes' as any, { p_ids: [eu] }).then(({ data }) =>
      setNomes(prev => ({ ...prev, ...Object.fromEntries(((data as any[]) ?? []).map(p => [p.id, p.nome])) })))
    if (acesso.gerenciar) setAba('todas')
    const ch = supabase.channel(`inovachat-inst-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instancias' }, () => carregarInstancias())
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [acesso, eu, carregar, carregarInstancias, carregarRapidas])

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

  const abrirId = useCallback(async (id: string) => {
    setSelId(id); setMsgs(null)
    void carregarMsgs(id)
    const { error } = await supabase.rpc('inovachat_abrir', { p_conversa: id })
    if (!error) setConversas(prev => prev?.map(x => x.id === id ? { ...x, nao_lidas: 0 } : x) ?? prev)
  }, [carregarMsgs])

  // abrir pelo link do sino (?c=)
  useEffect(() => {
    const c = params.get('c')
    if (c && acesso?.ver && conversas) {
      void abrirId(c)
      const conv = conversas.find(x => x.id === c)
      if (conv) setAba(conv.status === 'finalizada' ? 'finalizadas' : conv.responsavel_id === eu ? 'minhas' : conv.status === 'na_fila' ? 'fila' : acesso.gerenciar ? 'todas' : 'minhas')
      params.delete('c'); setParams(params, { replace: true })
    }
  }, [params, acesso, conversas, abrirId, eu, setParams])

  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  const naAba = useCallback((c: Conversa, a: Aba) => {
    if (a === 'finalizadas') return c.status === 'finalizada'
    if (c.status === 'finalizada') return false
    if (a === 'minhas') return c.responsavel_id === eu
    if (a === 'fila') return c.status === 'na_fila' && (!c.setor_id || meusSetores.includes(c.setor_id) || !!acesso?.gerenciar)
    return true
  }, [eu, meusSetores, acesso])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const qd = q.replace(/\D/g, '')
    return (conversas ?? []).filter(c => {
      if (!naAba(c, aba)) return false
      if (filtroNum && c.instancia_id !== filtroNum) return false
      if (filtroSetor && (filtroSetor === '_sem' ? c.setor_id : c.setor_id !== filtroSetor)) return false
      if (!q) return true
      return (c.contato?.nome_exibicao ?? '').toLowerCase().includes(q)
        || (qd.length >= 3 && (c.contato?.telefone ?? '').includes(qd))
        || (c.ultima_mensagem_resumo ?? '').toLowerCase().includes(q)
    })
  }, [conversas, aba, busca, filtroNum, filtroSetor, naAba])

  const contagem = (a: Aba) => (conversas ?? []).filter(c => naAba(c, a) && (!filtroNum || c.instancia_id === filtroNum)).length
  const sel = conversas?.find(c => c.id === selId) ?? null

  const acao = async (fn: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await supabase.rpc(fn as any, args as any)
    if (error) { toast.error(error.message); return false }
    toast.success(ok); void carregar(); if (selId) void carregarMsgs(selId); return true
  }

  if (acesso === null) return <div className="p-6"><Skeleton className="h-[70vh] w-full" /></div>
  if (!acesso.ver) return <Navigate to="/app/dashboard" replace />

  const abas: { k: Aba; label: string }[] = [
    { k: 'minhas', label: 'Minhas' }, { k: 'fila', label: 'Fila' },
    ...(acesso.gerenciar ? [{ k: 'todas' as Aba, label: 'Todas' }] : []), { k: 'finalizadas', label: 'Finalizadas' },
  ]

  // motivo para não poder responder
  let motivo: string | null = null
  if (sel) {
    if (!acesso.responder) motivo = 'Seu perfil não pode responder conversas.'
    else if (sel.status === 'finalizada') motivo = acesso.gerenciar ? 'Conversa finalizada. Reabra para responder.' : 'Conversa finalizada.'
    else if (instancias[sel.instancia_id] && instancias[sel.instancia_id].status !== 'connected') motivo = 'Número desconectado: reconecte em Configurações > WhatsApp.'
    else if (sel.responsavel_id && sel.responsavel_id !== eu && !acesso.gerenciar) motivo = `Conversa em atendimento por ${nomes[sel.responsavel_id] ?? 'outro atendente'}. Peça a transferência.`
  }
  const souResp = !!sel && sel.responsavel_id === eu
  const podeTransferir = !!sel && sel.status !== 'finalizada' && (acesso.gerenciar || (souResp && acesso.responder))
  const podeAssumir = !!sel && sel.status !== 'finalizada' && !souResp && (acesso.gerenciar || (acesso.responder && sel.status === 'na_fila'))

  return (
    <div data-chat-background={cores.background} data-chat-received={cores.received} data-chat-sent={cores.sent}
      className="chat-color-scope flex h-[calc(100vh-8rem)] min-h-[480px] overflow-hidden rounded-xl border border-border bg-card">
      {/* Lista */}
      <aside className={cn('flex w-full flex-col border-r border-border md:w-[340px] md:shrink-0', sel && 'hidden md:flex')}>
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" />
            <h1 className="flex-1 font-semibold text-foreground">InovaChat</h1>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCoresOpen(true)} aria-label="Cores da conversa" title="Cores da conversa"><Palette className="h-5 w-5" /></Button>
            {acesso.gerenciar && (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setHorarioOpen(true)} aria-label="Horário de atendimento" title="Horário de atendimento"><Clock className="h-5 w-5" /></Button>
            )}
            {acesso.gerenciar && (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setGestao(true)} aria-label="Respostas rápidas" title="Respostas rápidas">
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome, telefone ou texto" className="h-11 pl-8" />
          </div>
          <div className={cn('grid gap-1 rounded-lg bg-muted p-1', abas.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
            {abas.map(a => (
              <button key={a.k} onClick={() => setAba(a.k)} className={cn('min-h-[40px] rounded-md px-1 text-xs font-medium', aba === a.k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                {a.label}{a.k !== 'finalizadas' && ` (${contagem(a.k)})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {Object.keys(setores).length > 0 && (
              <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Todos os setores</option>
                <option value="_sem">Sem setor</option>
                {Object.entries(setores).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
            )}
            {Object.keys(instancias).length > 1 && (
              <select value={filtroNum} onChange={e => setFiltroNum(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">Todos os números</option>
                {Object.entries(instancias).map(([id, n]) => <option key={id} value={id}>{n.apelido}</option>)}
              </select>
            )}
          </div>
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
              Nenhuma conversa aqui por enquanto.
            </div>
          ) : filtradas.map(c => (
            <button key={c.id} onClick={() => void abrirId(c.id)}
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
                  <span className="rounded bg-secondary/10 px-1.5 py-0.5 text-[10px] text-secondary">{instancias[c.instancia_id]?.apelido ?? 'Número'}</span>
                  {c.fora_horario && c.status !== 'finalizada' && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-foreground">Fora do horário</span>}
                  {c.setor_id && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{setores[c.setor_id] ?? 'Setor'}</span>}
                  {c.responsavel_id && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.responsavel_id === eu ? 'Você' : nomes[c.responsavel_id] ?? 'Responsável'}</span>}
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
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <Button variant="ghost" size="icon" className="h-11 w-11 md:hidden" onClick={() => setSelId(null)} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-bg text-sm font-semibold text-primary-foreground">{iniciais(nomeContato(sel.contato))}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{nomeContato(sel.contato)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatarTelefone(sel.contato?.telefone ?? '')} · {STATUS_CONV[sel.status]} · {sel.setor_id ? setores[sel.setor_id] ?? 'Setor' : 'Sem setor'}
                  {sel.responsavel_id && ` · ${sel.responsavel_id === eu ? 'Você' : nomes[sel.responsavel_id] ?? 'Responsável'}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCoresOpen(true)} aria-label="Personalizar cores" title="Cores da conversa"><Palette className="h-5 w-5" /></Button>
                {podeAssumir && <Button size="sm" variant="outline" className="h-10" onClick={() => void acao('inovachat_assumir', { p_conversa: sel.id }, 'Conversa assumida.')}><UserCheck className="mr-1 h-4 w-4" />Assumir conversa</Button>}
                {podeTransferir && <Button size="sm" variant="outline" className="h-10" onClick={() => setTransferir(true)}><ArrowRightLeft className="mr-1 h-4 w-4" />Transferir</Button>}
                {sel.status !== 'finalizada' && (acesso.gerenciar || (souResp && acesso.responder)) &&
                  <Button size="sm" variant="outline" className="h-10" onClick={() => setConfFinalizar(true)}><CheckCircle2 className="mr-1 h-4 w-4" />Finalizar</Button>}
                {sel.status === 'finalizada' && acesso.gerenciar &&
                  <Button size="sm" variant="outline" className="h-10" onClick={() => void acao('inovachat_reabrir', { p_conversa: sel.id }, 'Conversa reaberta na fila.')}><RotateCcw className="mr-1 h-4 w-4" />Reabrir</Button>}
              </div>
            </header>
            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="chat-conversation-background flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-6">
                  {msgs === null ? <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className={cn('h-12 w-2/3', i % 2 && 'ml-auto')} />)}</div>
                    : msgs.length === 0 ? <p className="text-center text-sm text-muted-foreground">Sem mensagens.</p>
                    : msgs.map((m, i) => {
                      const novoDia = i === 0 || diaChave(msgs[i - 1].criado_em) !== diaChave(m.criado_em)
                      return (
                        <div key={m.id}>
                          {novoDia && <div className="my-3 flex justify-center"><span className="rounded-full bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">{rotuloDia(m.criado_em)}</span></div>}
                          <Bolha m={m} onTentar={() => void reenviar(m)} />
                        </div>
                      )
                    })}
                  <div ref={fimRef} />
                </div>
                <Composer key={sel.id} conversa={sel} motivo={motivo} rapidas={rapidas}
                  vars={{ nome_contato: (sel.contato?.nome_exibicao ?? '').split(/\s+/)[0] || '', atendente: eu ? nomes[eu] ?? '' : '', empresa }}
                  onEnviado={() => { void carregar(); void carregarMsgs(sel.id) }} />
              </div>
              <PainelContato contato={sel.contato} numero={instancias[sel.instancia_id]?.apelido ?? 'Número'} podeGerenciar={acesso.gerenciar} podeExcluir={!!acesso.admin} onMudou={() => void carregar()} onExcluido={() => { setSelId(null); void carregar() }} />
            </div>
          </>
        )}
      </section>

      {sel && <TransferirDialog open={transferir} onClose={() => setTransferir(false)} setores={setores}
        onConfirmar={async (u, s, nota) => {
          if (await acao('inovachat_transferir', { p_conversa: sel.id, p_usuario: u, p_setor: s, p_nota: nota }, 'Conversa transferida.')) setTransferir(false)
        }} />}
      <AlertDialog open={confFinalizar} onOpenChange={setConfFinalizar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar conversa?</AlertDialogTitle>
            <AlertDialogDescription>A conversa vai para Finalizadas. Nenhuma mensagem é enviada ao paciente. Se ele escrever de novo, ela volta para a fila.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => sel && void acao('inovachat_finalizar', { p_conversa: sel.id }, 'Conversa finalizada.')}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <RespostasRapidasDialog open={gestao} onClose={() => { setGestao(false); void carregarRapidas() }} setores={setores} />
      <HorarioDialog open={horarioOpen} onClose={() => setHorarioOpen(false)} setores={setores} empresa={empresa} />
      {coresOpen && <ChatColorsDialog colors={cores} onApply={setCores} onClose={() => setCoresOpen(false)} />}
    </div>
  )

  async function reenviar(m: Mensagem) {
    if (!sel) return
    const ehMidia = m.tipo !== 'texto' && m.midia_status === 'baixada'
    if (!ehMidia && !m.texto) return
    const { data, error } = await supabase.functions.invoke('inovachat-enviar', { body: ehMidia
      ? { conversa_id: sel.id, substituir_id: m.id, midia_retry: true } : { conversa_id: sel.id, texto: m.texto, substituir_id: m.id } })
    const r = (data ?? {}) as any
    if (error && !r.mensagem) toast.error('Não foi possível enviar.')
    else if (!r.ok) toast.error(r.mensagem ?? 'Não foi possível enviar.')
    void carregar(); void carregarMsgs(sel.id)
  }
}

function Bolha({ m, onTentar }: { m: Mensagem; onTentar: () => void }) {
  if (m.origem === 'evento') {
    const nota = m.evento_tipo === 'nota'
    return (
      <div className="my-2 flex justify-center">
        <div className={cn('max-w-[85%] rounded-md px-3 py-1.5 text-center text-[11px]', nota ? 'border border-warning/40 bg-warning/10 text-foreground' : 'text-muted-foreground')}>
          {nota && <p className="font-semibold">Nota interna{m.enviada_por_nome ? ` · ${m.enviada_por_nome}` : ''}</p>}
          <p className="whitespace-pre-wrap break-words">{m.texto}</p>
          <p className="text-[10px] opacity-70">{hora(m.criado_em)}</p>
        </div>
      </div>
    )
  }
  const saida = m.direcao === 'saida'
  const midia = m.tipo !== 'texto' ? MIDIA[m.tipo] ?? MIDIA.outro : null
  const falha = m.status === 'falha'
  return (
    <div className={cn('flex flex-col', saida ? 'items-end' : 'items-start')}>
      {saida && m.enviada_por_nome && <span className="mb-0.5 px-1 text-[10px] font-medium text-secondary">{m.enviada_por_nome}</span>}
      <div className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm sm:max-w-[70%]', saida ? 'chat-bubble-sent' : 'chat-bubble-received', falha && 'border border-destructive/50')}>
        {midia && <MidiaBolha m={m} />}
        {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-80">
          {hora(m.criado_em)}
          {saida && (m.status === 'lida' ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : m.status === 'entregue' ? <CheckCheck className="h-3.5 w-3.5" /> : falha ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <Check className="h-3.5 w-3.5" />)}
        </p>
      </div>
      {falha && m.origem === 'usuario' && (
        <div className="mt-0.5 flex items-center gap-2 px-1 text-[11px] text-destructive">
          <span>{m.erro ?? 'Falha no envio'}</span>
          <button className="font-semibold underline" onClick={onTentar}>Tentar de novo</button>
        </div>
      )}
    </div>
  )
}

const resolver = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (all, k) => (k in v ? v[k] : all))

function Composer({ conversa, motivo, rapidas, vars, onEnviado }: {
  conversa: Conversa; motivo: string | null; rapidas: RespostaRapida[]; vars: Record<string, string>; onEnviado: () => void
}) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [lista, setLista] = useState(false)
  const [qRap, setQRap] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const [gravando, setGravando] = useState(false)
  const disponiveis = rapidas.filter(r => r.ativo && (!r.setor_id || r.setor_id === conversa.setor_id))
  const filtroR = disponiveis.filter(r => {
    const q = qRap.toLowerCase()
    return !q || r.atalho.toLowerCase().includes(q) || r.titulo.toLowerCase().includes(q)
  })

  const escolher = (r: RespostaRapida) => {
    setTexto(resolver(r.texto, vars)); setLista(false); setQRap('')
    setTimeout(() => ref.current?.focus(), 0)
  }
  const mudar = (v: string) => {
    setTexto(v)
    if (v.startsWith('/') && !v.includes('\n') && !v.includes(' ')) { setLista(true); setQRap(v.slice(1)) }
    else if (lista && !v.startsWith('/')) setLista(false)
  }
  const enviar = async () => {
    const t = texto.trim()
    if (!t || enviando || motivo) return
    if (t.length > 4000) { toast.error('Limite de 4000 caracteres.'); return }
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('inovachat-enviar', { body: { conversa_id: conversa.id, texto: t } })
    setEnviando(false)
    const r = (data ?? {}) as any
    if (r.ok) { setTexto(''); onEnviado(); return }
    let msg = r.mensagem as string | undefined
    if (!msg && error) { try { msg = (await (error as any).context?.json?.())?.mensagem } catch { /* */ } }
    toast.error(msg ?? 'Não foi possível enviar.')
    if (r.mensagem_id) { setTexto(''); onEnviado() } // ficou registrada com falha e "Tentar de novo"
    else onEnviado()
  }

  if (motivo) {
    return <div className="border-t border-border p-3"><div className="flex min-h-11 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm text-muted-foreground">{motivo}</div></div>
  }
  return (
    <div className="relative border-t border-border p-3">
      {lista && (
        <div className="absolute bottom-full left-3 right-3 mb-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          <Input autoFocus={!texto.startsWith('/')} value={qRap} onChange={e => setQRap(e.target.value)} placeholder="Buscar resposta rápida" className="mb-1 h-9" />
          {filtroR.length === 0 ? <p className="p-2 text-xs text-muted-foreground">Nenhuma resposta rápida.</p> : filtroR.map(r => (
            <button key={r.id} onClick={() => escolher(r)} className="w-full rounded-md px-2 py-2 text-left hover:bg-muted">
              <p className="text-sm font-medium text-foreground">{r.titulo} <span className="text-xs text-primary">{r.atalho}</span></p>
              <p className="truncate text-xs text-muted-foreground">{resolver(r.texto, vars)}</p>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => { setLista(v => !v); setQRap('') }} aria-label="Respostas rápidas" title="Respostas rápidas">
          <Zap className="h-5 w-5 text-primary" />
        </Button>
        <AnexoBotoes conversaId={conversa.id} onEnviado={onEnviado} onGravando={setGravando} />
        {!gravando && <>
        <Textarea ref={ref} value={texto} onChange={e => mudar(e.target.value)} maxLength={4000} rows={1}
          placeholder="Digite uma mensagem ( / para respostas rápidas)" className="min-h-[44px] max-h-40 resize-none"
          onKeyDown={e => {
            if (e.key === 'Escape') setLista(false)
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (lista && filtroR[0] && texto.startsWith('/')) escolher(filtroR[0]); else void enviar() }
          }} />
        <Button type="button" onClick={() => void enviar()} disabled={enviando || !texto.trim()} className="h-11 w-11 shrink-0 gradient-bg p-0 text-primary-foreground" aria-label="Enviar">
          {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
        </>}
      </div>
      {texto.length > 3500 && <p className="mt-1 text-right text-[11px] text-muted-foreground">{texto.length}/4000</p>}
    </div>
  )
}

function TransferirDialog({ open, onClose, setores, onConfirmar }: {
  open: boolean; onClose: () => void; setores: Record<string, string>; onConfirmar: (u: string | null, s: string | null, nota: string) => Promise<void>
}) {
  const [modo, setModo] = useState<'usuario' | 'setor'>('usuario')
  const [atendentes, setAtendentes] = useState<{ id: string; nome: string }[]>([])
  const [q, setQ] = useState('')
  const [escolha, setEscolha] = useState<string>('')
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (!open) return
    setEscolha(''); setNota(''); setQ('')
    void supabase.rpc('inovachat_atendentes' as any).then(({ data }) => setAtendentes((data as any[]) ?? []))
  }, [open])
  const itens = modo === 'usuario'
    ? atendentes.filter(a => !q || a.nome.toLowerCase().includes(q.toLowerCase())).map(a => ({ id: a.id, nome: a.nome }))
    : Object.entries(setores).filter(([, n]) => !q || n.toLowerCase().includes(q.toLowerCase())).map(([id, nome]) => ({ id, nome }))
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Transferir conversa</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(['usuario', 'setor'] as const).map(m => (
            <button key={m} onClick={() => { setModo(m); setEscolha('') }} className={cn('min-h-[40px] rounded-md text-sm font-medium', modo === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
              {m === 'usuario' ? 'Para um atendente' : 'Para um setor'}
            </button>
          ))}
        </div>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar" className="h-11" />
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {itens.length === 0 ? <p className="text-sm text-muted-foreground">Nada encontrado.</p> : itens.map(i => (
            <button key={i.id} onClick={() => setEscolha(i.id)} className={cn('min-h-[44px] w-full rounded-md border px-3 text-left text-sm', escolha === i.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
              {i.nome}
            </button>
          ))}
        </div>
        <Textarea value={nota} onChange={e => setNota(e.target.value)} maxLength={1000} placeholder="Nota interna (opcional, só a equipe vê)" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!escolha || salvando} onClick={async () => {
            setSalvando(true)
            await onConfirmar(modo === 'usuario' ? escolha : null, modo === 'setor' ? escolha : null, nota)
            setSalvando(false)
          }}>Transferir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RespostasRapidasDialog({ open, onClose, setores }: { open: boolean; onClose: () => void; setores: Record<string, string> }) {
  const [lista, setLista] = useState<RespostaRapida[]>([])
  const [edit, setEdit] = useState<Partial<RespostaRapida> | null>(null)
  const [excluir, setExcluir] = useState<RespostaRapida | null>(null)
  const carregar = useCallback(async () => {
    const { data } = await supabase.from('whatsapp_respostas_rapidas' as any).select('id, titulo, atalho, texto, setor_id, ativo').order('atalho')
    setLista((data ?? []) as any)
  }, [])
  useEffect(() => { if (open) void carregar() }, [open, carregar])

  const salvar = async () => {
    if (!edit) return
    const titulo = (edit.titulo ?? '').trim(), atalho = (edit.atalho ?? '').trim().toLowerCase(), texto = (edit.texto ?? '').trim()
    if (!titulo) return toast.error('Informe o título.')
    if (!/^\/[^\s/]{1,30}$/.test(atalho)) return toast.error('O atalho começa com "/" e não tem espaço (ex.: /ola).')
    if (!texto || texto.length > 1000) return toast.error('Texto de 1 a 1000 caracteres.')
    const desconhecidas = [...texto.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(v => !VARIAVEIS.includes(v))
    if (desconhecidas.length) return toast.error(`Variável desconhecida: {${desconhecidas[0]}}`)
    const linha = { titulo, atalho, texto, setor_id: edit.setor_id || null, ativo: edit.ativo ?? true }
    const { data: c } = await supabase.from('profiles').select('company_id').eq('id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle()
    const { error } = edit.id
      ? await supabase.from('whatsapp_respostas_rapidas' as any).update({ ...linha, atualizado_em: new Date().toISOString() }).eq('id', edit.id)
      : await supabase.from('whatsapp_respostas_rapidas' as any).insert({ ...linha, company_id: (c as any)?.company_id, criado_por: (await supabase.auth.getUser()).data.user?.id })
    if (error) return toast.error(error.code === '23505' ? 'Já existe uma resposta com esse atalho.' : 'Não foi possível salvar.')
    toast.success('Resposta rápida salva.'); setEdit(null); void carregar()
  }
  const alternar = async (r: RespostaRapida, v: boolean) => {
    const { error } = await supabase.from('whatsapp_respostas_rapidas' as any).update({ ativo: v }).eq('id', r.id)
    if (error) toast.error('Não foi possível alterar.'); else void carregar()
  }
  const apagar = async () => {
    if (!excluir) return
    const { error } = await supabase.from('whatsapp_respostas_rapidas' as any).delete().eq('id', excluir.id)
    setExcluir(null)
    if (error) toast.error('Não foi possível excluir.'); else { toast.success('Resposta excluída.'); void carregar() }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Respostas rápidas</DialogTitle>
          <DialogDescription>Variáveis: {'{nome_contato}'}, {'{atendente}'}, {'{empresa}'}.</DialogDescription>
        </DialogHeader>
        {edit ? (
          <div className="space-y-2">
            <Input value={edit.titulo ?? ''} onChange={e => setEdit({ ...edit, titulo: e.target.value })} placeholder="Título" maxLength={80} className="h-11" />
            <Input value={edit.atalho ?? ''} onChange={e => setEdit({ ...edit, atalho: e.target.value })} placeholder="/atalho" maxLength={31} className="h-11" />
            <Textarea value={edit.texto ?? ''} onChange={e => setEdit({ ...edit, texto: e.target.value })} placeholder="Texto" maxLength={1000} rows={4} />
            <div className="flex flex-wrap gap-1">
              {VARIAVEIS.map(v => <button key={v} type="button" onClick={() => setEdit({ ...edit, texto: `${edit.texto ?? ''}{${v}}` })} className="rounded border border-border px-2 py-1 text-xs text-primary">{`{${v}}`}</button>)}
            </div>
            <select value={edit.setor_id ?? ''} onChange={e => setEdit({ ...edit, setor_id: e.target.value || null })} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Todos os setores</option>
              {Object.entries(setores).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEdit(null)}>Voltar</Button>
              <Button onClick={() => void salvar()}>Salvar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="outline" className="h-11 w-full" onClick={() => setEdit({ ativo: true, atalho: '/' })}><Plus className="mr-2 h-4 w-4" />Nova resposta</Button>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma resposta rápida.</p> : lista.map(r => (
                <div key={r.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{r.titulo} <span className="text-xs text-primary">{r.atalho}</span>{r.setor_id && <span className="ml-1 text-[10px] text-muted-foreground">· {setores[r.setor_id]}</span>}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.texto}</p>
                  </div>
                  <Switch checked={r.ativo} onCheckedChange={v => void alternar(r, v)} aria-label="Ativa" />
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEdit(r)} aria-label="Editar"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setExcluir(r)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <AlertDialog open={!!excluir} onOpenChange={v => { if (!v) setExcluir(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir resposta rápida?</AlertDialogTitle>
              <AlertDialogDescription>"{excluir?.titulo}" será removida para toda a equipe.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void apagar()}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}

function PainelContato({ contato, numero, podeGerenciar, podeExcluir, onMudou, onExcluido }: { contato: Contato | null; numero: string; podeGerenciar: boolean; podeExcluir: boolean; onMudou: () => void; onExcluido: () => void }) {
  const [excluir, setExcluir] = useState(false)
  const [pac, setPac] = useState<{ name: string; cpf: string | null; convenios: any } | null>(null)
  const [ags, setAgs] = useState<{ id: string; date: string; time: string; doctor: string | null; exam_name: string | null }[]>([])
  const [vincular, setVincular] = useState(false)
  const [optout, setOptout] = useState<boolean | null>(null)
  const carregarOptout = useCallback(async () => {
    if (!contato?.id) return
    const { data } = await supabase.rpc('inovachat_optout_estado' as any, { p_contato: contato.id })
    setOptout((data as any)?.ok ? !!(data as any).optout : null)
  }, [contato?.id])
  useEffect(() => { setOptout(null); void carregarOptout() }, [carregarOptout])
  const definirOptout = async (bloquear: boolean) => {
    if (!contato) return
    const { data, error } = await supabase.rpc('inovachat_optout_definir' as any, { p_contato: contato.id, p_bloquear: bloquear })
    if (error || data !== 'OK') { toast.error('Não foi possível alterar.'); return }
    toast.success(bloquear ? 'Contato não receberá mensagens automáticas.' : 'Mensagens automáticas reativadas.')
    void carregarOptout()
  }

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
      {optout === true && (
        <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="text-xs font-medium text-foreground">Não quer receber mensagens de relacionamento</p>
          {podeGerenciar && <Button size="sm" variant="outline" className="min-h-[44px] w-full" onClick={() => void definirOptout(false)}>Reativar</Button>}
        </div>
      )}
      {optout === false && podeGerenciar && (
        <Button size="sm" variant="ghost" className="min-h-[44px] w-full" onClick={() => void definirOptout(true)}>Marcar para não receber</Button>
      )}
      <p className="text-xs text-muted-foreground">Primeira conversa: {new Date(contato.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
      {podeExcluir && <Button size="sm" variant="ghost" className="min-h-[44px] w-full text-destructive" onClick={() => setExcluir(true)}><Trash2 className="mr-2 h-4 w-4" />Excluir dados deste contato</Button>}
      <ExcluirContatoDialog open={excluir} onClose={() => setExcluir(false)} contatoId={contato.id} onFeito={() => { setExcluir(false); onExcluido() }} />
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
