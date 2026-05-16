import { format } from 'date-fns'
import { Clock, UserPlus, Eye, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket } from '@/types/queue-system.types'
import { motion } from 'framer-motion'

interface TicketCardProps {
  ticket: Ticket
  onCall: () => void
  onAttend: () => void
  onReallocate: () => void
  onFinalize: () => void
  onTimeline: () => void
  onStartCadastro?: () => void
  orderNumber?: string
  hasOrder?: boolean
  allocatedQueueName?: string
  onReprint?: () => void
}

export function TicketCard({ ticket, onCall, onAttend, onReallocate, onFinalize, onTimeline, onStartCadastro, orderNumber, hasOrder, allocatedQueueName, onReprint }: TicketCardProps) {
  const hasCalled = ticket.callCount > 0
  const hasAttended = !!ticket.attendanceStartedAt

  const bgClass = ticket.status === 'called' ? 'bg-blue-50 border-l-[3px] border-l-blue-500' :
    ticket.status === 'in_attendance' ? 'bg-green-50 border-l-[3px] border-l-green-500' : ''

  const fmt = (iso?: string) => iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm:ss') : ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -300 }}
      className={cn('rounded-lg border border-border bg-card p-4 space-y-2', bgClass)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{ticket.displayCode} - {ticket.queueLineName}</span>
            <button onClick={onTimeline} className="text-muted-foreground hover:text-foreground" title="Ver linha do tempo">
              <Clock className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gerado: {fmt(ticket.generatedAt)}
            {ticket.calledAt && ` / Chamado: ${fmt(ticket.calledAt)}`}
            {ticket.attendanceStartedAt && ` / Atendido na recepção: ${fmt(ticket.attendanceStartedAt)}`}
          </p>
          {orderNumber && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                Pedido: {orderNumber}
              </span>
              {allocatedQueueName && (
                <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  → {allocatedQueueName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {hasCalled && ticket.guicheName && (
          <span className="text-[10px] font-medium bg-pink-100 text-pink-700 px-2 py-0.5 rounded">{ticket.guicheName}</span>
        )}
        {hasCalled && (
          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 w-5 h-5 rounded-full flex items-center justify-center">{ticket.callCount}</span>
        )}

        <div className="flex-1" />

        <button onClick={onCall} className="rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors">
          Chamar
        </button>
        <button
          onClick={onAttend}
          disabled={!hasCalled}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            hasAttended
              ? 'bg-[hsl(222,70%,35%)] text-white'
              : hasCalled
                ? 'bg-[hsl(222,70%,35%)] text-white hover:bg-[hsl(222,70%,30%)]'
                : 'bg-muted text-muted-foreground opacity-40 cursor-not-allowed'
          )}
        >
          {hasAttended ? 'Em Atendimento' : 'Atender'}
        </button>
        {hasAttended && onStartCadastro && (
          <button
            onClick={onStartCadastro}
            className="rounded-md gradient-bg px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-all hover:-translate-y-px inline-flex items-center gap-1"
          >
            {hasOrder ? <><Eye className="h-3.5 w-3.5" /> Ver Cadastro</> : <><UserPlus className="h-3.5 w-3.5" /> Iniciar Cadastro</>}
          </button>
        )}
        {hasOrder && onReprint && (
          <button onClick={onReprint} title="Reimprimir controle"
            className="rounded-md border border-input px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
            <Printer className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onReallocate}
          disabled={!hasAttended}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
            hasAttended
              ? 'border-input text-foreground hover:bg-muted'
              : 'border-input text-muted-foreground opacity-40 cursor-not-allowed'
          )}
        >
          Realocar
        </button>
        <button onClick={onFinalize} className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-white hover:bg-destructive/90 transition-colors">
          Finalizar
        </button>
      </div>
    </motion.div>
  )
}
