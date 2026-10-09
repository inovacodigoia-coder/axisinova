import { useEffect, useMemo, useState, useCallback } from 'react'
import { useScheduling } from '@/context/SchedulingContext'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Check, AlertTriangle, Clock, Send, XCircle, RefreshCw } from 'lucide-react'

type Linha = {
  id: string
  agendamento_id: string | null
  paciente_nome: string | null
  telefone_mascarado: string | null
  modelo_posicao: number | null
  texto_resumo: string | null
  status: string
  agendada_para: string | null
  enviada_em: string | null
  erro: string | null
  resposta_acao: string | null
  respondida_em: string | null
}

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  agendada: { label: 'Agendada', cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  enviando: { label: 'Enviando', cls: 'bg-blue-100 text-blue-700', icon: Send },
  enviada: { label: 'Enviada', cls: 'bg-blue-100 text-blue-700', icon: Send },
  entregue: { label: 'Entregue', cls: 'bg-blue-100 text-blue-700', icon: Send },
  lida: { label: 'Lida', cls: 'bg-blue-100 text-blue-700', icon: Send },
  falha: { label: 'Falhou', cls: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelada: { label: 'Cancelada', cls: 'bg-muted text-muted-foreground', icon: XCircle },
}
const ENVIADAS = ['enviada', 'entregue', 'lida']

const fmt = (iso?: string | null) => iso
  ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : ''

export default function ConfirmationsPage() {
  const { appointments, updateAppointment, isDemo } = useScheduling()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ativas')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('whatsapp_fila_envios_v' as any)
      .select('id, agendamento_id, paciente_nome, telefone_mascarado, modelo_posicao, texto_resumo, status, agendada_para, enviada_em, erro, resposta_acao, respondida_em')
      .eq('tipo', 'confirmacao_agendamento')
      .order('agendada_para', { ascending: false })
      .limit(500)
    if (error) { console.error('[Confirmações]', error); toast.error('Não foi possível carregar as confirmações.') }
    setLinhas((data as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (!isDemo) load(); else setLoading(false) }, [load, isDemo])
  // Mantém a Central em sincronia com a Agenda e a fila (respostas do paciente chegam pelo servidor)
  useEffect(() => {
    if (isDemo) return
    const t = setInterval(() => { load() }, 30000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [load, isDemo])

  const aptById = useMemo(() => new Map(appointments.map(a => [a.id, a])), [appointments])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return linhas
    if (statusFilter === 'ativas') return linhas.filter(l => l.status !== 'cancelada')
    if (statusFilter === 'pede_remarcar') return linhas.filter(l => l.agendamento_id && aptById.get(l.agendamento_id)?.pedidoPaciente === 'remarcar')
    if (statusFilter === 'pede_cancelar') return linhas.filter(l => l.agendamento_id && aptById.get(l.agendamento_id)?.pedidoPaciente === 'cancelar')
    if (statusFilter === 'confirmou') return linhas.filter(l => l.resposta_acao === 'confirmar' || (l.agendamento_id && aptById.get(l.agendamento_id)?.status === 'confirmed'))
    if (statusFilter === 'enviada') return linhas.filter(l => ENVIADAS.includes(l.status))
    return linhas.filter(l => l.status === statusFilter)
  }, [linhas, statusFilter, aptById])

  const { visibleItems, totalItems, hasMore, showMore, showAll, remainingCount } = usePaginatedList(filtered, 10)

  const counts = {
    agendada: linhas.filter(l => l.status === 'agendada').length,
    enviada: linhas.filter(l => ENVIADAS.includes(l.status)).length,
    falha: linhas.filter(l => l.status === 'falha').length,
  }

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Central de Confirmações</h1>
        <p className="text-sm text-muted-foreground">Confirmações de agendamento por WhatsApp</p>
      </div>
      <button onClick={load} className="flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
      </button>
    </div>
  )

  if (!loading && linhas.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <span className="text-4xl">📞</span>
          <h3 className="text-lg font-bold text-foreground">Nenhuma confirmação programada</h3>
          <p className="text-sm text-muted-foreground">Ao salvar um agendamento com "Enviar confirmação automática" ligado, ele aparece aqui.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="ativas">Todas (sem canceladas)</option>
          <option value="agendada">Agendadas</option>
          <option value="enviada">Enviadas</option>
          <option value="falha">Falharam</option>
          <option value="confirmou">Confirmaram pelo WhatsApp</option>
          <option value="pede_remarcar">Pediram remarcar</option>
          <option value="pede_cancelar">Pediram cancelar</option>
          <option value="cancelada">Canceladas</option>
          <option value="all">Todas</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700 font-medium">{counts.agendada} agendadas</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 font-medium">{counts.enviada} enviadas</span>
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 font-medium">{counts.falha} falharam</span>
        </div>
      </div>

      <div className="space-y-3">
        {visibleItems.map(l => {
          const apt = l.agendamento_id ? aptById.get(l.agendamento_id) : undefined
          const st = STATUS[l.status] || STATUS.agendada
          const Icon = st.icon
          const confirmado = apt?.status === 'confirmed' || l.resposta_acao === 'confirmar'
          const cancelado = apt?.status === 'cancelled'
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 flex-wrap">
                {apt && <span className="text-sm font-semibold text-foreground">📅 {apt.date.split('-').reverse().join('/')} às {apt.time}</span>}
                {apt && <span className="text-sm text-muted-foreground">{apt.doctorName}</span>}
                <span className="ml-auto flex items-center gap-1">
                  {confirmado && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-green-100 text-green-700">
                      <Check className="h-3 w-3" /> Confirmado{l.resposta_acao === 'confirmar' ? ' pelo WhatsApp' : ' na Agenda'}
                    </span>
                  )}
                  {cancelado && (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-destructive/10 text-destructive">Agendamento cancelado</span>
                  )}
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>
                    <Icon className="h-3 w-3" /> {st.label}
                  </span>
                </span>
              </div>
              <p className="text-sm font-medium text-foreground mt-1">👤 {l.paciente_nome}</p>
              <p className="text-xs text-muted-foreground">📞 {l.telefone_mascarado}{l.modelo_posicao ? ` · Modelo ${l.modelo_posicao}` : ''}</p>
              {l.texto_resumo && <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground italic">{l.texto_resumo}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {ENVIADAS.includes(l.status) ? `Enviada em ${fmt(l.enviada_em)}` : l.status === 'agendada' ? `Envio previsto: ${fmt(l.agendada_para)}` : ''}
                {l.status === 'falha' && l.erro ? `Motivo: ${l.erro}` : ''}
              </p>
              {apt?.pedidoPaciente && (
                <p className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${apt.pedidoPaciente === 'remarcar' ? 'bg-warning/15 text-warning' : 'bg-destructive/10 text-destructive'}`}>
                  Paciente pediu para {apt.pedidoPaciente}{apt.pedidoPacienteEm ? ` em ${fmt(apt.pedidoPacienteEm)}` : ''}
                </p>
              )}
              {apt && l.status !== 'cancelada' && (
                <div className="flex gap-2 mt-3">
                  {confirmado ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Check className="h-3 w-3" /> Paciente confirmou</span>
                  ) : (
                    <button onClick={() => { updateAppointment(apt.id, { status: 'confirmed' as any }); toast.success('Presença confirmada.') }}
                      className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100">
                      <Check className="h-3 w-3" /> Paciente Confirmou
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">Exibindo {visibleItems.length} de {totalItems}</span>
          <div className="flex gap-2">
            <button onClick={showMore} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Mostrar mais {Math.min(10, remainingCount)}</button>
            {remainingCount > 10 && <button onClick={showAll} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Ver todos ({totalItems})</button>}
          </div>
        </div>
      )}
    </div>
  )
}
