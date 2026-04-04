import { useState, useEffect } from 'react'
import { useQueue } from '@/context/QueueContext'
import { TicketBadge } from '@/components/reception/queue/TicketBadge'
import { Volume2, Users, Clock } from 'lucide-react'

export default function CallingPanelPage() {
  const { state, stats } = useQueue()
  const [time, setTime] = useState(new Date())
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Flash on new call
  useEffect(() => {
    if (state.lastCalledTicket) {
      setFlash(true)
      // Play beep sound
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 800
        gain.gain.value = 0.3
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
        setTimeout(() => {
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.frequency.value = 1000
          gain2.gain.value = 0.3
          osc2.start()
          osc2.stop(ctx.currentTime + 0.2)
        }, 200)
      } catch {}
      setTimeout(() => setFlash(false), 2000)
    }
  }, [state.lastCalledTicket?.calledAt])

  const waiting = state.entries.filter(e => ['waiting', 'documents_ok', 'called_doctor'].includes(e.status))
  const called = state.lastCalledTicket

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0D1117' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-white tracking-tight">AXIS INOVA</h1>
          <span className="text-white/40">·</span>
          <span className="text-white/60 text-sm">Clínica Demo</span>
        </div>
        <div className="flex items-center gap-4 text-white/60 text-sm">
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {stats.waiting} aguardando</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {stats.inProgress} em atendimento</span>
          <span className="text-lg font-mono text-white/80">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-xs text-white/40">
            {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex">
        {/* Left - Called */}
        <div className="flex-[3] flex items-center justify-center relative overflow-hidden">
          {flash && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
          {called ? (
            <div className="text-center animate-scale-in">
              <p className="text-white/50 text-lg mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
                <Volume2 className="h-5 w-5" /> Chamando
              </p>
              <div className="mb-6">
                <span className="text-[120px] font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent leading-none">
                  {called.ticketNumber}
                </span>
              </div>
              <p className="text-white text-3xl font-semibold mb-3">{called.patientName}</p>
              <p className="text-white/60 text-xl mb-2">{called.room || 'Recepção'}</p>
              <p className="text-white/40 text-sm">{called.doctorName}</p>
              {called.callCount > 1 && (
                <span className="inline-block mt-4 px-3 py-1 bg-amber-500/20 text-amber-400 text-sm rounded-full font-medium">
                  Chamada Nº {called.callCount}
                </span>
              )}
            </div>
          ) : (
            <div className="text-center text-white/20">
              <p className="text-2xl">Aguardando chamada...</p>
            </div>
          )}
        </div>

        {/* Right - Queue */}
        <div className="flex-[2] border-l border-white/10 flex flex-col">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">Próximos na Fila</h2>
          </div>
          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="space-y-3">
              {waiting.slice(0, 8).map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                  <TicketBadge category={entry.ticketCategory} number={entry.ticketNumber} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium truncate">{entry.patientName}</p>
                    <p className="text-white/40 text-xs">{entry.doctorName}</p>
                  </div>
                  {entry.isPreferential && <span className="text-amber-400 text-xs">⭐</span>}
                </div>
              ))}
              {waiting.length === 0 && (
                <p className="text-white/30 text-sm text-center py-8">Nenhum paciente aguardando</p>
              )}
            </div>
          </div>
          <div className="px-6 py-3 border-t border-white/10 text-center">
            <p className="text-white/30 text-xs">
              {stats.waiting} aguardando · {stats.inProgress} em atendimento · {stats.completed} concluídos
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
