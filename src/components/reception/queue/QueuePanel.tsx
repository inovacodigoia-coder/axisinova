import { useState } from 'react'
import { useQueue } from '@/context/QueueContext'
import { QueueCard } from './QueueCard'
import { cn } from '@/lib/utils'
import { Users, Clock, CheckCircle } from 'lucide-react'

interface QueuePanelProps {
  selectedId: string | null
  onSelect: (id: string) => void
  onCheckin: (id: string) => void
}

const FILTERS = ['Todos', 'Aguardando', 'Chamados', 'Atendimento'] as const
type Filter = typeof FILTERS[number]

const FILTER_MAP: Record<Filter, string[]> = {
  Todos: [],
  Aguardando: ['waiting', 'documents_ok'],
  Chamados: ['called', 'called_doctor'],
  Atendimento: ['in_reception', 'in_progress'],
}

export function QueuePanel({ selectedId, onSelect, onCheckin }: QueuePanelProps) {
  const { state, callTicket, stats } = useQueue()
  const [filter, setFilter] = useState<Filter>('Todos')

  const sorted = [...state.entries]
    .filter(e => e.status !== 'completed' && e.status !== 'absent')
    .filter(e => filter === 'Todos' || FILTER_MAP[filter].includes(e.status))
    .sort((a, b) => {
      if (a.isPreferential && !b.isPreferential) return -1
      if (!a.isPreferential && b.isPreferential) return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

  return (
    <div className="flex flex-col h-full bg-[hsl(220,20%,12%)] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[hsl(220,15%,20%)]">
        <h2 className="text-sm font-bold text-white tracking-wider mb-2">FILA DE ESPERA</h2>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-blue-400"><Users className="h-3 w-3" />{stats.waiting}</span>
          <span className="flex items-center gap-1 text-violet-400"><Clock className="h-3 w-3" />{stats.inProgress}</span>
          <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="h-3 w-3" />{stats.completed}</span>
        </div>
      </div>

      <div className="flex gap-1 p-2 border-b border-[hsl(220,15%,20%)]">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-[10px] px-2 py-1 rounded font-medium transition-colors',
              filter === f ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sorted.map(entry => (
          <QueueCard
            key={entry.id}
            entry={entry}
            selected={selectedId === entry.id}
            onSelect={() => onSelect(entry.id)}
            onCall={() => callTicket(entry.id)}
            onCheckin={() => onCheckin(entry.id)}
          />
        ))}
        {sorted.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">Nenhum paciente na fila</div>
        )}
      </div>
    </div>
  )
}
