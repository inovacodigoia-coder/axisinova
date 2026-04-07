import { useState, useEffect } from 'react'
import { useQueue } from '@/context/QueueContext'
import { cn } from '@/lib/utils'
import { Users, Stethoscope } from 'lucide-react'
import WaitingQueuePage from './WaitingQueuePage'
import ActiveAttendancePage from './ActiveAttendancePage'

export default function ReceptionLayout() {
  const { stats } = useQueue()
  const [activeTab, setActiveTab] = useState<'queue' | 'attendance'>('queue')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const now = new Date()

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000)
    return () => clearInterval(id)
  }, [])

  const goToAttendance = (id: string) => {
    setSelectedPatientId(id)
    setActiveTab('attendance')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Recepção</h1>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {time}</p>
        </div>
      </div>

      {/* Submenu */}
      <div className="flex gap-1 mb-4 rounded-xl border border-border bg-card p-1">
        <button onClick={() => setActiveTab('queue')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
            activeTab === 'queue'
              ? 'gradient-bg text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}>
          <Users className="h-4 w-4" />
          FILA DE ESPERA
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', activeTab === 'queue' ? 'bg-white/20' : 'bg-muted')}>
            {stats.waiting}
          </span>
        </button>
        <button onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
            activeTab === 'attendance'
              ? 'gradient-bg text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}>
          <Stethoscope className="h-4 w-4" />
          ATENDIMENTO ATIVO
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', activeTab === 'attendance' ? 'bg-white/20' : 'bg-muted')}>
            {stats.inProgress}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'queue' ? (
          <WaitingQueuePage onSelectPatient={goToAttendance} />
        ) : (
          <ActiveAttendancePage selectedId={selectedPatientId} onSelectId={setSelectedPatientId} />
        )}
      </div>
    </div>
  )
}
