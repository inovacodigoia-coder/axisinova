import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueue } from '@/context/QueueContext'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { Users, Stethoscope, ArrowLeft, FilterX } from 'lucide-react'
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
import { AttendanceCadastroModal } from '@/components/reception/attendance/AttendanceCadastroModal'
import { AttendancePrintModal } from '@/components/reception/attendance/print/AttendancePrintModal'
import { AttendanceLookupModal } from '@/components/reception/attendance/lookup/AttendanceLookupModal'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import type { AttendanceControlDocument } from '@/types/payment-print.types'
import type { Patient } from '@/types/patient.types'
import type { Ticket, TicketStatus } from '@/types/queue-system.types'

const DEMO_COMPANY_ID = 'comp_001'

function mapDbTicket(row: any): Ticket {
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
    tvId: row.tv_id || undefined,
    callCount: row.call_count ?? (row.status === 'waiting' ? 0 : 1),
    patientName: row.patient_name || undefined,
    attendantName: row.attendant_name || undefined,
    generatedAt: row.generated_at,
    calledAt: row.called_at || undefined,
    attendanceStartedAt: row.attendance_started_at || undefined,
    finalizedAt: row.finalized_at || undefined,
    timeline: [],
  }
}

export default function ReceptionLayout() {
  const { stats } = useQueue()
  const { user } = useAuth()
  const { state, dispatch, getUnitQueues, getUnitGuiches, getUnitTVs, getUnitTickets, loadCompanyData } = useQueueSystem()
  const isDemoCompany = user?.companyId === DEMO_COMPANY_ID

  // Refresh queue data on mount so newly created/renamed TVs show up in the selector
  useEffect(() => {
    if (user?.companyId && user.companyId !== DEMO_COMPANY_ID) {
      loadCompanyData(user.companyId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId])

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
  const [dbTickets, setDbTickets] = useState<Ticket[]>([])
  const [cadastroTicket, setCadastroTicket] = useState<Ticket | null>(null)
  const [showDirectCadastro, setShowDirectCadastro] = useState(false)
  const [reprintDoc, setReprintDoc] = useState<AttendanceControlDocument | null>(null)
  const [showLookup, setShowLookup] = useState(false)
  const location = useLocation()
  const [lookupPatient, setLookupPatient] = useState<Patient | null>(null)
  const { orders } = useAttendanceCadastro()

  const orderByTicket = useMemo(() => {
    const m = new Map<string, AttendanceOrder>()
    orders.forEach(o => { if (o.ticketId) m.set(o.ticketId, o) })
    return m
  }, [orders])

  const buildDocFromOrder = (order: AttendanceOrder): AttendanceControlDocument => {
    const now = new Date()
    return {
      orderNumber: order.orderNumber,
      orderDate: now.toLocaleDateString('pt-BR'),
      orderTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      patientId: order.patientId, patientName: order.patientName,
      serviceType: order.serviceType === 'consultation' ? 'Consulta' : order.serviceType === 'exam' ? 'Exame' : 'Procedimento',
      exams: order.labGuides?.flatMap(guide => 
        (guide.exams || []).map((exam: any) => ({
          name: exam.name,
          code: exam.code || '',
          forecastDate: exam.forecastDate || exam.expectedDeliveryDate || '',
          doctorName: guide.doctorName || order.doctorName,
          doctorCRM: guide.doctorCRM || order.doctorCRM
        }))
      ) || [],
      doctorName: order.doctorName, doctorCRM: order.doctorCRM, specialty: order.specialty,
      unitName: unitName, guicheName, ticketCode: order.ticketCode,
      paymentType: order.paymentType === 'convenio' ? 'Convênio' : order.paymentType === 'private' ? 'Particular' : 'Cortesia',
      convenioName: order.convenioName, cardNumber: order.cardNumber,
      authorizationCode: order.authorizationCode, authorizationExpiry: order.authorizationExpiry,
      attachments: order.attachments.map(a => ({ name: a.documentType, type: 'document' })),
      registeredByName: order.registeredByName,
      companyName: 'CLÍNICA AXIS INOVA', companyAddress: 'Rua das Flores, 123 · Natal/RN',
      companyCNPJ: '00.000.000/0001-00', companyPhone: '(84) 3333-0000',
    }
  }

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(id)
  }, [])

  // Check for lookup query param
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    if (searchParams.get('lookup') === 'true') {
      setShowLookup(true)
      // Clean up the URL
      window.history.replaceState({}, '', location.pathname)
    }
  }, [location])

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

  // Determina quais tipos de guichê estão liberados pela seleção atual de filas:
  // - Atendimento (externa) → guichês externos
  // - Coleta (externa) ou Fila interna → guichês internos
  const allowedGuicheTypes = useMemo<Set<'internal' | 'external'>>(() => {
    const set = new Set<'internal' | 'external'>()
    selectedQueues.forEach(id => {
      const q = queues.find(qu => qu.id === id)
      if (!q) return
      if (q.type === 'external' && q.category === 'attendance') set.add('external')
      else set.add('internal')
    })
    return set
  }, [selectedQueues, queues])
  const filteredGuiches = useMemo(
    () => allowedGuicheTypes.size === 0 ? guiches : guiches.filter(g => allowedGuicheTypes.has(g.type)),
    [guiches, allowedGuicheTypes],
  )
  const loadDbTickets = useCallback(async () => {
    if (isDemoCompany || !unitId) return
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('unit_id', unitId)
      .gte('generated_at', startOfDay.toISOString())
      .order('generated_at', { ascending: true })
    if (error) {
      toast.error('Erro ao carregar fichas do totem')
      console.error('loadDbTickets reception error', error)
      return
    }
    setDbTickets((data || []).map(mapDbTicket))
  }, [isDemoCompany, unitId])

  useEffect(() => {
    if (isDemoCompany || !unitId || !unitConfirmed) return
    loadDbTickets()
    const channel = supabase.channel(`reception_layout_tickets_${unitId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets', filter: `unit_id=eq.${unitId}` }, loadDbTickets)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isDemoCompany, unitId, unitConfirmed, loadDbTickets])

  const allTickets = useMemo(() => {
    const list = isDemoCompany ? getUnitTickets(unitId, selectedQueues.length ? selectedQueues : undefined) : dbTickets
    if (!isDemoCompany && selectedQueues.length) return list.filter(t => selectedQueues.includes(t.queueLineId))
    return list
  }, [isDemoCompany, unitId, selectedQueues, getUnitTickets, dbTickets])
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

  const handleCall = async (ticketId: string) => {
    if (!tvId) { toast.warning('Selecione uma TV antes de chamar'); return }
    if (!guicheId) { toast.warning('Selecione um guichê'); return }
    const currentTicket = activeTickets.find(t => t.id === ticketId)
    if (isDemoCompany) {
      dispatch({ type: 'CALL_TICKET', payload: { ticketId, guicheId, guicheName, tvId, attendantName } })
    } else {
      const { data: ticketCounter } = await (supabase.from('queue_tickets') as any)
        .select('call_count')
        .eq('id', ticketId)
        .maybeSingle()
      const nextCallCount = ((ticketCounter?.call_count ?? currentTicket?.callCount) || 0) + 1
      const { error } = await supabase.from('queue_tickets').update({
        status: 'called',
        called_at: new Date().toISOString(),
        guiche_id: guicheId,
        guiche_name: guicheName,
        tv_id: tvId,
        call_count: nextCallCount,
        attendant_name: attendantName,
      } as any).eq('id', ticketId)
      if (error) { toast.error('Erro ao chamar ficha'); return }
    }
    try {
      const ctx = new AudioContext()
      const beep = (freq: number, start: number, dur: number) => { const o = ctx.createOscillator(); o.frequency.value = freq; o.connect(ctx.destination); o.start(start); o.stop(start + dur) }
      beep(440, ctx.currentTime, 0.2)
      beep(440, ctx.currentTime + 0.3, 0.2)
    } catch {}
    toast.success('Ficha chamada!')
  }

  const handleAttend = async (ticketId: string) => {
    if (isDemoCompany) dispatch({ type: 'ATTEND_TICKET', payload: { ticketId, attendantName, guicheName } })
    else {
      const { error } = await supabase.from('queue_tickets').update({ status: 'in_attendance', attendance_started_at: new Date().toISOString(), attendant_name: attendantName }).eq('id', ticketId)
      if (error) { toast.error('Erro ao iniciar atendimento'); return }
    }
    toast.success('Em atendimento')
  }

  const handleReallocate = async (ticketId: string, queueId: string, queueName: string, patientName?: string) => {
    if (isDemoCompany) dispatch({ type: 'REALLOCATE_TICKET', payload: { ticketId, queueId, queueName, patientName, attendantName } })
    else {
      const { error } = await supabase.from('queue_tickets').update({ status: 'reallocated', queue_line_id: queueId, queue_line_name: queueName, patient_name: patientName || undefined }).eq('id', ticketId)
      if (error) { toast.error('Erro ao realocar ficha'); return }
    }
    setReallocateTicket(null)
    toast.success('Ficha realocada')
  }

  const handleFinalize = async (ticketId: string) => {
    if (isDemoCompany) dispatch({ type: 'FINALIZE_TICKET', payload: { ticketId, attendantName } })
    else {
      const { error } = await supabase.from('queue_tickets').update({ status: 'finalized', finalized_at: new Date().toISOString() }).eq('id', ticketId)
      if (error) { toast.error('Erro ao finalizar ficha'); return }
    }
    setFinalizeTicket(null)
    toast.success('Ficha finalizada')
  }

  const handleReactivate = async (ticketId: string) => {
    if (isDemoCompany) dispatch({ type: 'REACTIVATE_TICKET', payload: { ticketId, attendantName } })
    else {
      const { error } = await supabase.from('queue_tickets').update({ status: 'waiting', finalized_at: null }).eq('id', ticketId)
      if (error) { toast.error('Erro ao reativar ficha'); return }
    }
    toast.success('Ficha reativada')
  }

  const handleSaveQueues = (ids: string[]) => {
    setSelectedQueues(ids)
    persistSession({ selectedQueueLineIds: ids })
    // Limpa o guichê selecionado se ele não pertence mais aos tipos permitidos pelas filas selecionadas
    const newAllowed = new Set<'internal' | 'external'>()
    ids.forEach(id => {
      const q = queues.find(qu => qu.id === id)
      if (!q) return
      if (q.type === 'external' && q.category === 'attendance') newAllowed.add('external')
      else newAllowed.add('internal')
    })
    const currentGuiche = guiches.find(g => g.id === guicheId)
    if (currentGuiche && newAllowed.size > 0 && !newAllowed.has(currentGuiche.type)) {
      setGuicheId('')
      persistSession({ guicheId: '' })
    }
    const updated = { unitId, unitName, selectedQueueLineIds: ids, showFinalized: false }
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: updated })
    setShowSelectQueues(false)
  }

  const handleClearFilters = () => {
    setSelectedQueues([])
    setGuicheId('')
    setTvId('')
    persistSession({ selectedQueueLineIds: [], guicheId: '', tvId: '' })
    dispatch({ type: 'SET_ATTENDANT_SESSION', payload: { unitId, unitName, selectedQueueLineIds: [], showFinalized: false } })
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
                  {(selectedQueues.length > 0 || guicheId || tvId) && (
                    <button onClick={handleClearFilters} className="rounded-lg border border-border text-muted-foreground px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1">
                      <FilterX className="h-3.5 w-3.5" /> Limpar filtros
                    </button>
                  )}
                  <button onClick={() => setShowFinalized(!showFinalized)} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/5 transition-colors">
                    {showFinalized ? 'Ver fichas ativas' : 'Ver fichas finalizadas'}
                  </button>
                  <button onClick={() => setShowLookup(true)} className="rounded-lg border border-emerald-500 text-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500/5 transition-colors">
                    Buscar cadastros
                  </button>
                  <button onClick={handleBackToSelector} className="rounded-lg bg-[hsl(222,70%,35%)] text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 hover:bg-[hsl(222,70%,30%)] transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-bold text-foreground">Lista de Fichas</h2>

              <div className="flex-1 overflow-y-auto space-y-3">
                  {/* TV + Guichê selectors */}
                  <div className="flex gap-4 flex-wrap">
                    <div className="w-56">
                      <DeviceSelector items={tvs} value={tvId} onChange={v => { setTvId(v); persistSession({ tvId: v }) }} label="Selecionar TV" />
                    </div>
                    <div className="w-56">
                      <DeviceSelector
                        items={filteredGuiches}
                        value={guicheId}
                        onChange={v => { setGuicheId(v); persistSession({ guicheId: v }) }}
                        label="Selecionar Guichê"
                        placeholder={!selectedQueues.length ? 'Selecione as filas primeiro' : 'Selecione guichê'}
                        disabled={!selectedQueues.length}
                      />
                    </div>
                  </div>

                  {/* Tickets — só carrega após selecionar filas E guichê */}
                  {(!selectedQueues.length || !guicheId) ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                      <p className="text-sm font-medium text-foreground">Selecione as filas e o guichê para carregar as fichas</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {!selectedQueues.length && !guicheId
                          ? 'Nenhuma fila e nenhum guichê selecionado.'
                          : !selectedQueues.length
                          ? 'Clique em "Selecionar filas" acima.'
                          : 'Selecione um guichê acima.'}
                      </p>
                    </div>
                  ) : (
                    <>
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
                            onStartCadastro={() => setCadastroTicket(t)}
                            hasOrder={!!orderByTicket.get(t.id)}
                            orderNumber={orderByTicket.get(t.id)?.orderNumber}
                            onReprint={() => {
                              const o = orderByTicket.get(t.id)
                              if (o) setReprintDoc(buildDocFromOrder(o))
                            }}
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
                    </>
                  )}
                </div>
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
      {cadastroTicket && (
        <AttendanceCadastroModal
          open
          onClose={() => setCadastroTicket(null)}
          ticketId={cadastroTicket.id}
          ticketCode={cadastroTicket.displayCode}
          unitId={unitId}
          unitName={unitName}
          guicheName={guicheName}
        />
      )}
      {showDirectCadastro && (
        <AttendanceCadastroModal
          open
          onClose={() => setShowDirectCadastro(false)}
          unitId={unitId}
          unitName={unitName}
          guicheName={guicheName}
        />
      )}
      {reprintDoc && (
        <AttendancePrintModal open onClose={() => setReprintDoc(null)} document={reprintDoc} />
      )}
      {showLookup && (
        <AttendanceLookupModal
          open
          onClose={() => setShowLookup(false)}
          unitName={unitName}
          guicheName={guicheName}
          onAddProcedure={(p) => { setLookupPatient(p); setShowLookup(false) }}
        />
      )}
      {lookupPatient && (
        <AttendanceCadastroModal
          open
          onClose={() => setLookupPatient(null)}
          unitId={unitId}
          unitName={unitName}
          guicheName={guicheName}
          initialPatient={lookupPatient}
        />
      )}
    </div>
  )
}
