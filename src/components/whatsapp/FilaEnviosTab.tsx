import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Inbox, MessageSquare, X } from 'lucide-react'

type Linha = {
  id: string; tipo: string; paciente_nome: string | null; telefone_mascarado: string | null
  modelo_posicao: number | null; instancia_id: string | null; status: string
  agendada_para: string | null; enviada_em: string | null; erro: string | null; criado_em: string
}
type Numero = { instancia_id: string; apelido: string | null; enviadas_hoje: number; limite_diario: number | null }
type Sub = 'proximas' | 'enviadas' | 'falhas'

const SUB_STATUS: Record<Sub, string[]> = {
  proximas: ['agendada', 'enviando'],
  enviadas: ['enviada', 'entregue', 'lida'],
  falhas: ['falha'],
}
const BADGE: Record<string, { l: string; c: string }> = {
  agendada: { l: 'Agendada', c: 'bg-warning/15 text-warning' },
  enviando: { l: 'Enviando', c: 'bg-primary/15 text-primary' },
  enviada: { l: 'Enviada', c: 'bg-primary/15 text-primary' },
  entregue: { l: 'Entregue', c: 'bg-success/15 text-success' },
  lida: { l: 'Lida', c: 'bg-success/25 text-success' },
  falha: { l: 'Falhou', c: 'bg-destructive/15 text-destructive' },
}
const PAGE = 25
const TZ = 'America/Fortaleza'
const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
const inicioHoje = () => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: TZ })); d.setHours(0, 0, 0, 0); return d }

function erroLegivel(e: string | null) {
  if (!e) return 'Erro não informado'
  if (/timeout|tempo/i.test(e)) return 'O servidor do WhatsApp não respondeu a tempo (a mensagem pode ter saído).'
  if (/desconect|disconnect/i.test(e)) return 'O número estava desconectado.'
  if (/invalid|inv[aá]lid|not.*exist|n[aã]o existe/i.test(e)) return 'O telefone do paciente não tem WhatsApp ou é inválido.'
  if (/expir|passou|passado/i.test(e)) return 'O horário do agendamento já tinha passado.'
  return e
}

export function FilaEnviosTab({ companyId }: { companyId: string }) {
  const [sub, setSub] = useState<Sub>('proximas')
  const [periodo, setPeriodo] = useState<'hoje' | '7d' | 'custom'>('7d')
  const [de, setDe] = useState(''); const [ate, setAte] = useState('')
  const [numero, setNumero] = useState(''); const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState(''); const [page, setPage] = useState(0)
  const [linhas, setLinhas] = useState<Linha[]>([]); const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [numeros, setNumeros] = useState<Numero[]>([])
  const [resumo, setResumo] = useState({ fila: 0, enviadas: 0, falhas: 0 })
  const [atualizado, setAtualizado] = useState<Date | null>(null)
  const [, tick] = useState(0)
  const [texto, setTexto] = useState<{ nome: string; t: string } | null>(null)
  const [edit, setEdit] = useState<{ l: Linha; data: string; hora: string } | null>(null)
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const recarregar = useRef<() => void>(() => {})

  const intervalo = useMemo(() => {
    if (periodo === 'hoje') return { from: inicioHoje().toISOString(), to: null as string | null }
    if (periodo === '7d') { const d = inicioHoje(); d.setDate(d.getDate() - 6); return { from: d.toISOString(), to: null } }
    return { from: de ? new Date(de + 'T00:00:00-03:00').toISOString() : null, to: ate ? new Date(ate + 'T23:59:59-03:00').toISOString() : null }
  }, [periodo, de, ate])

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    const col = sub === 'proximas' ? 'agendada_para' : sub === 'enviadas' ? 'enviada_em' : 'atualizado_em'
    let q = supabase.from('whatsapp_fila_envios_v' as any)
      .select('id, tipo, paciente_nome, telefone_mascarado, modelo_posicao, instancia_id, status, agendada_para, enviada_em, erro, criado_em', { count: 'exact' })
      .in('status', SUB_STATUS[sub])
    if (sub !== 'proximas') {
      if (intervalo.from) q = q.gte(col, intervalo.from)
      if (intervalo.to) q = q.lte(col, intervalo.to)
    }
    if (numero) q = q.eq('instancia_id', numero)
    if (tipo) q = q.eq('tipo', tipo)
    if (busca.trim()) q = q.ilike('paciente_nome', `%${busca.trim()}%`)
    q = q.order(col, { ascending: sub === 'proximas', nullsFirst: false }).range(page * PAGE, page * PAGE + PAGE - 1)
    const hoje = inicioHoje().toISOString()
    const c = (st: string[], campo?: string) => {
      let r = supabase.from('whatsapp_fila_envios_v' as any).select('id', { count: 'exact', head: true }).in('status', st)
      if (campo) r = r.gte(campo, hoje)
      return r
    }
    const [res, n, f, e, x] = await Promise.all([
      q, supabase.rpc('whatsapp_fila_numeros' as any),
      c(['agendada', 'enviando']), c(SUB_STATUS.enviadas, 'enviada_em'), c(['falha'], 'atualizado_em'),
    ])
    if (res.error) toast.error('Não foi possível carregar a fila.')
    setLinhas((res.data as any) ?? []); setTotal(res.count ?? 0)
    setNumeros((n.data as any) ?? [])
    setResumo({ fila: f.count ?? 0, enviadas: e.count ?? 0, falhas: x.count ?? 0 })
    setAtualizado(new Date()); setLoading(false)
  }, [sub, intervalo, numero, tipo, busca, page])

  useEffect(() => { recarregar.current = () => void carregar(true) }, [carregar])
  useEffect(() => { const t = setTimeout(() => void carregar(), busca ? 300 : 0); return () => clearTimeout(t) }, [carregar, busca])
  useEffect(() => { setPage(0) }, [sub, periodo, de, ate, numero, tipo, busca])
  useEffect(() => { const i = setInterval(() => tick(v => v + 1), 15000); return () => clearInterval(i) }, [])

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const ch = supabase.channel(`wa-fila-${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_fila_eventos', filter: `company_id=eq.${companyId}` },
        () => { clearTimeout(t); t = setTimeout(() => recarregar.current(), 800) })
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [companyId])

  const apelido = (id: string | null) => numeros.find(n => n.instancia_id === id)?.apelido ?? '—'

  const cancelar = async (l: Linha) => {
    if (!window.confirm(`Cancelar a mensagem para ${l.paciente_nome}? Ela sairá da fila e não será enviada.`)) return
    const { data, error } = await supabase.rpc('whatsapp_fila_cancelar' as any, { p_id: l.id })
    if (error || data !== 'OK') toast.error(data === 'NAO_CANCELAVEL' ? 'Essa mensagem já está sendo enviada e não pode mais ser cancelada.' : 'Não foi possível cancelar.')
    else { toast.success('Mensagem cancelada.'); void carregar(true) }
  }
  const reenviar = async (l: Linha) => {
    if (!window.confirm('Reenviar esta mensagem?\n\nSe o envio anterior chegou a sair, o paciente poderá receber duas mensagens.')) return
    const { data, error } = await supabase.rpc('whatsapp_fila_reenviar' as any, { p_id: l.id })
    if (error || data !== 'OK') toast.error(data === 'JA_EXISTE_ATIVA' ? 'Já existe outra mensagem ativa para este agendamento.' : 'Não foi possível reenviar.')
    else { toast.success('Mensagem voltou para a fila.'); void carregar(true) }
  }
  const abrirEdicao = (l: Linha) => {
    const d = l.agendada_para ? new Date(l.agendada_para) : new Date()
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d)
    const g = (t: string) => p.find(x => x.type === t)?.value ?? ''
    setEdit({ l, data: `${g('year')}-${g('month')}-${g('day')}`, hora: `${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}` })
  }
  const salvarEdicao = async () => {
    if (!edit?.data || !edit.hora) { toast.error('Informe data e hora.'); return }
    const quando = new Date(`${edit.data}T${edit.hora}:00-03:00`)
    if (quando.getTime() < Date.now() - 60000) { toast.error('Escolha um horário a partir de agora.'); return }
    setSalvandoEdit(true)
    const { data, error } = await supabase.rpc('whatsapp_fila_reagendar' as any, { p_id: edit.l.id, p_quando: quando.toISOString() })
    setSalvandoEdit(false)
    if (error || data !== 'OK') { toast.error(data === 'NAO_EDITAVEL' ? 'Essa mensagem já saiu da fila e não pode mais ser alterada.' : data === 'NO_PASSADO' ? 'Escolha um horário a partir de agora.' : 'Não foi possível alterar.'); return }
    toast.success('Horário de envio alterado.'); setEdit(null); void carregar(true)
  }
  const verTexto = async (l: Linha) => {
    const { data, error } = await supabase.rpc('whatsapp_fila_texto' as any, { p_id: l.id })
    if (error || !data) { toast.error('Não foi possível abrir a mensagem.'); return }
    setTexto({ nome: l.paciente_nome ?? '', t: data as string })
  }

  const seg = atualizado ? Math.floor((Date.now() - atualizado.getTime()) / 1000) : null
  const sel = 'h-10 rounded-lg border border-input bg-background px-3 text-sm'
  const paginas = Math.max(1, Math.ceil(total / PAGE))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[['Na fila', resumo.fila], ['Enviadas hoje', resumo.enviadas], ['Falhas hoje', resumo.falhas]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold text-foreground">{v}</p>
          </div>
        ))}
      </div>
      {numeros.length > 0 && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {numeros.map(n => (
            <div key={n.instancia_id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-foreground">{n.apelido ?? 'Número'}</span>
              <span className="text-muted-foreground">{n.enviadas_hoje} / {n.limite_diario ?? 'sem limite'} hoje</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(['proximas', 'enviadas', 'falhas'] as Sub[]).map(s => (
            <button key={s} onClick={() => setSub(s)}
              className={`h-9 rounded-md px-3 text-sm ${sub === s ? 'bg-background font-semibold text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              {s === 'proximas' ? 'Próximas' : s === 'enviadas' ? 'Enviadas' : 'Falhas'}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          {seg === null ? '' : seg < 30 ? 'Atualizado agora' : `Atualizado há ${Math.floor(seg / 60) || 1} min`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {sub !== 'proximas' && (
          <select value={periodo} onChange={e => setPeriodo(e.target.value as any)} className={sel}>
            <option value="hoje">Hoje</option><option value="7d">Últimos 7 dias</option><option value="custom">Personalizado</option>
          </select>
        )}
        {sub !== 'proximas' && periodo === 'custom' && <>
          <input type="date" value={de} onChange={e => setDe(e.target.value)} className={sel} aria-label="De" />
          <input type="date" value={ate} onChange={e => setAte(e.target.value)} className={sel} aria-label="Até" />
        </>}
        <select value={numero} onChange={e => setNumero(e.target.value)} className={sel}>
          <option value="">Todos os números</option>
          {numeros.map(n => <option key={n.instancia_id} value={n.instancia_id}>{n.apelido}</option>)}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)} className={sel}>
          <option value="">Todos os tipos</option><option value="confirmacao_agendamento">Confirmação</option><option value="teste">Teste</option>
        </select>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar paciente" className={`${sel} flex-1 min-w-[160px]`} />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : linhas.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold text-foreground">
            {sub === 'proximas' ? 'Nenhuma mensagem aguardando envio' : sub === 'enviadas' ? 'Nenhuma mensagem enviada neste período' : 'Nenhuma falha neste período'}
          </p>
          <p className="text-sm text-muted-foreground">As confirmações de agendamento aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-3 text-xs font-medium text-muted-foreground">
            <span>Paciente</span><span>Telefone</span><span>{sub === 'proximas' ? 'Agendada para' : sub === 'enviadas' ? 'Enviada em · número' : 'Erro'}</span><span>Status</span><span />
          </div>
          {linhas.map(l => {
            const b = BADGE[l.status] ?? BADGE.agendada
            return (
              <div key={l.id} className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto] md:items-center md:gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{l.paciente_nome ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{l.tipo === 'teste' ? 'Teste' : 'Confirmação'}{l.modelo_posicao ? ` · Modelo ${l.modelo_posicao}` : ''}</p>
                </div>
                <p className="text-sm text-muted-foreground">{l.telefone_mascarado}</p>
                <div className="text-sm text-muted-foreground">
                  {sub === 'proximas' && (l.status === 'agendada'
                    ? <button className="underline decoration-dotted underline-offset-2 hover:text-primary" title="Alterar data e hora do envio" onClick={() => abrirEdicao(l)}>{fmt(l.agendada_para)}</button>
                    : fmt(l.agendada_para))}
                  {sub === 'enviadas' && <>{fmt(l.enviada_em)} · {apelido(l.instancia_id)}</>}
                  {sub === 'falhas' && <span className="text-destructive">{erroLegivel(l.erro)}</span>}
                </div>
                <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${b.c}`}>{b.l}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => verTexto(l)}><MessageSquare className="mr-1 h-3.5 w-3.5" />Ver mensagem</Button>
                  {sub === 'proximas' && l.status === 'agendada' && <Button size="sm" variant="outline" onClick={() => cancelar(l)}>Cancelar</Button>}
                  {sub === 'falhas' && <Button size="sm" variant="outline" onClick={() => reenviar(l)}>Reenviar</Button>}
                </div>
              </div>
            )
          })}
          {total > PAGE && (
            <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
              <span>Página {page + 1} de {paginas} · {total} mensagens</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= paginas} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Enviada = saiu pelo WhatsApp; Entregue = chegou ao celular; Lida = paciente abriu. Lida pode não aparecer se o paciente desativou a confirmação de leitura.
      </p>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">Alterar envio para {edit.l.paciente_nome}</p>
              <Button size="icon" variant="ghost" onClick={() => setEdit(null)} aria-label="Fechar"><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-muted-foreground">Data
                <input type="date" value={edit.data} onChange={e => setEdit({ ...edit, data: e.target.value })} className={`${sel} w-full`} />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">Hora
                <input type="time" value={edit.hora} onChange={e => setEdit({ ...edit, hora: e.target.value })} className={`${sel} w-full`} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">A mensagem só sai dentro do horário de envio da empresa e com o envio automático ligado.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
              <Button disabled={salvandoEdit} onClick={() => void salvarEdicao()}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {texto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setTexto(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-foreground">Mensagem para {texto.nome}</p>
              <Button size="icon" variant="ghost" onClick={() => setTexto(null)} aria-label="Fechar"><X className="h-4 w-4" /></Button>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <div className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-success/15 px-3 py-2 text-sm text-foreground">{texto.t}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
