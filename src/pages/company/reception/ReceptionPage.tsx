import { useState, useEffect } from 'react'
import { QueuePanel } from '@/components/reception/queue/QueuePanel'
import { CheckinPanel } from '@/components/reception/checkin/CheckinPanel'
import { DocumentsPanel } from '@/components/reception/documents/DocumentsPanel'
import { useQueue } from '@/context/QueueContext'
import { Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReceptionPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { stats } = useQueue()
  const [mobileTab, setMobileTab] = useState<'queue' | 'checkin' | 'docs'>('queue')
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const now = new Date()

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(id)
  }, [])



  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Recepção</h1>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {time}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium">
            <Users className="h-3.5 w-3.5" /> {stats.waiting} aguardando
          </span>
          <span className="flex items-center gap-1.5 text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full font-medium">
            <Clock className="h-3.5 w-3.5" /> {stats.inProgress} em atendimento
          </span>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-1 mb-3 lg:hidden">
        {(['queue', 'checkin', 'docs'] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-colors',
              mobileTab === tab ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground'
            )}>
            {tab === 'queue' ? 'Fila' : tab === 'checkin' ? 'Check-in' : 'Documentos'}
          </button>
        ))}
      </div>

      {/* Three panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-4 min-h-0">
        <div className={cn('min-h-0', mobileTab !== 'queue' && 'hidden lg:block')}>
          <QueuePanel
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCheckin={(id) => { setSelectedId(id); setMobileTab('checkin') }}
          />
        </div>
        <div className={cn('min-h-0 bg-card rounded-xl border border-border overflow-hidden', mobileTab !== 'checkin' && 'hidden lg:block')}>
          <CheckinPanel selectedQueueId={selectedId} />
        </div>
        <div className={cn('min-h-0 bg-card rounded-xl border border-border overflow-hidden', mobileTab !== 'docs' && 'hidden lg:block')}>
          <DocumentsPanel selectedQueueId={selectedId} />
        </div>
      </div>
    </div>
  )
}
