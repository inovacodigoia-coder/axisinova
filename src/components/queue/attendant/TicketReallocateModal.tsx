import { useState } from 'react'
import { X } from 'lucide-react'
import type { QueueLine, Ticket } from '@/types/queue-system.types'

interface TicketReallocateModalProps {
  ticket: Ticket
  internalQueues: QueueLine[]
  onConfirm: (queueId: string, queueName: string, patientName?: string) => void
  onClose: () => void
}

export function TicketReallocateModal({ ticket, internalQueues, onConfirm, onClose }: TicketReallocateModalProps) {
  const [name, setName] = useState(ticket.patientName || '')
  const [queueId, setQueueId] = useState('')

  const selectedQueue = internalQueues.find(q => q.id === queueId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Ficha: {ticket.displayCode}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Fila</label>
            <select
              value={queueId}
              onChange={e => setQueueId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecionar</option>
              {internalQueues.map(q => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => selectedQueue && onConfirm(selectedQueue.id, selectedQueue.name, name || undefined)}
          disabled={!queueId}
          className="w-full rounded-lg bg-[hsl(222,70%,35%)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[hsl(222,70%,30%)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Realocar
        </button>
      </div>
    </div>
  )
}
