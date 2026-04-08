import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Ticket } from '@/types/queue-system.types'

interface FinalizedTicketCardProps {
  ticket: Ticket
  onTimeline: () => void
  onReactivate: () => void
}

export function FinalizedTicketCard({ ticket, onTimeline, onReactivate }: FinalizedTicketCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-lg border border-border bg-card p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground">{ticket.displayCode} - {ticket.queueLineName}</span>
        <button onClick={onTimeline} className="text-muted-foreground hover:text-foreground" title="Ver linha do tempo">
          <Clock className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Gerado: {format(new Date(ticket.generatedAt), 'dd/MM/yyyy HH:mm:ss')}
        {ticket.finalizedAt && ` / Finalizado: ${format(new Date(ticket.finalizedAt), 'HH:mm:ss')}`}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded">
          {ticket.callCount} chamada{ticket.callCount !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        <button onClick={onReactivate} className="rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
          Reativar
        </button>
      </div>
    </motion.div>
  )
}
