import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AnimatePresence } from 'framer-motion'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import { TicketCard } from '@/components/queue/attendant/TicketCard'
import { FinalizedTicketCard } from '@/components/queue/attendant/FinalizedTicketCard'
import { TicketTimelineModal } from '@/components/queue/attendant/TicketTimelineModal'
import { TicketReallocateModal } from '@/components/queue/attendant/TicketReallocateModal'
import { TicketFinalizeModal } from '@/components/queue/attendant/TicketFinalizeModal'
import { SelectQueuesModal } from '@/components/queue/attendant/SelectQueuesModal'
import { DeviceSelector } from '@/components/queue/selector/DeviceSelector'
import type { Ticket } from '@/types/queue-system.types'

export default function AttendantPanelPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state, dispatch, getUnitQueues, getUnitGuiches, getUnitTVs, getUnitTickets } = useQueueSystem()

  const [showFinalized, setShowFinalized] = useState(false)
  const [showSelectQueues, setShowSelectQueues] = useState(false)
  const [selectedQueues, setSelectedQueues] = useState<string[]>([])
  const [tvId, setTvId] = useState('')
  const [guicheId, setGuicheId] = useState('')
  const [timelineTicket, setTimelineTicket] = useState<Ticket | null>(null)
  const [reallocateTicket, setReallocateTicket] = useState<Ticket | null>(null)
  const [finalizeTicket, setFinalizeTicket] = useState<Ticket | null>(null)

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

  const allTickets = useMemo(() => getUnitTickets(unitId, selectedQueues.length ? selectedQueues : undefined), [unitId, selectedQueues, getUnitTickets])
  const activeTickets = useMemo(() => allTickets.filter(t => !['finalized', 'reallocated'].includes(t.status)), [allTickets])
  const finalizedTickets = useMemo(() => allTickets.filter(t => t.status === 'finalized'), [allTickets])

  const guicheName = guiches.find(g => g.id === guicheId)?.name || ''

  const handleCall = (ticketId: string) => {
    if (!tvId) { toast.warning('Selecione uma TV antes de chamar'); return }
    if (!guicheId) { toast.warning('Selecione um guichê'); return }
    dispatch({ type: 'CALL_TICKET', payload: { ticketId, guicheId, guicheName, tvId, attendantName } })
    // Beep
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
      {/* Header */}
      <header className="bg-[hsl(222,70%,35%)] text-white px-6 py-3.5 flex items-center">
        <h1 className="text-lg font-bold">Chame Rápido</h1>
      </header>

      {/* Sub-header */}
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

      {/* Main */}
      <main className="flex-1 p-6 space-y-4 max-w-5xl mx-auto w-full">
        <h2 className="text-lg font-bold text-foreground">Lista de Fichas</h2>

        {!selectedQueues.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma fila selecionada. Clique em &quot;Selecionar filas&quot; para começar.</p>
        ) : (
          <>
            {/* Controls */}
            <div className="flex gap-4 flex-wrap">
              <div className="w-56">
                <DeviceSelector items={tvs} value={tvId} onChange={setTvId} label="Selecionar TV" />
              </div>
              <div className="w-56">
                <DeviceSelector items={guiches} value={guicheId} onChange={setGuicheId} label="Selecionar Guichê" />
              </div>
            </div>

            {/* Ticket list */}
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
