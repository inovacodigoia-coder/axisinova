import { useQueue } from '@/context/QueueContext'
import { cn } from '@/lib/utils'
import { Clock, CheckCircle, Volume2, ArrowRight, XCircle, Bell } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  selectedId: string | null
  onSelectId: (id: string | null) => void
}

export default function ActiveAttendancePage({ selectedId, onSelectId }: Props) {
  const { state, callTicket } = useQueue()

  const activeEntries = state.entries.filter(e => !['completed', 'absent'].includes(e.status))
  const selected = activeEntries.find(e => e.id === selectedId) || activeEntries[0] || null

  const statusSteps = [
    { key: 'waiting', label: 'Aguardando check-in' },
    { key: 'in_reception', label: 'Documentos validados' },
    { key: 'called', label: 'Chamado pelo médico' },
    { key: 'in_progress', label: 'Em atendimento' },
    { key: 'completed', label: 'Concluído' },
  ]

  const currentStepIdx = selected ? statusSteps.findIndex(s => s.key === selected.status) : -1

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4">
      {/* Panel A: Mini queue */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border bg-muted/30">
          <h3 className="text-xs font-bold text-foreground tracking-wider">FILA</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeEntries.map(entry => (
            <button key={entry.id} onClick={() => onSelectId(entry.id)}
              className={cn(
                'w-full rounded-lg p-2.5 text-left transition-all',
                entry.id === selected?.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
              )}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary">[{entry.ticketNumber}]</span>
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000)} min
                </span>
              </div>
              <p className="text-xs font-medium text-foreground truncate mt-0.5">{entry.patientName}</p>
            </button>
          ))}
          {activeEntries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum paciente na fila</p>
          )}
        </div>
      </div>

      {/* Panel B: Check-in & docs */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        {selected ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full gradient-bg flex items-center justify-center text-lg font-bold text-white">
                  {selected.patientName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.patientName}</h2>
                  <p className="text-sm text-muted-foreground">{selected.doctorName} · {selected.appointmentTime}</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="rounded-xl bg-muted/30 p-4 mb-4">
              <p className="text-xs font-bold text-muted-foreground mb-2">PROGRESSO DO ATENDIMENTO</p>
              <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                <div className="h-full gradient-bg transition-all" style={{ width: `${Math.max(10, ((currentStepIdx + 1) / statusSteps.length) * 100)}%` }} />
              </div>
            </div>

            {/* Patient Data Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-medium text-muted-foreground">Tipo</p>
                <p className="text-sm font-semibold text-foreground">
                  {selected.appointmentType === 'consultation' ? 'Consulta' : selected.appointmentType === 'exam' ? 'Exame' : 'Procedimento'}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-medium text-muted-foreground">Senha</p>
                <p className="text-sm font-semibold text-primary">{selected.ticketNumber}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-medium text-muted-foreground">Prioridade</p>
                <p className="text-sm font-semibold text-foreground">{selected.isPreferential ? '⭐ Preferencial' : 'Normal'}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-medium text-muted-foreground">Documentos</p>
                <p className="text-sm font-semibold text-[hsl(var(--success))]">✅ OK</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Selecione um paciente da fila</p>
          </div>
        )}
      </div>

      {/* Panel C: Status & Actions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">STATUS DO ATENDIMENTO</h3>
        </div>
        <div className="p-4 space-y-2">
          {statusSteps.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                idx <= currentStepIdx ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground'
              )}>
                {idx <= currentStepIdx ? '✓' : idx + 1}
              </div>
              <span className={cn('text-xs', idx <= currentStepIdx ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <h4 className="text-xs font-bold text-foreground mb-2">AÇÕES</h4>
          <button onClick={() => { if (selected) toast.success('Documentos validados') }}
            className="w-full rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> Validar Documentos
          </button>
          <button onClick={() => { if (selected) { callTicket(selected.id); toast.success('Paciente chamado') } }}
            className="w-full rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-primary" /> Chamar para o médico
          </button>
          <button className="w-full rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-[hsl(var(--secondary))]" /> Transferir
          </button>
          <button className="w-full rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-2 text-destructive">
            <XCircle className="h-3.5 w-3.5" /> Registrar Falta
          </button>
        </div>

        {selected && (
          <div className="p-4 border-t border-border">
            <h4 className="text-xs font-bold text-foreground mb-2">MÉDICO RESPONSÁVEL</h4>
            <p className="text-sm font-medium text-foreground">{selected.doctorName}</p>
            <button className="mt-2 rounded-lg border border-input px-3 py-1.5 text-[10px] font-medium hover:bg-muted flex items-center gap-1.5">
              <Bell className="h-3 w-3" /> Notificar médico
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
