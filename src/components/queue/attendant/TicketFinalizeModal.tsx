import type { Ticket } from '@/types/queue-system.types'

interface TicketFinalizeModalProps {
  ticket: Ticket
  onConfirm: () => void
  onClose: () => void
}

export function TicketFinalizeModal({ ticket, onConfirm, onClose }: TicketFinalizeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4 text-center">
        <p className="text-base font-medium text-foreground">
          Tem certeza que deseja finalizar esta ficha?
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-input px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
