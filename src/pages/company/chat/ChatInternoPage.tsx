import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquarePlus, Paperclip, Reply, Search, Send, Trash2, Users, Volume2, VolumeX, X, LogOut, UserPlus, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useChatInternoAcesso } from '@/hooks/useChatInterno'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Conversa {
  id: string
  tipo: 'direta' | 'grupo' | 'setor'
  nome: string
  criado_por: string | null
  ultima_mensagem_em: string | null
  nao_lidas: number
  silenciada: boolean
  online?: boolean
}

interface Mensagem {
  id: string
  autor_id: string | null
  autor_nome: string
  tipo: 'texto' | 'anexo' | 'sistema'
  conteudo: string | null
  anexo_path: string | null
  anexo_nome: string | null
  anexo_tipo: string | null
  resposta_id: string | null
  resposta_preview: string | null
  apagada: boolean
  criado_em: string
}

interface Colega { id: string; nome: string }

const TIPOS_ANEXO = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']

function tocarSom() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.25)
  } catch { /* sem áudio disponível */ }
}

export default function ChatInternoPage() {
  const { user } = useAuth()
  const acesso = useChatInternoAcesso()
  const meuId = acesso?.usuario_id ?? null

  const [conversas, setConversas] = useState<Conversa[]>([])
  const [busca, setBusca] = useState('')
  const [ativa, setAtiva] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [resposta, setResposta] = useState<Mensagem | null>(null)
  const [anexo, setAnexo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [digitando, setDigitando] = useState<string | null>(null)
  const [novaAberta, setNovaAberta] = useState(false)
  const [colegas, setColegas] = useState<Colega[]>([])
  const [grupoNome, setGrupoNome] = useState('')
  const [grupoSel, setGrupoSel] = useState<Set<string>>(new Set())
  const [painelGrupo, setPainelGrupo] = useState(false)
  const [participantes, setParticipantes] = useState<Colega[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const digitandoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const carregarConversas = useCallback(async () => {
    if (!meuId) return
    const { data: parts } = await supabase
      .from('chat_interno_participante')
      .select('conversa_id, ultima_leitura_em, silenciada, conversa:chat_interno_conversa(id, tipo, nome, criado_por, ultima_mensagem_em)')
      .eq('usuario_id', meuId)
    if (!parts) return
    const outrasIds = parts
      .filter(p => (p.conversa as any)?.tipo === 'direta')
      .map(p => (p.conversa as any).id)
    const { data: outros } = outrasIds.length
      ? await supabase.from('chat_interno_participante').select('conversa_id, usuario_id').in('conversa_id', outrasIds).neq('usuario_id', meuId)
      : { data: [] as any[] }
    const nomesIds = [...new Set((outros ?? []).map(o => o.usuario_id))]
    const { data: perfis } = nomesIds.length
      ? await supabase.from('profiles').select('id, full_name').in('id', nomesIds)
      : { data: [] as any[] }
    const nomePorId = new Map((perfis ?? []).map(p => [p.id, p.full_name || 'Colega']))
    const outroPorConversa = new Map((outros ?? []).map(o => [o.conversa_id, o.usuario_id]))
    const lista: Conversa[] = await Promise.all(parts.map(async p => {
      const c = p.conversa as any
      const outro = outroPorConversa.get(c.id)
      const { count } = await supabase.from('chat_interno_mensagem')
        .select('id', { count: 'exact', head: true })
        .eq('conversa_id', c.id).eq('apagada', false).gt('criado_em', p.ultima_leitura_em).neq('autor_id', meuId)
      return {
        id: c.id, tipo: c.tipo, criado_por: c.criado_por,
        nome: c.tipo === 'direta' ? (nomePorId.get(outro ?? '') ?? 'Conversa') : (c.nome ?? 'Grupo'),
        ultima_mensagem_em: c.ultima_mensagem_em,
        nao_lidas: count ?? 0,
        silenciada: p.silenciada,
      }
    }))
    lista.sort((a, b) => (b.ultima_mensagem_em ?? '').localeCompare(a.ultima_mensagem_em ?? ''))
    setConversas(lista)
    setAtiva(prev => prev ? (lista.find(c => c.id === prev.id) ?? prev) : prev)
  }, [meuId])

  const carregarMensagens = useCallback(async (conversaId: string) => {
    const { data } = await supabase.from('chat_interno_mensagem')
      .select('id, autor_id, tipo, conteudo, anexo_path, anexo_nome, anexo_tipo, resposta_id, apagada, criado_em')
      .eq('conversa_id', conversaId).order('criado_em', { ascending: true }).limit(300)
    const autores = [...new Set((data ?? []).map(m => m.autor_id).filter(Boolean))] as string[]
    const { data: perfis } = autores.length
      ? await supabase.from('profiles').select('id, full_name').in('id', autores)
      : { data: [] as any[] }
    const nomePorId = new Map((perfis ?? []).map(p => [p.id, p.full_name || 'Colega']))
    const porId = new Map((data ?? []).map(m => [m.id, m]))
    setMensagens((data ?? []).map((m): Mensagem => {
      const resp = m.resposta_id ? porId.get(m.resposta_id) : null
      return {
        ...m,
        autor_nome: m.autor_id ? (nomePorId.get(m.autor_id) ?? 'Colega') : 'Sistema',
        resposta_preview: resp ? (resp.apagada ? 'mensagem apagada' : (resp.conteudo ?? resp.anexo_nome ?? '')) : null,
      }
    }))
    void supabase.rpc('chat_interno_marcar_lida', { p_conversa: conversaId })
  }, [])

  useEffect(() => { if (meuId) void carregarConversas() }, [meuId, carregarConversas])
  useEffect(() => { if (ativa) void carregarMensagens(ativa.id) }, [ativa?.id, carregarMensagens])
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens.length])

  // Tempo real: mensagens novas + digitando + presença na conversa aberta
  useEffect(() => {
    if (!meuId) return
    const canalDb = supabase
      .channel(`chat-interno-msgs-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_interno_mensagem' }, payload => {
        const m = payload.new as any
        void carregarConversas()
        if (ativa && m.conversa_id === ativa.id) void carregarMensagens(ativa.id)
        if (m.autor_id && m.autor_id !== meuId && (!ativa || m.conversa_id !== ativa.id)) {
          const conv = conversas.find(c => c.id === m.conversa_id)
          if (conv && !conv.silenciada) { tocarSom(); toast.message(`Nova mensagem em ${conv.nome}`) }
        }
      })
      .subscribe()
    return () => { void supabase.removeChannel(canalDb) }
  }, [meuId, ativa?.id, conversas, carregarConversas, carregarMensagens])

  useEffect(() => {
    if (!ativa || !meuId) return
    const canal = supabase.channel(`chat-interno-sala-${ativa.id}`, { config: { presence: { key: meuId } } })
    canal
      .on('broadcast', { event: 'digitando' }, ({ payload }) => {
        if (payload.usuario !== meuId) {
          setDigitando(payload.nome)
          if (digitandoTimer.current) clearTimeout(digitandoTimer.current)
          digitandoTimer.current = setTimeout(() => setDigitando(null), 3000)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const estado = canal.presenceState()
        const online = Object.keys(estado).some(k => k !== meuId)
        setConversas(prev => prev.map(c => c.id === ativa.id ? { ...c, online } : c))
      })
      .subscribe()
    canalRef.current = canal
    return () => { canalRef.current = null; void supabase.removeChannel(canal) }
  }, [ativa?.id, meuId])

  const avisarDigitando = () => {
    canalRef.current?.send({ type: 'broadcast', event: 'digitando', payload: { usuario: meuId, nome: user?.name ?? 'Colega' } })
  }

  const enviar = async () => {
    if (!ativa || enviando) return
    const conteudo = texto.trim()
    if (!conteudo && !anexo) return
    setEnviando(true)
    try {
      let anexoPayload: any = null
      if (anexo) {
        if (anexo.size > 10 * 1024 * 1024) { toast.error('O anexo deve ter até 10 MB.'); return }
        if (!TIPOS_ANEXO.includes(anexo.type)) { toast.error('Tipo de arquivo não permitido.'); return }
        const caminho = `${user?.companyId}/${ativa.id}/${crypto.randomUUID()}-${anexo.name}`
        const { error: upErro } = await supabase.storage.from('chat-interno-anexos').upload(caminho, anexo)
        if (upErro) { toast.error('Não foi possível enviar o anexo.'); return }
        anexoPayload = { path: caminho, nome: anexo.name, tipo: anexo.type, tamanho: anexo.size }
      }
      const { error } = await supabase.rpc('chat_interno_enviar', {
        p_conversa: ativa.id, p_conteudo: conteudo || null,
        p_resposta: resposta?.id ?? null, p_anexo: anexoPayload,
      })
      if (error) { toast.error(error.message); return }
      setTexto(''); setResposta(null); setAnexo(null)
      await carregarMensagens(ativa.id)
    } finally { setEnviando(false) }
  }

  const apagar = async (m: Mensagem) => {
    const { error } = await supabase.rpc('chat_interno_apagar_mensagem', { p_mensagem: m.id })
    if (error) { toast.error(error.message); return }
    if (ativa) await carregarMensagens(ativa.id)
  }

  const silenciar = async (c: Conversa) => {
    const { error } = await supabase.rpc('chat_interno_silenciar', { p_conversa: c.id, p_silenciar: !c.silenciada })
    if (error) { toast.error(error.message); return }
    await carregarConversas()
  }

  const abrirAnexo = async (m: Mensagem) => {
    if (!m.anexo_path) return
    const { data, error } = await supabase.storage.from('chat-interno-anexos').createSignedUrl(m.anexo_path, 300)
    if (error || !data?.signedUrl) { toast.error('Não foi possível abrir o anexo.'); return }
    window.open(data.signedUrl, '_blank')
  }

  const abrirNova = async () => {
    const companyId = user?.companyId
    if (!companyId) return
    const { data } = await supabase.from('profiles').select('id, full_name')
      .eq('company_id', companyId).eq('is_active', true).neq('id', meuId).order('full_name')
    setColegas((data ?? []).map(p => ({ id: p.id, nome: p.full_name || 'Colega' })))
    setGrupoNome(''); setGrupoSel(new Set()); setNovaAberta(true)
  }

  const iniciarDireta = async (colegaId: string) => {
    const { data, error } = await supabase.rpc('chat_interno_conversa_direta', { p_outro: colegaId })
    if (error) { toast.error(error.message); return }
    setNovaAberta(false)
    await carregarConversas()
    const c = conversas.find(x => x.id === data)
    if (c) setAtiva(c); else setAtiva({ id: data as string, tipo: 'direta', nome: colegas.find(x => x.id === colegaId)?.nome ?? 'Conversa', criado_por: null, ultima_mensagem_em: null, nao_lidas: 0, silenciada: false })
  }

  const criarGrupo = async () => {
    const { data, error } = await supabase.rpc('chat_interno_criar_grupo', { p_nome: grupoNome, p_participantes: [...grupoSel] })
    if (error) { toast.error(error.message); return }
    setNovaAberta(false)
    await carregarConversas()
    setAtiva({ id: data as string, tipo: 'grupo', nome: grupoNome, criado_por: meuId, ultima_mensagem_em: null, nao_lidas: 0, silenciada: false })
  }

  const abrirPainelGrupo = async () => {
    if (!ativa) return
    const { data } = await supabase.from('chat_interno_participante').select('usuario_id').eq('conversa_id', ativa.id)
    const ids = (data ?? []).map(p => p.usuario_id)
    const { data: perfis } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] as any[] }
    setParticipantes((perfis ?? []).map(p => ({ id: p.id, nome: p.full_name || 'Colega' })))
    setPainelGrupo(true)
  }

  const gerenciar = async (fn: 'chat_interno_grupo_adicionar' | 'chat_interno_grupo_remover', usuarioId: string) => {
    if (!ativa) return
    const { error } = await supabase.rpc(fn, { p_conversa: ativa.id, p_usuario: usuarioId })
    if (error) { toast.error(error.message); return }
    await abrirPainelGrupo()
    await carregarMensagens(ativa.id)
  }

  const sairDoGrupo = async () => {
    if (!ativa) return
    const { error } = await supabase.rpc('chat_interno_sair', { p_conversa: ativa.id })
    if (error) { toast.error(error.message); return }
    setPainelGrupo(false); setAtiva(null); setMensagens([])
    await carregarConversas()
  }

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return b ? conversas.filter(c => c.nome.toLowerCase().includes(b)) : conversas
  }, [conversas, busca])

  if (acesso && !acesso.ver) {
    return <div className="p-8 text-sm text-muted-foreground">O Chat Interno está desligado para esta empresa.</div>
  }

  const souGerenteDoGrupo = ativa?.tipo === 'grupo' && (ativa.criado_por === meuId || acesso?.admin)

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Lista de conversas */}
      <aside className={cn('w-full flex-col rounded-2xl border border-border bg-card md:flex md:w-80', ativa && 'hidden md:flex')}>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conversa" className="pl-9" />
          </div>
          <Button size="icon" variant="outline" onClick={() => void abrirNova()} title="Nova conversa">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtradas.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma conversa. Toque em + para começar.</p>}
          {filtradas.map(c => (
            <button key={c.id} onClick={() => setAtiva(c)}
              className={cn('flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left hover:bg-muted/50', ativa?.id === c.id && 'bg-muted')}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-bg text-sm font-bold text-white">
                {c.tipo === 'direta' ? c.nome.charAt(0).toUpperCase() : <Users className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.tipo === 'direta' ? 'Conversa direta' : c.tipo === 'setor' ? 'Canal do setor' : 'Grupo'}</p>
              </div>
              {c.silenciada && <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
              {c.nao_lidas > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{c.nao_lidas}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* Área da conversa */}
      <section className={cn('flex-1 flex-col rounded-2xl border border-border bg-card', ativa ? 'flex' : 'hidden md:flex')}>
        {!ativa ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Escolha uma conversa para começar.</div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setAtiva(null)}><X className="h-4 w-4" /></Button>
                <div>
                  <p className="text-sm font-semibold">{ativa.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {digitando ? `${digitando} está digitando…` : ativa.tipo === 'direta' ? (ativa.online ? 'online agora' : 'conversa direta') : ativa.tipo === 'setor' ? 'canal do setor' : 'grupo'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" title={ativa.silenciada ? 'Reativar avisos' : 'Silenciar avisos'} onClick={() => void silenciar(ativa)}>
                  {ativa.silenciada ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                {ativa.tipo === 'grupo' && (
                  <Button size="icon" variant="ghost" title="Participantes do grupo" onClick={() => void abrirPainelGrupo()}>
                    <Users className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {mensagens.map(m => (
                <div key={m.id} className={cn('flex', m.tipo === 'sistema' ? 'justify-center' : m.autor_id === meuId ? 'justify-end' : 'justify-start')}>
                  {m.tipo === 'sistema' ? (
                    <p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{m.conteudo}</p>
                  ) : (
                    <div className={cn('group max-w-[75%] rounded-2xl px-3 py-2 text-sm', m.autor_id === meuId ? 'gradient-bg text-white' : 'bg-muted')}>
                      {m.autor_id !== meuId && ativa.tipo !== 'direta' && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.autor_nome}</p>}
                      {m.resposta_preview && (
                        <p className="mb-1 rounded-lg border-l-2 border-current/40 bg-black/10 px-2 py-1 text-xs opacity-80">{m.resposta_preview}</p>
                      )}
                      {m.apagada ? (
                        <p className="italic opacity-60">mensagem apagada</p>
                      ) : (
                        <>
                          {m.tipo === 'anexo' && (
                            <button onClick={() => void abrirAnexo(m)} className="mb-1 flex items-center gap-2 rounded-lg bg-black/10 px-2 py-1 text-xs underline">
                              <Paperclip className="h-3 w-3" />{m.anexo_nome}
                            </button>
                          )}
                          {m.conteudo && <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>}
                        </>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-60">
                        <span>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
                        {!m.apagada && (
                          <span className="hidden gap-1 group-hover:flex">
                            <button onClick={() => setResposta(m)} title="Responder"><Reply className="h-3 w-3" /></button>
                            {m.autor_id === meuId && <button onClick={() => void apagar(m)} title="Excluir"><Trash2 className="h-3 w-3" /></button>}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={fimRef} />
            </div>

            <footer className="border-t border-border p-3">
              {resposta && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-xs">
                  <span className="truncate">Respondendo: {resposta.conteudo ?? resposta.anexo_nome}</span>
                  <button onClick={() => setResposta(null)}><X className="h-3 w-3" /></button>
                </div>
              )}
              {anexo && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-1 truncate"><Paperclip className="h-3 w-3" />{anexo.name}</span>
                  <button onClick={() => setAnexo(null)}><X className="h-3 w-3" /></button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" className="hidden" accept={TIPOS_ANEXO.join(',')}
                  onChange={e => setAnexo(e.target.files?.[0] ?? null)} />
                <Button size="icon" variant="ghost" onClick={() => fileRef.current?.click()} title="Anexar arquivo (até 10 MB)">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input value={texto} onChange={e => { setTexto(e.target.value); avisarDigitando() }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar() } }}
                  placeholder="Escreva uma mensagem…" maxLength={4000} className="flex-1" />
                <Button size="icon" onClick={() => void enviar()} disabled={enviando || (!texto.trim() && !anexo)}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>

      {/* Nova conversa */}
      <Dialog open={novaAberta} onOpenChange={setNovaAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
            <DialogDescription>Converse com um colega ou crie um grupo com vários participantes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Conversa direta</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {colegas.map(c => (
                  <button key={c.id} onClick={() => void iniciarDireta(c.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-bg text-xs font-bold text-white">{c.nome.charAt(0).toUpperCase()}</div>
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Novo grupo</p>
              <Input value={grupoNome} onChange={e => setGrupoNome(e.target.value)} placeholder="Nome do grupo" maxLength={80} className="mb-2" />
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {colegas.map(c => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted">
                    <input type="checkbox" checked={grupoSel.has(c.id)} onChange={e => {
                      const s = new Set(grupoSel)
                      e.target.checked ? s.add(c.id) : s.delete(c.id)
                      setGrupoSel(s)
                    }} />
                    {c.nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaAberta(false)}>Cancelar</Button>
            <Button disabled={!grupoNome.trim() || grupoSel.size === 0} onClick={() => void criarGrupo()}>Criar grupo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Painel do grupo */}
      <Dialog open={painelGrupo} onOpenChange={setPainelGrupo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ativa?.nome}</DialogTitle>
            <DialogDescription>Participantes do grupo.</DialogDescription>
          </DialogHeader>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {participantes.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                <span>{p.nome}{p.id === ativa?.criado_por && <span className="ml-2 text-xs text-muted-foreground">(criador)</span>}</span>
                {souGerenteDoGrupo && p.id !== meuId && (
                  <Button size="icon" variant="ghost" title="Remover do grupo" onClick={() => void gerenciar('chat_interno_grupo_remover', p.id)}>
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {souGerenteDoGrupo && (
            <div className="border-t border-border pt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Adicionar participante</p>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {colegas.filter(c => !participantes.some(p => p.id === c.id)).map(c => (
                  <button key={c.id} onClick={() => void gerenciar('chat_interno_grupo_adicionar', c.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                    <UserPlus className="h-4 w-4" />{c.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPainelGrupo(false)}>Fechar</Button>
            <Button variant="destructive" onClick={() => void sairDoGrupo()}><LogOut className="mr-2 h-4 w-4" />Sair do grupo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
