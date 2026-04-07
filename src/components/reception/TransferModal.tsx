import { useState } from 'react'
import { useQueue } from '@/context/QueueContext'
import { useRegisters } from '@/context/RegistersContext'
import { toast } from 'sonner'

interface Props {
  entryId: string
  onClose: () => void
}

export function TransferModal({ entryId, onClose }: Props) {
  const { state } = useQueue()
  const { doctors } = useRegisters()
  const entry = state.entries.find(e => e.id === entryId)
  const [targetDoctor, setTargetDoctor] = useState('')
  const [observation, setObservation] = useState('')
  const [notifyDoctor, setNotifyDoctor] = useState(true)

  if (!entry) return null

  const handleConfirm = () => {
    toast.success(`${entry.patientName} transferido com sucesso`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">↪ Transferir Paciente</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Paciente</p>
            <p className="text-sm font-semibold text-foreground">{entry.patientName} · {entry.ticketNumber}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Transferir para o médico:</label>
            <select value={targetDoctor} onChange={e => setTargetDoctor(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {doctors.filter(d => d.isActive && !d.isBlocked).map(d => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Observação</label>
            <textarea value={observation} onChange={e => setObservation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" rows={2}
              placeholder="Motivo da transferência..." />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifyDoctor} onChange={e => setNotifyDoctor(e.target.checked)} className="rounded border-input" />
            <span className="text-sm text-foreground">Notificar médico de destino</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button onClick={handleConfirm} disabled={!targetDoctor}
            className="gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Confirmar transferência
          </button>
        </div>
      </div>
    </div>
  )
}
