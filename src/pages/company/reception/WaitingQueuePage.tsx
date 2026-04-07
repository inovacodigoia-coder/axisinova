import { useState, useCallback, memo } from 'react'
import { useQueue } from '@/context/QueueContext'
import { EmptyQueueState } from '@/components/reception/empty-states/EmptyQueueState'
import { cn } from '@/lib/utils'
import { Users, RefreshCw, Filter, UserPlus, Clock, Volume2, ArrowRight, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { TransferModal } from '@/components/reception/TransferModal'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const FILTERS = ['Todos', 'Aguardando', 'Chamados', 'Atendimento'] as const
type QueueFilter = typeof FILTERS[number]
const FILTER_MAP: Record<QueueFilter, string[]> = {
  Todos: [],
  Aguardando: ['waiting', 'documents_ok'],
  Chamados: ['called', 'called_doctor'],
  Atendimento: ['in_reception', 'in_progress'],
}

interface Props {
  onSelectPatient: (id: string) => void
}

export default function WaitingQueuePage({ onSelectPatient }: Props) {
  const { state, callTicket, stats } = useQueue()
  const [filter, setFilter] = useState<QueueFilter>('Todos')
  const [transferEntry, setTransferEntry] = useState<string | null>(null)

  const sorted = [...state.entries]
    .filter(e => e.status !== 'completed' && e.status !== 'absent')
    .filter(e => filter === 'Todos' || FILTER_MAP[filter].includes(e.status))
    .sort((a, b) => {
      if (a.isPreferential && !b.isPreferential) return -1
      if (!a.isPreferential && b.isPreferential) return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  const getWaitTime = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    return mins < 1 ? 'Agora' : `${mins} min`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button className="rounded-lg gradient-bg px-3 py-2 text-xs font-semibold text-white flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Check-in Manual
          </button>
          <button onClick={() => toast.success('Fila atualizada')} className="rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            <Users className="h-3 w-3" /> {stats.waiting} aguardando
          </span>
          <span className="flex items-center gap-1 bg-[hsl(var(--secondary))]/10 text-[hsl(var(--secondary))] px-2 py-1 rounded-full font-medium">
            <Clock className="h-3 w-3" /> {stats.inProgress} em atend.
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-3">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
              filter === f ? 'gradient-bg text-white' : 'text-muted-foreground hover:bg-muted'
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Queue Grid */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full"><EmptyQueueState /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sorted.map(entry => (
              <div key={entry.id}
                onClick={() => onSelectPatient(entry.id)}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                      entry.isPreferential ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' : 'bg-primary/10 text-primary'
                    )}>
                      [{entry.ticketNumber}]
                    </span>
                    {entry.isPreferential && <span className="text-[10px] font-medium text-[hsl(var(--warning))]">⭐ PREFERENCIAL</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {getWaitTime(entry.createdAt)}
                  </span>
                </div>

                {/* Patient info */}
                <p className="text-sm font-semibold text-foreground">{entry.patientName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.doctorName} · {entry.appointmentType === 'consultation' ? 'Consulta' : entry.appointmentType === 'exam' ? 'Exame' : 'Procedimento'} · {entry.appointmentTime}
                </p>

                {/* Status */}
                <div className="flex items-center gap-1 mt-2">
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full',
                    entry.status === 'waiting' && 'bg-blue-50 text-blue-700',
                    entry.status === 'called' && 'bg-violet-50 text-violet-700',
                    entry.status === 'in_progress' && 'bg-emerald-50 text-emerald-700',
                    entry.status === 'in_reception' && 'bg-orange-50 text-orange-700',
                  )}>
                    {entry.status === 'waiting' ? 'Aguardando' : entry.status === 'called' ? 'Chamado' : entry.status === 'in_progress' ? 'Em atendimento' : entry.status === 'in_reception' ? 'Na recepção' : entry.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 border-t border-border pt-3">
                  <button onClick={e => { e.stopPropagation(); onSelectPatient(entry.id) }}
                    className="rounded-lg border border-input px-2.5 py-1.5 text-[10px] font-medium hover:bg-muted flex items-center gap-1">
                    ▶ Check-in
                  </button>
                  <button onClick={e => { e.stopPropagation(); callTicket(entry.id); toast.success(`${entry.patientName} chamado!`) }}
                    className="rounded-lg border border-input px-2.5 py-1.5 text-[10px] font-medium hover:bg-muted flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> Chamar
                  </button>
                  <button onClick={e => { e.stopPropagation(); setTransferEntry(entry.id) }}
                    className="rounded-lg border border-input px-2.5 py-1.5 text-[10px] font-medium hover:bg-muted flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" /> Transferir
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button onClick={e => e.stopPropagation()} className="rounded p-1 hover:bg-muted ml-auto">
                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Registrando falta...')}>Registrar falta</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Abrindo histórico...')}>Ver histórico</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Cancelando...')}>Cancelar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {transferEntry && (
        <TransferModal
          entryId={transferEntry}
          onClose={() => setTransferEntry(null)}
        />
      )}
    </div>
  )
}
