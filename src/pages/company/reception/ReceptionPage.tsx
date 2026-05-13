import { useState, useEffect, useCallback } from 'react'
import { QueuePanel } from '@/components/reception/queue/QueuePanel'
import { CheckinPanel } from '@/components/reception/checkin/CheckinPanel'
import { DocumentsPanel } from '@/components/reception/documents/DocumentsPanel'
import { useQueue } from '@/context/QueueContext'
import { useScheduling } from '@/context/SchedulingContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { NoAppointmentsTodayState } from '@/components/reception/empty-states/NoAppointmentsTodayState'
import { Users, Clock, Building2, Ticket as TicketIcon, PhoneCall, CheckCircle2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UnitRow { id: string; name: string }
interface TicketRow {
  id: string
  display_code: string
  queue_line_name: string
  status: string
  patient_name: string | null
  generated_at: string
  called_at: string | null
  guiche_name: string | null
}

export default function ReceptionPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { stats, state, isDemo } = useQueue()
  const { appointments } = useScheduling()
  const { user } = useAuth()
  const [mobileTab, setMobileTab] = useState<'queue' | 'checkin' | 'docs'>('queue')
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // Unit + totem tickets
  const [units, setUnits] = useState<UnitRow[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>(() => localStorage.getItem('reception_unit_id') || '')
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const companyId = user?.companyId || ''

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(id)
  }, [])

  // Load units
  useEffect(() => {
    if (!companyId) return
    supabase.from('queue_units').select('id, name').eq('company_id', companyId).eq('is_active', true)
      .then(({ data }) => {
        const rows = (data || []) as UnitRow[]
        setUnits(rows)
        if (!selectedUnit && rows.length === 1) {
          setSelectedUnit(rows[0].id)
          localStorage.setItem('reception_unit_id', rows[0].id)
        }
      })
  }, [companyId])

  const loadTickets = useCallback(async (unitId: string) => {
    if (!unitId) return
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)
    const { data } = await supabase
      .from('queue_tickets')
      .select('id, display_code, queue_line_name, status, patient_name, generated_at, called_at, guiche_name')
      .eq('unit_id', unitId)
      .in('status', ['waiting', 'called', 'in_attendance'])
      .gte('generated_at', startOfDay.toISOString())
      .order('generated_at', { ascending: true })
    setTickets((data || []) as TicketRow[])
  }, [])

  useEffect(() => {
    if (!selectedUnit) return
    loadTickets(selectedUnit)
    const channel = supabase.channel(`reception_tickets_${selectedUnit}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets', filter: `unit_id=eq.${selectedUnit}` },
        () => loadTickets(selectedUnit))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedUnit, loadTickets])

  const handleSelectUnit = (id: string) => {
    setSelectedUnit(id)
    localStorage.setItem('reception_unit_id', id)
  }

  const callTicket = useCallback(async (id: string) => {
    const { error } = await supabase.from('queue_tickets').update({
      status: 'called',
      called_at: new Date().toISOString(),
      guiche_name: user?.fullName || 'Recepção',
      attendant_name: user?.fullName || 'Recepção',
    }).eq('id', id)
    if (error) toast.error('Erro ao chamar ficha')
    else toast.success('Ficha chamada')
  }, [user])

  const startAttendance = useCallback(async (id: string) => {
    const { error } = await supabase.from('queue_tickets').update({
      status: 'in_attendance',
      attendance_started_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) toast.error('Erro ao iniciar atendimento')
    else toast.success('Atendimento iniciado')
  }, [])

  const finalizeTicket = useCallback(async (id: string) => {
    const { error } = await supabase.from('queue_tickets').update({
      status: 'finalized',
      finalized_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) toast.error('Erro ao finalizar')
    else toast.success('Ficha finalizada')
  }, [])

  // Unit selector screen
  if (companyId && !selectedUnit) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center">
        <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Selecione a unidade</h1>
              <p className="text-sm text-muted-foreground">Escolha a unidade onde você vai atender hoje</p>
            </div>
          </div>
          {units.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <Building2 className="h-12 w-12 mx-auto opacity-40 mb-3" />
              <p>Nenhuma unidade cadastrada.</p>
              <p className="text-sm">Cadastre uma unidade em Filas / Configurar Local.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {units.map(u => (
                <button key={u.id} onClick={() => handleSelectUnit(u.id)}
                  className="py-5 px-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                  <p className="font-bold text-foreground">{u.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Selecionar esta unidade</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const todayAppointments = appointments.filter(a =>
    a.date === today && !['cancelled'].includes(a.status)
  )
  const hasNoAppointmentData = !isDemo && todayAppointments.length === 0 && state.entries.length === 0
  const selectedUnitName = units.find(u => u.id === selectedUnit)?.name || ''

  const waitingTickets = tickets.filter(t => t.status === 'waiting')
  const calledTickets = tickets.filter(t => t.status === 'called')
  const inAttendanceTickets = tickets.filter(t => t.status === 'in_attendance')

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Recepção</h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {time}
            {selectedUnitName && (<> · <span className="font-semibold text-foreground">{selectedUnitName}</span></>)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">
            <Users className="h-3.5 w-3.5" /> {stats.waiting} aguardando
          </span>
          <span className="flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full font-medium">
            <Clock className="h-3.5 w-3.5" /> {stats.inProgress} em atendimento
          </span>
          {units.length > 1 && (
            <button onClick={() => { setSelectedUnit(''); localStorage.removeItem('reception_unit_id') }}
              className="text-xs text-primary hover:underline flex items-center gap-1 px-2 py-1">
              <Building2 className="h-3.5 w-3.5" /> Trocar unidade
            </button>
          )}
        </div>
      </div>

      {/* Totem Tickets section */}
      {selectedUnit && (
        <div className="mb-4 bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Fichas do Totem</h2>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {waitingTickets.length} aguardando · {calledTickets.length} chamadas · {inAttendanceTickets.length} em atendimento
              </span>
            </div>
            <button onClick={() => loadTickets(selectedUnit)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ficha gerada no totem hoje.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {tickets.map(t => {
                const statusColor = t.status === 'waiting' ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : t.status === 'called' ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                const statusLabel = t.status === 'waiting' ? 'Aguardando' : t.status === 'called' ? 'Chamada' : 'Em atendimento'
                return (
                  <div key={t.id} className={cn('rounded-lg border p-3', statusColor)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl font-extrabold">{t.display_code}</span>
                      <span className="text-[10px] uppercase font-bold opacity-70">{statusLabel}</span>
                    </div>
                    <p className="text-xs opacity-80 truncate">{t.queue_line_name}</p>
                    <p className="text-[10px] opacity-60 mb-2">
                      {new Date(t.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {t.patient_name ? ` · ${t.patient_name}` : ''}
                    </p>
                    <div className="flex gap-1">
                      {t.status === 'waiting' && (
                        <button onClick={() => callTicket(t.id)}
                          className="flex-1 text-[11px] py-1 px-2 rounded bg-white font-semibold hover:opacity-80 flex items-center justify-center gap-1">
                          <PhoneCall className="h-3 w-3" /> Chamar
                        </button>
                      )}
                      {t.status === 'called' && (
                        <>
                          <button onClick={() => startAttendance(t.id)}
                            className="flex-1 text-[11px] py-1 px-2 rounded bg-white font-semibold hover:opacity-80">Iniciar</button>
                          <button onClick={() => callTicket(t.id)}
                            className="text-[11px] py-1 px-2 rounded bg-white font-semibold hover:opacity-80">Rechamar</button>
                        </>
                      )}
                      {t.status === 'in_attendance' && (
                        <button onClick={() => finalizeTicket(t.id)}
                          className="flex-1 text-[11px] py-1 px-2 rounded bg-white font-semibold hover:opacity-80 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Finalizar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {hasNoAppointmentData ? (
        <div className="flex-1 flex items-center justify-center">
          <NoAppointmentsTodayState />
        </div>
      ) : (
        <>
          {/* Mobile tabs */}
          <div className="flex gap-1 mb-3 lg:hidden">
            {(['queue', 'checkin', 'docs'] as const).map(tab => (
              <button key={tab} onClick={() => setMobileTab(tab)}
                className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-colors',
                  mobileTab === tab ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground'
                )}>
                {tab === 'queue' ? 'Fila' : tab === 'checkin' ? 'Check-in' : 'Documentos'}
              </button>
            ))}
          </div>

          {/* Three panels */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-4 min-h-0">
            <div className={cn('min-h-0', mobileTab !== 'queue' && 'hidden lg:block')}>
              <QueuePanel
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCheckin={(id) => { setSelectedId(id); setMobileTab('checkin') }}
              />
            </div>
            <div className={cn('min-h-0 bg-card rounded-xl border border-border overflow-hidden', mobileTab !== 'checkin' && 'hidden lg:block')}>
              <CheckinPanel selectedQueueId={selectedId} />
            </div>
            <div className={cn('min-h-0 bg-card rounded-xl border border-border overflow-hidden', mobileTab !== 'docs' && 'hidden lg:block')}>
              <DocumentsPanel selectedQueueId={selectedId} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
