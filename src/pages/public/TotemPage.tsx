import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQueue } from '@/context/QueueContext'
import { useScheduling } from '@/context/SchedulingContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { ELDERLY_AGE } from '@/types/reception.types'
import { Calendar, CreditCard, User, Search, ArrowLeft, Check, Printer, Ticket as TicketIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DeviceAuthGate } from '@/components/public/DeviceAuthGate'

type Screen =
  | 'welcome'
  | 'pick-queue'
  | 'search-options'
  | 'search-name'
  | 'search-cpf'
  | 'result'
  | 'select-appointment'
  | 'ticket'

interface QueueLineRow {
  id: string
  unit_id: string
  company_id: string
  name: string
  prefix: string
  prefix_alt: string | null
  color: string | null
  has_preferential: boolean
  has_preferential_80: boolean
  allow_totem_choice: boolean
  show_on_totem: boolean
  is_active: boolean
  totem_id: string | null
}

interface TotemRow {
  id: string
  unit_id: string
  company_id: string
  name: string
  slug: string | null
  access_username?: string | null
  access_password?: string | null
}

export default function TotemPage() {
  const { slug } = useParams<{ slug: string }>()
  const [screen, setScreen] = useState<Screen>('welcome')
  const [searchValue, setSearchValue] = useState('')
  const [foundPatient, setFoundPatient] = useState<any>(null)
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [generatedTicket, setGeneratedTicket] = useState('')
  const [countdown, setCountdown] = useState(10)

  const [totem, setTotem] = useState<TotemRow | null>(null)
  const [queueLines, setQueueLines] = useState<QueueLineRow[]>([])

  const { addToQueue, state } = useQueue()
  const { patients, appointments } = useScheduling()
  const { user } = useAuth()
  const fallbackCompanyId = user?.companyId || ''
  const [time, setTime] = useState(new Date())
  const today = new Date().toISOString().slice(0, 10)

  // Load totem + queue lines linked to this totem
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (slug) {
        const { data: totemRow } = await supabase
          .from('queue_totems')
          .select('id, unit_id, company_id, name, slug, access_username, access_password')
          .eq('slug', slug)
          .maybeSingle()
        if (cancelled || !totemRow) return
        setTotem(totemRow as TotemRow)
        const { data: lines } = await supabase
          .from('queue_lines')
          .select('id, unit_id, company_id, name, prefix, prefix_alt, color, has_preferential, has_preferential_80, allow_totem_choice, show_on_totem, is_active, totem_id')
          .eq('totem_id', totemRow.id)
          .eq('is_active', true)
          .eq('show_on_totem', true)
          .order('sort_order', { ascending: true })
        if (!cancelled) setQueueLines((lines || []) as QueueLineRow[])
      } else if (fallbackCompanyId) {
        const { data: lines } = await supabase
          .from('queue_lines')
          .select('id, unit_id, company_id, name, prefix, prefix_alt, color, has_preferential, has_preferential_80, allow_totem_choice, show_on_totem, is_active, totem_id')
          .eq('company_id', fallbackCompanyId)
          .eq('is_active', true)
          .eq('show_on_totem', true)
          .order('sort_order', { ascending: true })
        if (!cancelled) setQueueLines((lines || []) as QueueLineRow[])
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, fallbackCompanyId])

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (screen === 'welcome') return
    const id = setTimeout(() => {
      if (screen !== 'ticket') { setScreen('welcome'); setSearchValue('') }
    }, 60000)
    return () => clearTimeout(id)
  }, [screen, searchValue])

  useEffect(() => {
    if (screen !== 'ticket') return
    if (countdown <= 0) { setScreen('welcome'); setSearchValue(''); setCountdown(10); return }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [screen, countdown])

  const calculateAge = (birthDate: string) => Math.floor((Date.now() - new Date(birthDate).getTime()) / 31557600000)

  const handleSearch = useCallback(() => {
    const q = searchValue.toLowerCase().trim()
    if (!q) return
    const found = patients.find(p =>
      p.fullName.toLowerCase().includes(q) || (p.cpf && p.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, '')))
    )
    if (found) {
      setFoundPatient(found)
      const patAppts = appointments.filter(a =>
        a.patientId === found.id && a.date === today &&
        !['cancelled', 'completed'].includes(a.status)
      )
      setTodayAppointments(patAppts)
      if (patAppts.length === 1) {
        setSelectedAppointment(patAppts[0])
        setScreen('result')
      } else if (patAppts.length > 1) {
        setScreen('select-appointment')
      } else {
        setSelectedAppointment(null)
        setScreen('result')
      }
    } else {
      toast.error('Nenhum paciente encontrado')
    }
  }, [searchValue, patients, appointments, today])

  const handleCheckin = useCallback(() => {
    if (!foundPatient) return
    const age = calculateAge(foundPatient.birthDate)
    const appt = selectedAppointment
    addToQueue({
      companyId: fallbackCompanyId,
      patientId: foundPatient.id,
      patientName: foundPatient.fullName,
      patientAge: age,
      appointmentId: appt?.id || `apt_totem_${Date.now()}`,
      doctorId: appt?.doctorId || '',
      doctorName: appt?.doctorName || 'A definir',
      appointmentType: appt?.type || 'consultation',
      convenioId: appt?.convenioId || '',
      convenioName: appt?.convenioName || 'A definir',
      status: 'waiting',
      isPreferential: age >= ELDERLY_AGE,
      preferentialReason: age >= ELDERLY_AGE ? `Idoso (${age} anos)` : undefined,
    })
    const cat = age >= ELDERLY_AGE ? 'SP' : appt?.type === 'exam' ? 'EX' : appt?.type === 'procedure' ? 'PR' : 'SN'
    const count = state.entries.filter(e => e.ticketCategory === cat && e.createdAt.startsWith(today)).length + 1
    setGeneratedTicket(`${cat}${String(count).padStart(3, '0')}`)
    setScreen('ticket')
    setCountdown(10)
  }, [foundPatient, selectedAppointment, addToQueue, fallbackCompanyId, state.entries, today])

  // Pick a queue (no-appointment flow) — generate persistent ticket
  const handlePickQueue = useCallback(async (line: QueueLineRow, preferential: boolean) => {
    const prefix = preferential && line.prefix_alt ? line.prefix_alt : line.prefix
    const companyId = line.company_id
    const unitId = line.unit_id
    // count today's tickets for this queue+prefix
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)
    const { data: existing } = await supabase
      .from('queue_tickets')
      .select('number')
      .eq('queue_line_id', line.id)
      .eq('prefix', prefix)
      .gte('generated_at', startOfDay.toISOString())
      .order('number', { ascending: false })
      .limit(1)
    const nextNumber = (existing?.[0]?.number || 0) + 1
    const displayCode = `${prefix}${String(nextNumber).padStart(3, '0')}`
    const { error } = await supabase.from('queue_tickets').insert({
      company_id: companyId,
      unit_id: unitId,
      queue_line_id: line.id,
      queue_line_name: line.name,
      prefix,
      number: nextNumber,
      display_code: displayCode,
      status: 'waiting',
    })
    if (error) {
      toast.error('Erro ao gerar ficha: ' + error.message)
      return
    }
    setGeneratedTicket(displayCode)
    setScreen('ticket')
    setCountdown(10)
  }, [])

  const NumKey = ({ val, onPress }: { val: string; onPress: (v: string) => void }) => (
    <button onClick={() => onPress(val)} className="h-16 rounded-xl bg-white/10 text-white text-2xl font-bold hover:bg-white/20 active:scale-95 transition-all">
      {val}
    </button>
  )

  const content = (
    <div className="fixed inset-0 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'linear-gradient(180deg, hsl(191 100% 30%) 0%, hsl(262 92% 30%) 100%)', cursor: 'none' }}>

      <div className="pt-8 text-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AXIS INOVA</h1>
        <p className="text-white/70 text-sm">{user?.companyName || totem?.name || 'Clínica'}</p>
      </div>

      <div className="flex-1 flex items-center justify-center w-full max-w-2xl px-6 overflow-y-auto py-6">
        {screen === 'welcome' && (
          <div className="text-center w-full space-y-6 animate-fade-in">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Bem-vindo!</h2>
              <p className="text-white/80 text-lg">Como posso ajudar?</p>
            </div>
            <button onClick={() => setScreen('search-options')} className="w-full py-5 rounded-2xl bg-white text-[hsl(191,100%,30%)] font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <Calendar className="h-6 w-6" /> Tenho AGENDAMENTO
            </button>
            <button onClick={() => setScreen('pick-queue')} className="w-full py-5 rounded-2xl bg-white/10 text-white font-bold text-lg border border-white/20 hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <User className="h-6 w-6" /> Não tenho AGENDAMENTO
            </button>
          </div>
        )}

        {screen === 'pick-queue' && (
          <div className="w-full space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white text-center mb-4">Escolha a fila</h2>
            {queueLines.length === 0 ? (
              <div className="text-center text-white/70 py-10">
                <TicketIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-semibold">Nenhuma fila configurada</p>
                <p className="text-sm">Configure as filas para este totem em Configurar Local / Unidade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {queueLines.map(line => {
                  const showSplit = line.allow_totem_choice && (line.has_preferential || line.has_preferential_80) && line.prefix_alt
                  if (showSplit) {
                    return (
                      <div key={line.id} className="rounded-2xl bg-white/10 border border-white/20 p-3 flex flex-col gap-2">
                        <p className="text-white font-bold text-center text-lg">{line.name}</p>
                        <button
                          onClick={() => handlePickQueue(line, false)}
                          className="py-3 rounded-xl bg-white text-[hsl(191,100%,30%)] font-bold hover:shadow-lg active:scale-[0.98] transition-all"
                          style={{ borderLeft: `6px solid ${line.color || '#e0e0e0'}` }}
                        >
                          Normal · {line.prefix}
                        </button>
                        <button
                          onClick={() => handlePickQueue(line, true)}
                          className="py-3 rounded-xl bg-amber-400 text-amber-900 font-bold hover:shadow-lg active:scale-[0.98] transition-all"
                        >
                          Preferencial · {line.prefix_alt}
                        </button>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={line.id}
                      onClick={() => handlePickQueue(line, false)}
                      className="py-6 px-4 rounded-2xl bg-white text-[hsl(191,100%,30%)] font-bold text-lg shadow hover:shadow-lg active:scale-[0.98] transition-all flex flex-col items-center gap-1"
                      style={{ borderTop: `6px solid ${line.color || '#e0e0e0'}` }}
                    >
                      <span className="text-2xl">{line.prefix}</span>
                      <span className="text-sm opacity-80">{line.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <button onClick={() => setScreen('welcome')} className="text-white/60 text-sm flex items-center gap-1 mx-auto mt-4 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {screen === 'search-options' && (
          <div className="w-full space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Como deseja buscar?</h2>
            <button onClick={() => setScreen('search-name')} className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-3">
              <User className="h-5 w-5" /> Por nome
            </button>
            <button onClick={() => setScreen('search-cpf')} className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center gap-3">
              <CreditCard className="h-5 w-5" /> Por CPF
            </button>
            <button onClick={() => setScreen('welcome')} className="text-white/60 text-sm flex items-center gap-1 mx-auto mt-4 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {(screen === 'search-name' || screen === 'search-cpf') && (
          <div className="w-full space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white text-center">
              {screen === 'search-name' ? 'Digite seu nome' : 'Digite seu CPF'}
            </h2>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-white text-2xl font-mono min-h-[56px] flex items-center">
              {searchValue || <span className="text-white/30">{screen === 'search-name' ? 'Seu nome...' : '000.000.000-00'}</span>}
            </div>
            {screen === 'search-cpf' ? (
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','','0',''].map((v, i) => (
                  v ? <NumKey key={i} val={v} onPress={(val) => setSearchValue(s => s + val)} />
                  : i === 9 ? <button key={i} onClick={() => setSearchValue(s => s.slice(0, -1))} className="h-16 rounded-xl bg-white/5 text-white text-lg font-bold hover:bg-white/15 transition-all">⌫</button>
                  : <button key={i} onClick={handleSearch} className="h-16 rounded-xl bg-emerald-500/80 text-white text-lg font-bold hover:bg-emerald-500 transition-all"><Search className="h-6 w-6 mx-auto" /></button>
                ))}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-10 gap-1 mb-2">
                  {'QWERTYUIOP'.split('').map(l => (
                    <button key={l} onClick={() => setSearchValue(s => s + l)} className="h-12 rounded-lg bg-white/10 text-white text-sm font-bold hover:bg-white/20 active:scale-95 transition-all">{l}</button>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 mb-2 px-2">
                  {'ASDFGHJKL'.split('').map(l => (
                    <button key={l} onClick={() => setSearchValue(s => s + l)} className="h-12 rounded-lg bg-white/10 text-white text-sm font-bold hover:bg-white/20 active:scale-95 transition-all">{l}</button>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 px-6">
                  {'ZXCVBNM'.split('').map(l => (
                    <button key={l} onClick={() => setSearchValue(s => s + l)} className="h-12 rounded-lg bg-white/10 text-white text-sm font-bold hover:bg-white/20 active:scale-95 transition-all">{l}</button>
                  ))}
                  <button onClick={() => setSearchValue(s => s.slice(0, -1))} className="h-12 rounded-lg bg-white/5 text-white text-sm hover:bg-white/15 transition-all">⌫</button>
                  <button onClick={() => setSearchValue(s => s + ' ')} className="h-12 rounded-lg bg-white/5 text-white text-xs hover:bg-white/15 transition-all">ESP</button>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setScreen('search-options'); setSearchValue('') }} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all">
                <ArrowLeft className="h-4 w-4 inline mr-2" /> Voltar
              </button>
              <button onClick={handleSearch} className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all">
                <Search className="h-4 w-4 inline mr-2" /> Buscar
              </button>
            </div>
          </div>
        )}

        {screen === 'select-appointment' && foundPatient && (
          <div className="w-full space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-white text-center mb-2">
              {foundPatient.fullName} tem {todayAppointments.length} atendimentos hoje
            </h2>
            <p className="text-white/70 text-center text-sm mb-4">Selecione o atendimento para check-in:</p>
            {todayAppointments.map(appt => (
              <button
                key={appt.id}
                onClick={() => { setSelectedAppointment(appt); setScreen('result') }}
                className="w-full py-4 px-5 rounded-2xl bg-white/10 text-white text-left border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{appt.type === 'consultation' ? '📋' : appt.type === 'exam' ? '🔬' : '⚕️'}</span>
                  <div>
                    <p className="font-semibold">{appt.time} · {appt.type === 'consultation' ? 'Consulta' : appt.type === 'exam' ? 'Exame' : 'Procedimento'}</p>
                    <p className="text-sm text-white/70">{appt.doctorName} · {appt.convenioName}</p>
                  </div>
                </div>
              </button>
            ))}
            <button onClick={() => { setScreen('search-options'); setSearchValue(''); setFoundPatient(null) }} className="text-white/60 text-sm flex items-center gap-1 mx-auto mt-4 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {screen === 'result' && foundPatient && (
          <div className="w-full space-y-4 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Check className="h-6 w-6 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">
                  {selectedAppointment ? 'Agendamento Encontrado!' : 'Paciente Encontrado'}
                </h2>
              </div>
              <div className="space-y-2 text-white/90">
                <p className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-white/60" /> {foundPatient.fullName}</p>
                {selectedAppointment && (
                  <>
                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-white/60" /> Hoje, {time.toLocaleDateString('pt-BR')} às {selectedAppointment.time}</p>
                    <p className="flex items-center gap-2 text-sm text-white/70"><CreditCard className="h-4 w-4 text-white/60" /> {selectedAppointment.convenioName}</p>
                    <p className="text-sm text-white/70">{selectedAppointment.doctorName}</p>
                  </>
                )}
                {!selectedAppointment && (
                  <p className="text-sm text-white/70">Nenhum agendamento para hoje. Será encaminhado à recepção.</p>
                )}
              </div>
            </div>
            <button onClick={handleCheckin} className="w-full py-5 rounded-2xl bg-emerald-500 text-white font-bold text-lg shadow-lg hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Check className="h-6 w-6" /> CONFIRMAR CHECK-IN
            </button>
            <button onClick={() => { setScreen('search-options'); setSearchValue(''); setFoundPatient(null) }} className="text-white/60 text-sm flex items-center gap-1 mx-auto hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Não sou eu, voltar
            </button>
          </div>
        )}

        {screen === 'ticket' && (
          <div className="text-center w-full space-y-6 animate-scale-in">
            <Check className="h-16 w-16 text-emerald-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">FICHA GERADA</h2>
            <p className="text-white/70">Sua senha:</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl py-8 px-6 border border-white/20">
              <span className="text-7xl font-extrabold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                {generatedTicket}
              </span>
            </div>
            <p className="text-white/70">Aguarde ser chamado na recepção</p>
            <button onClick={() => toast.success('Senha enviada para impressão')} className="mx-auto flex items-center gap-2 py-3 px-6 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all">
              <Printer className="h-5 w-5" /> Imprimir senha
            </button>
            <div className="text-white/40 text-sm">
              Retornando em {countdown}s...
              <div className="w-48 h-1 bg-white/10 rounded-full mx-auto mt-2">
                <div className="h-full bg-white/40 rounded-full transition-all duration-1000" style={{ width: `${(countdown / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pb-6 text-center">
        <p className="text-white/50 text-sm">
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
