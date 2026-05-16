import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, X, Printer, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueueAllocation } from '@/hooks/useQueueAllocation'
import { motion } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  unitId: string
  orderId: string
  orderNumber: string
  patientName: string
  procedureName: string
  doctorName?: string
  doctorId?: string
  onPrint?: () => void
}

export function QueueAllocationModal({ open, onClose, unitId, orderId, orderNumber, patientName, procedureName, doctorName, doctorId, onPrint }: Props) {
  const { internalQueues, allocate, positionInLine } = useQueueAllocation(unitId)
  const [selectedQueueId, setSelectedQueueId] = useState('')
  const [confirmed, setConfirmed] = useState<{ queueName: string; displayCode: string; position: number } | null>(null)

  // Pre-select queue matching doctor (heuristic: first internal queue, or one whose name contains doctor specialty)
  useEffect(() => {
    if (!open) return
    if (!internalQueues.length) { setSelectedQueueId(''); return }
    setSelectedQueueId(internalQueues[0].id)
  }, [open, internalQueues])

  useEffect(() => { if (!open) setConfirmed(null) }, [open])

  const grouped = useMemo(() => {
    const cons = internalQueues.filter(q => /consult/i.test(q.name))
    const exams = internalQueues.filter(q => /exam|sala/i.test(q.name) && !cons.includes(q))
    const others = internalQueues.filter(q => !cons.includes(q) && !exams.includes(q))
    return { cons, exams, others }
  }, [internalQueues])

  const handleAllocate = () => {
    if (!selectedQueueId) { toast.error('Selecione uma fila'); return }
    const ticket = allocate(selectedQueueId, patientName, orderId)
    if (!ticket) { toast.error('Falha ao alocar'); return }
    const position = positionInLine(selectedQueueId)
    setConfirmed({ queueName: ticket.queueLineName, displayCode: ticket.displayCode, position })
    toast.success(`Paciente alocado · ${ticket.displayCode}`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[500px] p-0 [&>button[type=button]]:hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-base font-bold flex items-center gap-2">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </motion.span>
            {confirmed ? 'Paciente Alocado' : 'Alocar na Fila Interna'}
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        {!confirmed ? (
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="font-semibold">✅ Atendimento registrado!</div>
              <div className="text-xs mt-0.5">Pedido: <strong>{orderNumber}</strong></div>
            </div>

            <div className="space-y-1 text-sm">
              <div>👤 <strong>{patientName}</strong></div>
              <div className="text-muted-foreground text-xs">📋 {procedureName}{doctorName ? ` · ${doctorName}` : ''}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Selecionar fila interna:</label>
              {!internalQueues.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Nenhuma fila interna configurada para esta unidade.
                </div>
              ) : (
                <select value={selectedQueueId} onChange={(e) => setSelectedQueueId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {grouped.cons.length > 0 && (
                    <optgroup label="Consultórios">
                      {grouped.cons.map(q => <option key={q.id} value={q.id}>{q.name} ({q.prefix}) — {positionInLine(q.id)} aguardando</option>)}
                    </optgroup>
                  )}
                  {grouped.exams.length > 0 && (
                    <optgroup label="Salas de Exame">
                      {grouped.exams.map(q => <option key={q.id} value={q.id}>{q.name} ({q.prefix}) — {positionInLine(q.id)} aguardando</option>)}
                    </optgroup>
                  )}
                  {grouped.others.length > 0 && (
                    <optgroup label="Outros">
                      {grouped.others.map(q => <option key={q.id} value={q.id}>{q.name} ({q.prefix}) — {positionInLine(q.id)} aguardando</option>)}
                    </optgroup>
                  )}
                </select>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Pular</Button>
              <button onClick={handleAllocate} disabled={!selectedQueueId}
                className={cn('inline-flex items-center gap-1 rounded-md gradient-bg px-5 py-2 text-sm font-semibold text-white', !selectedQueueId && 'opacity-50 cursor-not-allowed')}>
                <ArrowRight className="h-4 w-4" /> Alocar na Fila
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-2 text-sm">
              <div className="font-bold text-emerald-900">✅ Paciente alocado na fila!</div>
              <div className="border-t border-emerald-200 my-2" />
              <div><strong>Fila:</strong> {confirmed.queueName}</div>
              <div><strong>Senha:</strong> <span className="font-mono font-bold text-base text-primary">{confirmed.displayCode}</span></div>
              <div><strong>Posição:</strong> {confirmed.position}ª na fila</div>
              <div><strong>Espera estimada:</strong> ~{confirmed.position * 5} min</div>
            </motion.div>
            <div className="flex justify-between gap-2 mt-4">
              {onPrint && (
                <Button variant="outline" onClick={onPrint}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir Controle
                </Button>
              )}
              <button onClick={onClose} className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500 hover:bg-emerald-600 px-5 py-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4" /> Fechar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
