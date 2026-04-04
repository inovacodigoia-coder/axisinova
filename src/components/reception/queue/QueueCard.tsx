import { cn } from '@/lib/utils'
import type { QueueEntry } from '@/types/reception.types'
import { QUEUE_STATUS_LABELS } from '@/types/reception.types'
import { TicketBadge } from './TicketBadge'
import { Star, Clock, FileCheck, FileWarning, Phone, User } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  waiting: 'border-l-blue-400',
  called: 'border-l-amber-400 animate-pulse',
  in_reception: 'border-l-cyan-400',
  documents_ok: 'border-l-emerald-400',
  called_doctor: 'border-l-purple-400 animate-pulse',
  in_progress: 'border-l-violet-500',
  completed: 'border-l-gray-400 opacity-60',
  absent: 'border-l-red-400 opacity-60',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  waiting: 'bg-blue-500/10 text-blue-400',
  called: 'bg-amber-500/10 text-amber-400',
  in_reception: 'bg-cyan-500/10 text-cyan-400',
  documents_ok: 'bg-emerald-500/10 text-emerald-400',
  called_doctor: 'bg-purple-500/10 text-purple-400',
  in_progress: 'bg-violet-500/10 text-violet-400',
  completed: 'bg-gray-500/10 text-gray-400',
  absent: 'bg-red-500/10 text-red-400',
}

interface QueueCardProps {
  entry: QueueEntry
  selected?: boolean
  onSelect?: () => void
  onCall?: () => void
  onCheckin?: () => void
}

export function QueueCard({ entry, selected, onSelect, onCall, onCheckin }: QueueCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border-l-4 p-3 cursor-pointer transition-all duration-200 hover:scale-[1.01]',
        'bg-[hsl(220,20%,18%)] border border-[hsl(220,15%,25%)]',
        STATUS_COLORS[entry.status],
        selected && 'ring-2 ring-primary'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <TicketBadge category={entry.ticketCategory} number={entry.ticketNumber} size="sm" />
        {entry.isPreferential && (
          <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
            <Star className="h-3 w-3 fill-amber-400" /> PREFERENCIAL
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-1">
        <User className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-sm font-medium text-gray-100 truncate">{entry.patientName}</span>
        <span className="text-xs text-gray-500">{entry.patientAge}a</span>
      </div>

      <div className="text-xs text-gray-400 mb-1 truncate">
        {entry.doctorName} · {entry.appointmentType === 'consultation' ? 'Consulta' : entry.appointmentType === 'exam' ? 'Exame' : 'Procedimento'}
      </div>
      <div className="text-xs text-gray-500 mb-2 truncate">{entry.convenioName}</div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', STATUS_BADGE_COLORS[entry.status])}>
            {QUEUE_STATUS_LABELS[entry.status]}
          </span>
          {entry.documentsValidated ? (
            <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <FileWarning className="h-3.5 w-3.5 text-amber-400" />
          )}
        </div>
        <span className={cn('flex items-center gap-1 text-[10px]', entry.waitingMinutes > 30 ? 'text-red-400 font-bold' : 'text-gray-500')}>
          <Clock className="h-3 w-3" /> {entry.waitingMinutes} min
        </span>
      </div>

      {(onCall || onCheckin) && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-[hsl(220,15%,25%)]">
          {onCall && entry.status === 'waiting' && (
            <button onClick={e => { e.stopPropagation(); onCall() }} className="flex-1 text-[10px] font-semibold py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              <Phone className="h-3 w-3 inline mr-1" />Chamar
            </button>
          )}
          {onCheckin && ['waiting', 'called'].includes(entry.status) && (
            <button onClick={e => { e.stopPropagation(); onCheckin() }} className="flex-1 text-[10px] font-semibold py-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
              Check-in
            </button>
          )}
        </div>
      )}
    </div>
  )
}
