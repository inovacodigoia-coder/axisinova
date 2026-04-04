import { useState, useEffect } from 'react'
import { useQueue } from '@/context/QueueContext'
import { TicketBadge } from '@/components/reception/queue/TicketBadge'
import { Volume2, CheckCircle, SkipForward, Bell, Clock, Star, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function DoctorPanelPage() {
  const { state, callTicket, completeEntry, skipEntry, recallEntry, updateStatus } = useQueue()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Filter for a specific doctor (mock: doc_01)
  const doctorId = 'doc_01'
  const doctorName = 'Dr. Henrique Lima'
  const doctorEntries = state.entries.filter(e => e.doctorId === doctorId)

  const currentPatient = doctorEntries.find(e => e.status === 'in_progress' || e.status === 'called_doctor')
  const waitingQueue = doctorEntries.filter(e => ['waiting', 'documents_ok', 'called'].includes(e.status))
    .sort((a, b) => {
      if (a.isPreferential && !b.isPreferential) return -1
      if (!a.isPreferential && b.isPreferential) return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const handleCallNext = () => {
    const next = waitingQueue[0]
    if (!next) { toast.info('Nenhum paciente na fila'); return }
    callTicket(next.id)
    updateStatus(next.id, 'called_doctor', 'Consultório 1')
    toast.success(`Chamando ${next.patientName}`)
  }

  const handleComplete = () => {
    if (!currentPatient) return
    completeEntry(currentPatient.id)
    toast.success('Atendimento concluído')
  }

  const handleSkip = () => {
    if (!currentPatient) return
    skipEntry(currentPatient.id)
    toast.info('Paciente movido para o final da fila')
  }

  const handleRecall = () => {
    if (!currentPatient) return
    recallEntry(currentPatient.id)
    toast.info('Paciente rechamado')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-foreground">{doctorName}</h1>
            <p className="text-sm text-muted-foreground">
              Consultório 1 · {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-lg">
            HL
          </div>
        </div>

        {/* Current Patient */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Em Atendimento</h2>
          {currentPatient ? (
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <TicketBadge category={currentPatient.ticketCategory} number={currentPatient.ticketNumber} />
                {currentPatient.isPreferential && (
                  <span className="flex items-center gap-1 text-amber-500 text-xs font-bold"><Star className="h-3 w-3 fill-amber-500" /> Preferencial</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{currentPatient.patientName} · {currentPatient.patientAge} anos</h3>
              <p className="text-sm text-muted-foreground mb-1">
                {currentPatient.appointmentType === 'consultation' ? 'Consulta' : currentPatient.appointmentType === 'exam' ? 'Exame' : 'Procedimento'} · {currentPatient.convenioName}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Aguardou {currentPatient.waitingMinutes} min
                {currentPatient.waitingMinutes > 30 && (
                  <span className="flex items-center gap-1 text-amber-500 font-medium ml-2">
                    <AlertTriangle className="h-3 w-3" /> Longa espera
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum paciente em atendimento</p>
            </div>
          )}
        </div>

        {/* Queue */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
            Próximos ({waitingQueue.length} aguardando)
          </h2>
          <div className="space-y-2">
            {waitingQueue.slice(0, 4).map(entry => (
              <div key={entry.id} className="flex items-center gap-3 bg-card rounded-lg border border-border p-3">
                <TicketBadge category={entry.ticketCategory} number={entry.ticketNumber} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{entry.patientName}</p>
                  <p className="text-xs text-muted-foreground">{entry.appointmentType === 'consultation' ? 'Consulta' : 'Exame'}</p>
                </div>
                {entry.isPreferential && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                {entry.waitingMinutes > 30 && <span className="text-xs text-destructive font-bold">⚠️</span>}
              </div>
            ))}
            {waitingQueue.length > 4 && (
              <p className="text-xs text-muted-foreground text-center py-1">+ {waitingQueue.length - 4} mais</p>
            )}
            {waitingQueue.length === 0 && (
              <div className="bg-card rounded-lg border border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">Nenhum paciente na fila</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCallNext}
            className="w-full py-4 rounded-xl gradient-bg text-white font-bold text-lg shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Volume2 className="h-5 w-5" /> CHAMAR PRÓXIMO PACIENTE
          </button>
          {currentPatient && (
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleComplete} className="py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4" /> Concluir
              </button>
              <button onClick={handleSkip} className="py-3 rounded-xl bg-muted text-muted-foreground font-semibold text-sm hover:bg-accent transition-colors flex items-center justify-center gap-1">
                <SkipForward className="h-4 w-4" /> Pular
              </button>
              <button onClick={handleRecall} className="py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                <Bell className="h-4 w-4" /> Rechamar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
