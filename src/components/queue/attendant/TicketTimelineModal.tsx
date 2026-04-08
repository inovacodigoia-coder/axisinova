import { format } from 'date-fns'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types/queue-system.types'
import { motion, AnimatePresence } from 'framer-motion'

interface TicketTimelineModalProps {
  ticket: Ticket
  onClose: () => void
}

const actionColors: Record<string, { dot: string; border: string }> = {
  created: { dot: 'bg-gray-400', border: 'border-gray-300' },
  called: { dot: 'bg-green-500', border: 'border-green-400' },
  attended: { dot: 'bg-[hsl(222,70%,35%)]', border: 'border-[hsl(222,70%,35%)]' },
  reallocated: { dot: 'bg-amber-500', border: 'border-amber-400' },
  finalized: { dot: 'bg-red-500', border: 'border-red-400' },
  reactivated: { dot: 'bg-blue-500', border: 'border-blue-400' },
}

export function TicketTimelineModal({ ticket, onClose }: TicketTimelineModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Ficha: ({ticket.displayCode})</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="relative pl-6">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
          <AnimatePresence>
            {ticket.timeline.map((entry, i) => {
              const colors = actionColors[entry.action] || actionColors.created
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="relative mb-4"
                >
                  <div className={cn('absolute -left-6 top-1.5 w-3 h-3 rounded-full', colors.dot)} />
                  <div className={cn('rounded-lg border-l-2 bg-card p-3', colors.border)}>
                    <p className="text-sm font-medium text-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm:ss')}</p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
