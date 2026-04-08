import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQueueSystem } from '@/context/QueueSystemContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function TVPanelPage() {
  const { state } = useQueueSystem()
  const [sessionData, setSessionData] = useState<{ unitId: string; unitName: string; tvId: string; tvName: string } | null>(null)
  const [clock, setClock] = useState(new Date())
  const [flash, setFlash] = useState(false)
  const prevCalledRef = useRef<string | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('queue_tv_session')
    if (raw) setSessionData(JSON.parse(raw))
  }, [])

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Flash on new call
  useEffect(() => {
    const last = state.lastCalledTicket
    if (last && last.id !== prevCalledRef.current) {
      prevCalledRef.current = last.id
      setFlash(true)
      setTimeout(() => setFlash(false), 300)
      try {
        const ctx = new AudioContext()
        const beep = (start: number) => { const o = ctx.createOscillator(); o.frequency.value = 440; o.connect(ctx.destination); o.start(start); o.stop(start + 0.2) }
        beep(ctx.currentTime)
        beep(ctx.currentTime + 0.3)
      } catch {}
    }
  }, [state.lastCalledTicket])

  if (!sessionData) {
    return <div className="min-h-screen flex items-center justify-center bg-[hsl(220,26%,8%)] text-white"><p>Carregando...</p></div>
  }

  const unitTickets = state.tickets.filter(t => t.unitId === sessionData.unitId)
  const calledTicket = state.lastCalledTicket?.tvId === sessionData.tvId ? state.lastCalledTicket : unitTickets.find(t => t.status === 'called')
  const waitingTickets = unitTickets.filter(t => t.status === 'waiting').slice(0, 5)
  const waitingCount = unitTickets.filter(t => t.status === 'waiting').length

  const tv = state.tvs.find(t => t.id === sessionData.tvId)
  const hasMedia = tv?.mediaMode === 'with_media' && tv.mediaAttachments.length > 0

  return (
    <div className="min-h-screen bg-[hsl(220,26%,8%)] text-white flex flex-col">
      {/* Flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <span className="text-sm font-bold">{sessionData.unitName}</span>
        <span className="text-sm text-white/70">
          {format(clock, 'HH:mm')} — {format(clock, "dd/MM/yyyy", { locale: ptBR })}
        </span>
      </header>

      {/* Main */}
      <div className="flex-1 flex">
        {/* Calling */}
        <div className={`flex-1 flex flex-col items-center justify-center ${hasMedia ? 'w-[60%]' : 'w-[65%]'}`}>
          <p className="text-sm text-white/50 uppercase tracking-widest mb-4">Chamando Agora</p>
          {calledTicket ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={calledTicket.id}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-center"
              >
                <span className="text-8xl font-black tracking-tight">{calledTicket.displayCode}</span>
                <p className="text-xl text-white/70 mt-4">{calledTicket.queueLineName}</p>
                {calledTicket.guicheName && <p className="text-2xl font-bold text-primary mt-2">{calledTicket.guicheName}</p>}
                {calledTicket.callCount > 1 && (
                  <span className="inline-block mt-3 bg-primary/20 text-primary text-sm font-bold px-3 py-1 rounded-full">
                    CHAMADA Nº {calledTicket.callCount}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-2xl text-white/30">Aguardando chamada...</p>
          )}
        </div>

        {/* Queue list */}
        <div className={`border-l border-white/10 p-6 space-y-4 ${hasMedia ? 'w-[40%]' : 'w-[35%]'}`}>
          {!hasMedia && (
            <>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Próximos</h3>
              <div className="space-y-2">
                {waitingTickets.map(t => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                    <span className="text-lg font-bold">{t.displayCode}</span>
                    <span className="text-sm text-white/60">· {t.queueLineName}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/40">Aguardando: {waitingCount} fichas</p>
            </>
          )}
          {hasMedia && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Próximos</h3>
              {waitingTickets.slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                  <span className="text-lg font-bold">{t.displayCode}</span>
                  <span className="text-sm text-white/60">· {t.queueLineName}</span>
                </div>
              ))}
              <p className="text-sm text-white/40">Aguardando: {waitingCount} fichas</p>
              <div className="mt-4 rounded-lg bg-white/5 aspect-video flex items-center justify-center">
                <p className="text-sm text-white/30">📺 Área de mídia</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
