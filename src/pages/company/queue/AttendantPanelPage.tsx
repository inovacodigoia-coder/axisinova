import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { TicketCard } from '@/components/queue/attendant/TicketCard'
import { FinalizedTicketCard } from '@/components/queue/attendant/FinalizedTicketCard'
import { TicketTimelineModal } from '@/components/queue/attendant/TicketTimelineModal'
import { TicketReallocateModal } from '@/components/queue/attendant/TicketReallocateModal'
import { TicketFinalizeModal } from '@/components/queue/attendant/TicketFinalizeModal'
import { SelectQueuesModal } from '@/components/queue/attendant/SelectQueuesModal'
import { DeviceSelector } from '@/components/queue/selector/DeviceSelector'
import type { Ticket, TicketStatus } from '@/types/queue-system.types'

const DEMO_COMPANY_ID = 'comp_001'

function mapDbTicket(row: any): Ticket {
  const callCount = row.status === 'waiting' ? 0 : 1
  return {
    id: row.id,
    unitId: row.unit_id,
    queueLineId: row.queue_line_id,
    queueLineName: row.queue_line_name,
    prefix: row.prefix,
    number: row.number,
    displayCode: row.display_code,
    status: row.status as TicketStatus,
    guicheId: row.guiche_id || undefined,
    guicheName: row.guiche_name || undefined,
    callCount,
    patientName: row.patient_name || undefined,
    attendantName: row.attendant_name || undefined,
    generatedAt: row.generated_at,
    calledAt: row.called_at || undefined,
    attendanceStartedAt: row.attendance_started_at || undefined,
    finalizedAt: row.finalized_at || undefined,
    timeline: [],
  }
}

export default function AttendantPanelPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, dispatch, getUnitQueues, getUnitGuiches, getUnitTVs, getUnitTickets } = useQueueSystem()
  const isDemo = user?.companyId === DEMO_COMPANY_ID

  const [showFinalized, setShowFinalized] = useState(false)
  const [showSelectQueues, setShowSelectQueues] = useState(false)
  const [selectedQueues, setSelectedQueues] = useState<string[]>([])
  const [tvId, setTvId] = useState('')
  const [guicheId, setGuicheId] = useState('')
  const [timelineTicket, setTimelineTicket] = useState<Ticket | null>(null)
  const [reallocateTicket, setReallocateTicket] = useState<Ticket | null>(null)
  const [finalizeTicket, setFinalizeTicket] = useState<Ticket | null>(null)
  const [dbTickets, setDbTickets] = useState<Ticket[]>([])

  // Restore session
  useEffect(() => {
    if (!state.attendantSession) {
      const saved = sessionStorage.getItem('attendant_session')
      if (saved) {
        const session = JSON.parse(saved)
        dispatch({ type: 'SET_ATTENDANT_SESSION', payload: session })
        if (session.selectedQueueLineIds) setSelectedQueues(session.selectedQueueLineIds)
        if (session.tvId) setTvId(session.tvId)
        if (session.guicheId) setGuicheId(session.guicheId)
      } else {
        navigate('/app/filas/atendente')
      }
    } else {
      if (state.attendantSession.selectedQueueLineIds.length) setSelectedQueues(state.attendantSession.selectedQueueLineIds)
    }
  }, [])

  const session = state.attendantSession
  const unitId = session?.unitId || ''
  const unitName = session?.unitName || ''
  const attendantName = user?.name || 'Atendente'

  const queues = useMemo(() => getUnitQueues(unitId), [unitId, getUnitQueues])
  const guiches = useMemo(() => getUnitGuiches(unitId), [unitId, getUnitGuiches])
  const tvs = useMemo(() => getUnitTVs(unitId), [unitId, getUnitTVs])
  const internalQueues = useMemo(() => queues.filter(q => q.type === 'internal'), [queues])

  // Load tickets from Supabase for non-demo companies (today, this unit)
  const loadDbTickets = useCallback(async () => {
    if (isDemo || !unitId) return
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)
    const { data, error } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('unit_id', unitId)
      .gte('generated_at', startOfDay.toISOString())
      .order('generated_at', { ascending: true })
    if (error) { console.error('loadDbTickets error', error); return }
    setDbTickets((data || []).map(mapDbTicket))
  }, [isDemo, unitId])

  useEffect(() => {
    if (isDemo || !unitId) return
    loadDbTickets()
    const channel = supabase.channel(`attendant_tickets_${unitId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets', filter: `unit_id=eq.${unitId}` },
        () => loadDbTickets())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isDemo, unitId, loadDbTickets])

  const allTickets = useMemo(() => {
    const list = isDemo ? getUnitTickets(unitId, selectedQueues.length ? selectedQueues : undefined) : dbTickets
    if (!isDemo && selectedQueues.length) return list.filter(t => selectedQueues.includes(t.queueLineId))
    return list
  }, [isDemo, unitId, selectedQueues, getUnitTickets, dbTickets])

  const activeTickets = useMemo(() => allTickets.filter(t => !['finalized', 'reallocated'].includes(t.status)), [allTickets])
  const finalizedTickets = useMemo(() => allTickets.filter(t => t.status === 'finalized'), [allTickets])

  const guicheName = guiches.find(g => g.id === guicheId)?.name || ''
  const tvName = tvs.find(t => t.id === tvId)?.name || ''

  const handleCall = async (ticketId: string) => {
    if (!tvId) { toast.warning('Selecione uma TV antes de chamar'); return }
    if (!guicheId) { toast.warning('Selecione um guichê'); return }
    if (isDemo) {
      dispatch({ type: 'CALL_TICKET', payload: { ticketId, guicheId, guicheName, tvId, attendantName } })
    } else {
      const { error } = await supabase.from('queue_tickets').update({
        status: 'called',
        called_at: new Date().toISOString(),
        guiche_id: guicheId,
        guiche_name: guicheName,
        attendant_name: attendantName,
      }).eq('id', ticketId)
      if (error) { toast.error('Erro ao chamar ficha: ' + error.message); return }
    }
    try {
      const ctx = new AudioContext()
      const beep = (freq: number, start: number, dur: number) => { const o = ctx.createOscillator(); o.frequency.value = freq; o.connect(ctx.destination); o.start(start); o.stop(start + dur) }
      beep(440, ctx.currentTime, 0.2); beep(440, ctx.currentTime + 0.3, 0.2)
    } catch {}
    toast.success('Ficha chamada!')
  }

  const handleAttend = async (ticketId: string) => {
    if (isDemo) {
      dispatch({ type: 'ATTEND_TICKET', payload: { ticketId, attendantName, guicheName } })
    } else {
      const { error } = await supabase.from('queue_tickets').update({
        status: 'in_attendance',
        attendance_started_at: new Date().toISOString(),
        attendant_name: attendantName,
      }).eq('id', ticketId)
      if (error) { toast.error('Erro ao iniciar: ' + error.message); return }
    }
    toast.success('Em atendimento')
  }

  const handleReallocate = async (ticketId: string, queueId: string, queueName: string, patientName?: string) => {
    if (isDemo) {
      dispatch({ type: 'REALLOCATE_TICKET', payload: { ticketId, queueId, queueName, patientName, attendantName } })
    } else {
      const { error } = await supabase.from('queue_tickets').update({
        status: 'reallocated',
        queue_line_id: queueId,
        queue_line_name: queueName,
        patient_name: patientName || undefined,
      }).eq('id', ticketId)
      if (error) { toast.error('Erro ao realocar: ' + error.message); return }
    }
    setReallocateTicket(null)
    toast.success('Ficha realocada')
  }

  const handleFinalize = async (ticketId: string) => {
    if (isDemo) {
      dispatch({ type: 'FINALIZE_TICKET', payload: { ticketId, attendantName } })
    } else {
      const { error } = await supabase.from('queue_tickets').update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
      }).eq('id', ticketId)
      if (error) { toast.error('Erro ao finalizar: ' + error.message); return }
    }
    setFinalizeTicket(null)
    toast.success('Ficha finalizada')
  }

  const handleReactivate = async (ticketId: string) => {
    if (isDemo) {
      dispatch({ type: 'REACTIVATE_TICKET', payload: { ticketId, attendantName } })
    } else {
      const { error } = await supabase.from('queue_tickets').update({
        status: 'waiting',
        finalized_at: null,
      }).eq('id', ticketId)
      if (error) { toast.error('Erro ao reativar: ' + error.message); return }
    }
    toast.success('Ficha reativada')
  }

  const handleSaveQueues = (ids: string[]) => {
    setSelectedQueues(ids)
    const updated = { ...session!, selectedQueueLineIds: ids }
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: updated })
    sessionStorage.setItem('attendant_session', JSON.stringify(updated))
    setShowSelectQueues(false)
  }

  const handleBack = () => {
    sessionStorage.removeItem('attendant_session')
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: null })
    navigate('/app/filas/atendente')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-[hsl(222,70%,35%)] text-white px-6 py-3.5 flex items-center">
        <h1 className="text-lg font-bold">Chame Rápido</h1>
      </header>

      <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-foreground border border-border rounded-md px-3 py-1.5">
          Unidade: {unitName}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowSelectQueues(true)} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/5 transition-colors">
            Selecionar filas {selectedQueues.length > 0 && `(${selectedQueues.length})`}
          </button>
          <button onClick={() => setShowFinalized(!showFinalized)} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/5 transition-colors">
            {showFinalized ? 'Ver fichas ativas' : 'Ver fichas finalizadas'}
          </button>
          <button onClick={handleBack} className="rounded-lg bg-[hsl(222,70%,35%)] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-[hsl(222,70%,30%)] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 space-y-4 max-w-5xl mx-auto w-full">
        <h2 className="text-lg font-bold text-foreground">Lista de Fichas</h2>

        {!selectedQueues.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma fila selecionada. Clique em &quot;Selecionar filas&quot; para começar.</p>
        ) : (
          <>
            <div className="flex gap-4 flex-wrap">
              <div className="w-56">
                <DeviceSelector items={tvs} value={tvId} onChange={setTvId} label="Selecionar TV" />
              </div>
              <div className="w-56">
                <DeviceSelector items={guiches} value={guicheId} onChange={setGuicheId} label="Selecionar Guichê" />
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {!showFinalized && activeTickets.map(t => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onCall={() => handleCall(t.id)}
                    onAttend={() => handleAttend(t.id)}
                    onReallocate={() => setReallocateTicket(t)}
                    onFinalize={() => setFinalizeTicket(t)}
                    onTimeline={() => setTimelineTicket(t)}
                  />
                ))}
                {showFinalized && finalizedTickets.map(t => (
                  <FinalizedTicketCard
                    key={t.id}
                    ticket={t}
                    onTimeline={() => setTimelineTicket(t)}
                    onReactivate={() => handleReactivate(t.id)}
                  />
                ))}
              </AnimatePresence>
              {!showFinalized && !activeTickets.length && <p className="text-sm text-muted-foreground">Nenhuma ficha ativa</p>}
              {showFinalized && !finalizedTickets.length && <p className="text-sm text-muted-foreground">Nenhuma ficha finalizada</p>}
            </div>
          </>
        )}
      </main>

      {showSelectQueues && (
        <SelectQueuesModal queues={queues} selected={selectedQueues} onSave={handleSaveQueues} onClose={() => setShowSelectQueues(false)} />
      )}
      {timelineTicket && <TicketTimelineModal ticket={timelineTicket} onClose={() => setTimelineTicket(null)} />}
      {reallocateTicket && (
        <TicketReallocateModal
          ticket={reallocateTicket}
          internalQueues={internalQueues}
          onConfirm={(qId, qName, pName) => handleReallocate(reallocateTicket.id, qId, qName, pName)}
          onClose={() => setReallocateTicket(null)}
        />
      )}
      {finalizeTicket && (
        <TicketFinalizeModal
          ticket={finalizeTicket}
          onConfirm={() => handleFinalize(finalizeTicket.id)}
          onClose={() => setFinalizeTicket(null)}
        />
      )}
    </div>
  )
}
