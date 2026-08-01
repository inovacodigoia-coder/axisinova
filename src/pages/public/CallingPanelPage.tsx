import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQueue } from '@/context/QueueContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { TicketBadge } from '@/components/reception/queue/TicketBadge'
import { Volume2, Users, Clock } from 'lucide-react'
import { DeviceAuthGate } from '@/components/public/DeviceAuthGate'

interface TVRow {
  id: string
  unit_id: string
  company_id: string
  name: string
  slug: string | null
  voice_type?: string | null
  access_username?: string | null
  access_password?: string | null
  media_mode?: string | null
  media_attachments?: any
}

interface PanelBranding {
  companyName: string
  logoUrl?: string | null
  primaryColor?: string
  secondaryColor?: string
}

interface QueueTicketRow {
  id: string
  unit_id: string
  queue_line_name: string
  display_code: string
  status: string
  guiche_name: string | null
  attendant_name: string | null
  called_at: string | null
  generated_at: string
  tv_id?: string | null
  call_count?: number | null
}

export default function CallingPanelPage() {
  const { slug } = useParams<{ slug: string }>()
  const { state, stats } = useQueue()
  const { user } = useAuth()
  const [time, setTime] = useState(new Date())
  const [flash, setFlash] = useState(false)
  const [tv, setTv] = useState<TVRow | null>(null)
  const [tickets, setTickets] = useState<QueueTicketRow[]>([])
  const [loadingPanel, setLoadingPanel] = useState(!!slug)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const lastCalledKeyRef = useRef<string | null>(null)
  const audioEnabledRef = useRef(false)
  const companyName = user?.companyName || 'Axis Inova'

  const [branding, setBranding] = useState<PanelBranding | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const loadPanelData = useCallback(async (currentTv: TVRow) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('queue_tickets')
      .select('*')
      .eq('unit_id', currentTv.unit_id)
      .gte('generated_at', startOfDay.toISOString())
      .order('generated_at', { ascending: true })
    if (error) {
      console.error('Erro ao carregar painel da TV', error)
      return
    }
    setTickets((data || []) as QueueTicketRow[])
  }, [])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function loadTv() {
      setLoadingPanel(true)
      const { data, error } = await supabase
        .from('queue_tvs')
        .select('id, unit_id, company_id, name, slug, voice_type, access_username, access_password, media_mode, media_attachments')
        .eq('slug', slug)
        .maybeSingle()
      if (cancelled) return
      if (error || !data) {
        console.error('TV não encontrada', error)
        setLoadingPanel(false)
        return
      }
      const currentTv = data as TVRow
      setTv(currentTv)

      // Load branding (company name + logo + colors)
      const [{ data: companyRow }, { data: brandRow }] = await Promise.all([
        supabase.from('companies').select('name, nome_fantasia').eq('id', currentTv.company_id).maybeSingle(),
        supabase.from('company_branding').select('primary_color, secondary_color, logo_url').eq('company_id', currentTv.company_id).maybeSingle(),
      ])
      if (!cancelled) {
        setBranding({
          companyName: (companyRow as any)?.nome_fantasia || (companyRow as any)?.name || 'Clínica',
          logoUrl: (brandRow as any)?.logo_url || null,
          primaryColor: (brandRow as any)?.primary_color,
          secondaryColor: (brandRow as any)?.secondary_color,
        })
      }

      await loadPanelData(currentTv)
      setLoadingPanel(false)
    }
    loadTv()
    return () => { cancelled = true }
  }, [slug, loadPanelData])

  useEffect(() => {
    if (!slug || !tv) return
    const channel = supabase
      .channel(`calling_panel_${tv.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets', filter: `unit_id=eq.${tv.unit_id}` }, () => loadPanelData(tv))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [slug, tv, loadPanelData])

  const panelCalled = useMemo(() => {
    if (!tv) return null
    return tickets
      .filter(t => t.tv_id === tv.id && t.status === 'called' && t.called_at)
      .sort((a, b) => new Date(b.called_at || '').getTime() - new Date(a.called_at || '').getTime())[0] || null
  }, [tickets, tv])

  const panelWaiting = useMemo(() => tickets.filter(t => t.status === 'waiting').slice(0, 6), [tickets])

  const panelLastCalled = useMemo(() => {
    if (!tv) return []
    return tickets
      .filter(t => t.tv_id === tv.id && t.called_at)
      .sort((a, b) => new Date(b.called_at || '').getTime() - new Date(a.called_at || '').getTime())
      .slice(0, 5)
  }, [tickets, tv])

  const mediaList: Array<{ id: string; type: string; fileUrl: string; durationSeconds: number; name: string }> = useMemo(() => {
    const raw = (tv?.media_attachments as any) || []
    if (!Array.isArray(raw)) return []
    return raw
  }, [tv?.media_attachments])
  const showMedia = (tv?.media_mode === 'with_media') && mediaList.length > 0
  const [mediaIdx, setMediaIdx] = useState(0)
  useEffect(() => {
    if (!showMedia) return
    const current = mediaList[mediaIdx % mediaList.length]
    const dur = (current?.durationSeconds || 15) * 1000
    const id = setTimeout(() => setMediaIdx(i => (i + 1) % mediaList.length), dur)
    return () => clearTimeout(id)
  }, [showMedia, mediaIdx, mediaList])

  const speakCall = useCallback((ticket: QueueTicketRow) => {
    if (!audioEnabledRef.current) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const wantMale = (tv?.voice_type || 'feminine') === 'masculine'
      const voices = window.speechSynthesis.getVoices()
      const ptVoices = voices.filter(v => v.lang?.toLowerCase().startsWith('pt'))
      const pickVoice = () => {
        const maleHints = /male|masculin|ricardo|daniel|luciano|felipe|paulo/i
        const femaleHints = /female|feminin|maria|luciana|fernanda|joana|ana|helena/i
        const list = ptVoices.length ? ptVoices : voices
        return list.find(v => (wantMale ? maleHints : femaleHints).test(v.name))
          || ptVoices[0]
          || voices[0]
      }
      const code = (ticket.display_code || '').split('').join(' ')
      const guiche = ticket.guiche_name ? `, dirija-se ao ${ticket.guiche_name}` : ''
      const text = `Atenção. Senha ${code}${guiche}.`
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'pt-BR'
      utter.rate = 0.95
      utter.pitch = wantMale ? 0.85 : 1.1
      const voice = pickVoice()
      if (voice) utter.voice = voice
      window.speechSynthesis.speak(utter)
    } catch (e) {
      console.warn('Falha ao sintetizar voz', e)
    }
  }, [tv?.voice_type])

  useEffect(() => {
    if (!panelCalled) return
    const calledKey = `${panelCalled.id}-${panelCalled.called_at}-${panelCalled.call_count || 1}`
    if (calledKey === lastCalledKeyRef.current) return
    lastCalledKeyRef.current = calledKey
    setFlash(true)
    try {
      const ctx = new AudioContext()
      const beep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        gain.gain.value = 0.3
        osc.start(start)
        osc.stop(start + duration)
      }
      beep(800, ctx.currentTime, 0.15)
      beep(1000, ctx.currentTime + 0.2, 0.2)
    } catch {}
    const speakTimer = setTimeout(() => speakCall(panelCalled), 600)
    const id = setTimeout(() => setFlash(false), 2000)
    return () => { clearTimeout(id); clearTimeout(speakTimer) }
  }, [panelCalled?.called_at, panelCalled?.call_count, panelCalled?.id, speakCall])

  // Prevent interaction on TV panel
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', prevent)
    return () => document.removeEventListener('contextmenu', prevent)
  }, [])

  useEffect(() => {
    if (slug || !state.lastCalledTicket) return
    setFlash(true)
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
  }, [slug, state.lastCalledTicket?.calledAt])

  if (slug) {
    const panelCompanyName = user?.companyName || 'AXIS INOVA'
    const waitingCount = panelWaiting.length
    const attendanceCount = tickets.filter(t => t.status === 'in_attendance').length

    return (
      <DeviceAuthGate deviceKind="tv" slug={slug} expectedUsername={tv?.access_username} expectedPassword={tv?.access_password} deviceName={tv?.name} loading={loadingPanel || !tv}>
      <div className="fixed inset-0 flex flex-col bg-background text-foreground">
        {!audioEnabled && (
          <button
            onClick={() => {
              try {
                const u = new SpeechSynthesisUtterance('Áudio ativado')
                u.lang = 'pt-BR'
                window.speechSynthesis?.speak(u)
              } catch {}
              audioEnabledRef.current = true
              setAudioEnabled(true)
            }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/95 backdrop-blur-sm"
          >
            <Volume2 className="h-16 w-16 text-primary" />
            <span className="text-2xl font-bold text-foreground">Clique para ativar o áudio</span>
            <span className="text-sm text-muted-foreground">Necessário para que a TV anuncie as chamadas por voz.</span>
          </button>
        )}
        <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.companyName} className="h-12 w-12 rounded-lg object-contain bg-white border border-border" />
            ) : (
              <div className="gradient-bg flex h-12 w-12 items-center justify-center rounded-lg text-base font-bold text-primary-foreground">
                {(branding?.companyName || 'C').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">{branding?.companyName || 'Clínica'}</h1>
              <p className="text-xs text-muted-foreground">{tv?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {waitingCount} aguardando</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {attendanceCount} em atendimento</span>
            <span className="font-mono text-lg text-foreground">
              {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs text-muted-foreground">
              {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </header>

        <main className="flex flex-1 min-h-0">
          <section className="relative flex flex-[4] min-h-0 overflow-hidden bg-muted/30">
            {flash && <div className="absolute inset-0 animate-pulse bg-primary/10 pointer-events-none z-10" />}
            {showMedia ? (
              <div className="flex w-full h-full">
                {/* Media half */}
                <div className="relative flex-1 bg-black overflow-hidden">
                  {(() => {
                    const m = mediaList[mediaIdx % mediaList.length]
                    if (!m) return null
                    if (m.type === 'video') {
                      return <video key={m.id} src={m.fileUrl} autoPlay muted playsInline className="h-full w-full object-cover" onEnded={() => setMediaIdx(i => (i + 1) % mediaList.length)} />
                    }
                    return <img key={m.id} src={m.fileUrl} alt={m.name} className="h-full w-full object-cover" />
                  })()}
                </div>
                {/* Call half */}
                <div className="flex flex-1 items-center justify-center bg-background p-6">
                  {panelCalled ? (
                    <div className="animate-scale-in text-center">
                      <p className="mb-3 flex items-center justify-center gap-2 text-base uppercase tracking-widest text-muted-foreground">
                        <Volume2 className="h-5 w-5 text-primary" /> Chamando agora
                      </p>
                      <p className="gradient-text mb-4 text-[96px] font-extrabold leading-none">{panelCalled.display_code}</p>
                      <p className="mb-2 text-2xl font-semibold text-foreground">{panelCalled.queue_line_name}</p>
                      <p className="text-2xl font-bold text-primary">{panelCalled.guiche_name || 'Recepção'}</p>
                      {(panelCalled.call_count || 1) > 1 && (
                        <span className="mt-4 inline-flex items-center justify-center rounded-full bg-warning/15 px-3 py-1 text-sm font-bold text-warning">
                          Chamada Nº {panelCalled.call_count}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <h2 className="mb-2 text-xl font-bold text-muted-foreground">Aguardando chamada</h2>
                      <p className="mt-2 font-mono text-3xl text-muted-foreground/70">
                        {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex w-full h-full items-center justify-center">
                {loadingPanel ? (
                  <p className="text-xl font-semibold text-muted-foreground">Carregando painel...</p>
                ) : panelCalled ? (
                  <div className="animate-scale-in text-center">
                    <p className="mb-4 flex items-center justify-center gap-2 text-lg uppercase tracking-widest text-muted-foreground">
                      <Volume2 className="h-5 w-5 text-primary" /> Chamando agora
                    </p>
                    <p className="gradient-text mb-6 text-[128px] font-extrabold leading-none">{panelCalled.display_code}</p>
                    <p className="mb-3 text-3xl font-semibold text-foreground">{panelCalled.queue_line_name}</p>
                    <p className="text-2xl font-bold text-primary">{panelCalled.guiche_name || 'Recepção'}</p>
                    {(panelCalled.call_count || 1) > 1 && (
                      <span className="mt-6 inline-flex items-center justify-center rounded-full bg-warning/15 px-4 py-2 text-base font-bold text-warning">
                        Chamada Nº {panelCalled.call_count}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="mb-2 text-2xl font-bold text-muted-foreground">{branding?.companyName || tv?.name}</h2>
                    <p className="text-lg text-muted-foreground">Nenhum paciente sendo chamado</p>
                    <p className="mt-6 font-mono text-4xl text-muted-foreground/70">
                      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="flex flex-1 min-w-[260px] max-w-[360px] flex-col border-l border-border bg-card min-h-0">
            {/* TOP: Últimas Chamadas (destaque) — altura ajustada ao conteúdo */}
            <div className="flex flex-col min-h-0 border-b-2 border-primary/30 flex-shrink-0" style={{ maxHeight: '60%' }}>
              <div className="border-b border-border bg-primary/5 px-4 py-2">
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Volume2 className="h-4 w-4" /> Últimas Chamadas
                </h2>
              </div>
              <div className="overflow-auto px-3 py-2">
                <div className="space-y-1.5">
                  {panelLastCalled.map((ticket, i) => (
                    <div key={ticket.id} className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${i === 0 ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background'}`}>
                      <span className={`flex h-10 min-w-16 items-center justify-center rounded-lg px-2 text-base font-extrabold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                        {ticket.display_code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{ticket.guiche_name || ticket.queue_line_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {ticket.called_at ? new Date(ticket.called_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          {ticket.attendant_name ? ` · ${ticket.attendant_name}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {panelLastCalled.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">Nenhuma chamada ainda hoje</p>}
                </div>
              </div>
            </div>
            {/* BOTTOM: Próximos na Fila (menos destaque) */}
            <div className="flex flex-col min-h-0 flex-1">
              <div className="border-b border-border bg-muted/40 px-4 py-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Próximos na Fila</h2>
              </div>
              <div className="flex-1 overflow-auto px-3 py-1.5">
                <div className="space-y-1">
                  {panelWaiting.map(ticket => (
                    <div key={ticket.id} className="flex items-center gap-2 py-1">
                      <span className="flex h-7 min-w-14 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-bold text-muted-foreground">{ticket.display_code}</span>
                      <p className="truncate text-xs text-muted-foreground flex-1">{ticket.queue_line_name}</p>
                    </div>
                  ))}
                  {panelWaiting.length === 0 && <p className="py-2 text-center text-[11px] text-muted-foreground/70">Sem fila</p>}
                </div>
              </div>
            </div>
            <div className="border-t border-border bg-muted/30 px-4 py-1 text-center">
              <p className="text-[9px] text-muted-foreground/50 tracking-wide">powered by <span className="font-semibold">AXIS INOVA</span></p>
            </div>
          </aside>
        </main>
      </div>
      </DeviceAuthGate>
    )
  }

  const waiting = state.entries.filter(e => ['waiting', 'documents_ok', 'called_doctor'].includes(e.status))
  const called = state.lastCalledTicket

  const isEmpty = !called && state.entries.length === 0

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg gradient-bg flex items-center justify-center text-white font-bold text-sm">AI</div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">AXIS INOVA</h1>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500 text-sm">{companyName}</span>
        </div>
        <div className="flex items-center gap-4 text-gray-500 text-sm">
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {stats.waiting} aguardando</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {stats.inProgress} em atendimento</span>
          <span className="text-lg font-mono text-gray-700">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-xs text-gray-400">
            {time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex">
        {/* Left - Called */}
        <div className="flex-[3] flex items-center justify-center relative overflow-hidden bg-gray-50">
          {flash && <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />}
          {isEmpty ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-300 mb-2">{companyName}</h2>
              <p className="text-gray-400 text-lg">Nenhum paciente aguardando</p>
              <p className="text-gray-300 text-4xl mt-6 font-mono">
                {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          ) : called ? (
            <div className="text-center animate-scale-in">
              <p className="text-gray-400 text-lg mb-4 uppercase tracking-widest flex items-center justify-center gap-2">
                <Volume2 className="h-5 w-5 text-primary" /> Chamando
              </p>
              <div className="mb-6">
                <span className="text-[120px] font-extrabold bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent leading-none">
                  {called.ticketNumber}
                </span>
              </div>
              <p className="text-gray-900 text-3xl font-semibold mb-3">{called.patientName}</p>
              <p className="text-gray-500 text-xl mb-2">{called.room || 'Recepção'}</p>
              <p className="text-gray-400 text-sm">{called.doctorName}</p>
              {called.callCount > 1 && (
                <span className="inline-block mt-4 px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full font-medium">
                  Chamada Nº {called.callCount}
                </span>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-300">
              <p className="text-2xl">Aguardando primeira chamada...</p>
              <p className="text-sm mt-2">{stats.waiting} pacientes na fila</p>
            </div>
          )}
        </div>

        {/* Right - Queue */}
        <div className="flex-[2] border-l border-gray-200 flex flex-col bg-white">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Próximos na Fila</h2>
          </div>
          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="space-y-3">
              {waiting.slice(0, 8).map(entry => (
                <div key={entry.id} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                  <TicketBadge category={entry.ticketCategory} number={entry.ticketNumber} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{entry.patientName}</p>
                    <p className="text-gray-400 text-xs">{entry.doctorName}</p>
                  </div>
                  {entry.isPreferential && <span className="text-amber-500 text-xs">⭐</span>}
                </div>
              ))}
              {waiting.length === 0 && (
                <p className="text-gray-300 text-sm text-center py-8">Nenhum paciente aguardando</p>
              )}
            </div>
          </div>
          <div className="px-6 py-3 border-t border-gray-200 text-center bg-gray-50">
            <p className="text-gray-400 text-xs">
              {stats.waiting} aguardando · {stats.inProgress} em atendimento · {stats.completed} concluídos
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
