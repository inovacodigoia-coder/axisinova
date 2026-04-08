import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QueueLine } from '@/types/queue-system.types'

interface SelectQueuesModalProps {
  queues: QueueLine[]
  selected: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
}

export function SelectQueuesModal({ queues, selected, onSave, onClose }: SelectQueuesModalProps) {
  const [sel, setSel] = useState<string[]>(selected)
  const [tab, setTab] = useState<'attendance' | 'collect'>('attendance')

  const filtered = queues.filter(q => q.category === tab)

  const toggle = (id: string) => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Selecione as filas</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="flex gap-1 rounded-lg border border-border p-0.5 w-fit">
          <button onClick={() => setTab('attendance')} className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === 'attendance' ? 'bg-[hsl(222,70%,35%)] text-white' : 'text-muted-foreground hover:bg-muted')}>
            Atendimento
          </button>
          <button onClick={() => setTab('collect')} className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === 'collect' ? 'bg-[hsl(222,70%,35%)] text-white' : 'text-muted-foreground hover:bg-muted')}>
            Coleta
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {filtered.map(q => (
            <label key={q.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer">
              <input
                type="checkbox"
                checked={sel.includes(q.id)}
                onChange={() => toggle(q.id)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <span className="text-sm text-foreground">{q.name}</span>
            </label>
          ))}
          {!filtered.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fila nesta categoria</p>}
        </div>

        <div className="flex justify-end">
          <button onClick={() => onSave(sel)} className="rounded-lg bg-green-500 px-6 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
