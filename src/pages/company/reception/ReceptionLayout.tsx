import { useState, useEffect, useMemo } from 'react'
import { useQueue } from '@/context/QueueContext'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Users, Stethoscope, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import ActiveAttendancePage from './ActiveAttendancePage'
import { UnitSelector } from '@/components/queue/selector/UnitSelector'
import { DeviceSelector } from '@/components/queue/selector/DeviceSelector'
import { TicketCard } from '@/components/queue/attendant/TicketCard'
import { FinalizedTicketCard } from '@/components/queue/attendant/FinalizedTicketCard'
import { TicketTimelineModal } from '@/components/queue/attendant/TicketTimelineModal'
import { TicketReallocateModal } from '@/components/queue/attendant/TicketReallocateModal'
import { TicketFinalizeModal } from '@/components/queue/attendant/TicketFinalizeModal'
import { SelectQueuesModal } from '@/components/queue/attendant/SelectQueuesModal'
import type { Ticket } from '@/types/queue-system.types'

export default function ReceptionLayout() {
  const { stats } = useQueue()
  const { user } = useAuth()
  const { state, dispatch, getUnitQueues, getUnitGuiches, getUnitTVs, getUnitTickets } = useQueueSystem()

  const [activeTab, setActiveTab] = useState<'queue' | 'attendance'>('queue')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const now = new Date()

  // Queue system attendant state
  const [unitId, setUnitId] = useState('')
  const [unitConfirmed, setUnitConfirmed] = useState(false)
  const [showFinalized, setShowFinalized] = useState(false)
  const [showSelectQueues, setShowSelectQueues] = useState(false)
  const [selectedQueues, setSelectedQueues] = useState<string[]>([])
  const [tvId, setTvId] = useState('')
  const [guicheId, setGuicheId] = useState('')
  const [timelineTicket, setTimelineTicket] = useState<Ticket | null>(null)
  const [reallocateTicket, setReallocateTicket] = useState<Ticket | null>(null)
  const [finalizeTicket, setFinalizeTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(id)
  }, [])

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem('reception_attendant_session')
    if (saved) {
      const session = JSON.parse(saved)
      setUnitId(session.unitId || '')
      setUnitConfirmed(true)
      if (session.selectedQueueLineIds) setSelectedQueues(session.selectedQueueLineIds)
      if (session.tvId) setTvId(session.tvId)
      if (session.guicheId) setGuicheId(session.guicheId)
      dispatch({ type: 'SET_ATTENDANT_SESSION', payload: session })
    }
  }, [])

  const unitName = state.units.find(u => u.id === unitId)?.name || ''
  const attendantName = user?.name || 'Atendente'
  const queues = useMemo(() => getUnitQueues(unitId), [unitId, getUnitQueues])
  const guiches = useMemo(() => getUnitGuiches(unitId), [unitId, getUnitGuiches])
  const tvs = useMemo(() => getUnitTVs(unitId), [unitId, getUnitTVs])
  const internalQueues = useMemo(() => queues.filter(q => q.type === 'internal'), [queues])
  const allTickets = useMemo(() => getUnitTickets(unitId, selectedQueues.length ? selectedQueues : undefined), [unitId, selectedQueues, getUnitTickets])
  const activeTickets = useMemo(() => allTickets.filter(t => !['finalized', 'reallocated'].includes(t.status)), [allTickets])
  const finalizedTickets = useMemo(() => allTickets.filter(t => t.status === 'finalized'), [allTickets])
  const guicheName = guiches.find(g => g.id === guicheId)?.name || ''

  const handleConfirmUnit = () => {
    if (!unitId) return
    const session = { unitId, unitName, selectedQueueLineIds: [] as string[], showFinalized: false }
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: session })
    sessionStorage.setItem('reception_attendant_session', JSON.stringify(session))
    setUnitConfirmed(true)
  }

  const handleBackToSelector = () => {
    setUnitConfirmed(false)
    setSelectedQueues([])
    setTvId('')
    setGuicheId('')
    sessionStorage.removeItem('reception_attendant_session')
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: null })
  }

  const persistSession = (updates: Record<string, any>) => {
    const current = JSON.parse(sessionStorage.getItem('reception_attendant_session') || '{}')
    const updated = { ...current, ...updates }
    sessionStorage.setItem('reception_attendant_session', JSON.stringify(updated))
  }

  const handleCall = (ticketId: string) => {
    if (!tvId) { toast.warning('Selecione uma TV antes de chamar'); return }
    if (!guicheId) { toast.warning('Selecione um guichê'); return }
    dispatch({ type: 'CALL_TICKET', payload: { ticketId, guicheId, guicheName, tvId, attendantName } })
    try {
      const ctx = new AudioContext()
      const beep = (freq: number, start: number, dur: number) => { const o = ctx.createOscillator(); o.frequency.value = freq; o.connect(ctx.destination); o.start(start); o.stop(start + dur) }
      beep(440, ctx.currentTime, 0.2)
      beep(440, ctx.currentTime + 0.3, 0.2)
    } catch {}
    toast.success('Ficha chamada!')
  }

  const handleAttend = (ticketId: string) => {
    dispatch({ type: 'ATTEND_TICKET', payload: { ticketId, attendantName, guicheName } })
    toast.success('Em atendimento')
  }

  const handleReallocate = (ticketId: string, queueId: string, queueName: string, patientName?: string) => {
    dispatch({ type: 'REALLOCATE_TICKET', payload: { ticketId, queueId, queueName, patientName, attendantName } })
    setReallocateTicket(null)
    toast.success('Ficha realocada')
  }

  const handleFinalize = (ticketId: string) => {
    dispatch({ type: 'FINALIZE_TICKET', payload: { ticketId, attendantName } })
    setFinalizeTicket(null)
    toast.success('Ficha finalizada')
  }

  const handleReactivate = (ticketId: string) => {
    dispatch({ type: 'REACTIVATE_TICKET', payload: { ticketId, attendantName } })
    toast.success('Ficha reativada')
  }

  const handleSaveQueues = (ids: string[]) => {
    setSelectedQueues(ids)
    persistSession({ selectedQueueLineIds: ids })
    const updated = { unitId, unitName, selectedQueueLineIds: ids, showFinalized: false }
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: updated })
    setShowSelectQueues(false)
  }

  const goToAttendance = (id: string) => {
    setSelectedPatientId(id)
    setActiveTab('attendance')
  }

  const activeTicketCount = activeTickets.length

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Recepção</h1>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {time}</p>
        </div>
      </div>

      {/* Submenu */}
      <div className="flex gap-1 mb-4 rounded-xl border border-border bg-card p-1">
        <button onClick={() => setActiveTab('queue')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
            activeTab === 'queue'
              ? 'gradient-bg text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}>
          <Users className="h-4 w-4" />
          FILA DE ESPERA
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', activeTab === 'queue' ? 'bg-white/20' : 'bg-muted')}>
            {unitConfirmed ? activeTicketCount : stats.waiting}
          </span>
        </button>
        <button onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
            activeTab === 'attendance'
              ? 'gradient-bg text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}>
          <Stethoscope className="h-4 w-4" />
          ATENDIMENTO ATIVO
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', activeTab === 'attendance' ? 'bg-white/20' : 'bg-muted')}>
            {stats.inProgress}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'queue' ? (
          !unitConfirmed ? (
            /* Step 1: Select Unit */
            <div className="flex items-center justify-center h-full">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg space-y-6">
                <h2 className="text-xl font-bold text-foreground text-center">Selecione a unidade</h2>
                <UnitSelector units={state.units} value={unitId} onChange={setUnitId} />
                <button
                  onClick={handleConfirmUnit}
                  disabled={!unitId}
                  className="w-full rounded-lg bg-[hsl(222,70%,35%)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[hsl(222,70%,30%)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Attendant Panel */
            <div className="h-full flex flex-col space-y-3">
              {/* Sub-header controls */}
              <div className="flex items-center justify-between flex-wrap gap-2">
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
                  <button onClick={handleBackToSelector} className="rounded-lg bg-[hsl(222,70%,35%)] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-[hsl(222,70%,30%)] transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-bold text-foreground">Lista de Fichas</h2>

              {!selectedQueues.length ? (
                <p className="text-sm text-muted-foreground">Nenhuma fila selecionada. Clique em &quot;Selecionar filas&quot; para começar.</p>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {/* TV + Guichê selectors */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="w-56">
                      <DeviceSelector items={tvs} value={tvId} onChange={v => { setTvId(v); persistSession({ tvId: v }) }} label="Selecionar TV" />
                    </div>
                    <div className="w-56">
                      <DeviceSelector items={guiches} value={guicheId} onChange={v => { setGuicheId(v); persistSession({ guicheId: v }) }} label="Selecionar Guichê" />
                    </div>
                  </div>

                  {/* Tickets */}
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
              )}
            </div>
          )
        ) : (
          <ActiveAttendancePage selectedId={selectedPatientId} onSelectId={setSelectedPatientId} />
        )}
      </div>

      {/* Modals */}
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
