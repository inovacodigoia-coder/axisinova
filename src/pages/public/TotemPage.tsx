import { useState, useEffect, useCallback } from 'react'
import { useQueue } from '@/context/QueueContext'
import { MOCK_PATIENTS } from '@/mocks/scheduling.mock'
import { Monitor, Calendar, CreditCard, User, Search, ArrowLeft, Check, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Screen = 'welcome' | 'search-options' | 'search-name' | 'search-cpf' | 'result' | 'ticket'

export default function TotemPage() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [searchValue, setSearchValue] = useState('')
  const [foundPatient, setFoundPatient] = useState<typeof MOCK_PATIENTS[0] | null>(null)
  const [generatedTicket, setGeneratedTicket] = useState('')
  const [countdown, setCountdown] = useState(10)
  const { addToQueue, state } = useQueue()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-reset after idle
  useEffect(() => {
    if (screen === 'welcome') return
    const id = setTimeout(() => {
      if (screen !== 'ticket') { setScreen('welcome'); setSearchValue('') }
    }, 60000)
    return () => clearTimeout(id)
  }, [screen, searchValue])

  // Ticket countdown
  useEffect(() => {
    if (screen !== 'ticket') return
    if (countdown <= 0) { setScreen('welcome'); setSearchValue(''); setCountdown(10); return }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [screen, countdown])

  const handleSearch = useCallback(() => {
    const q = searchValue.toLowerCase().trim()
    const found = MOCK_PATIENTS.find(p =>
      p.fullName.toLowerCase().includes(q) || (p.cpf && p.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, '')))
    )
    if (found) {
      setFoundPatient(found)
      setScreen('result')
    } else {
      toast.error('Nenhum agendamento encontrado')
    }
  }, [searchValue])

  const handleCheckin = useCallback(() => {
    if (!foundPatient) return
    const age = Math.floor((Date.now() - new Date(foundPatient.birthDate).getTime()) / 31557600000)
    addToQueue({
      patientId: foundPatient.id,
      patientName: foundPatient.fullName,
      patientAge: age,
      appointmentId: `apt_totem_${Date.now()}`,
      doctorId: 'doc_01',
      doctorName: 'Dr. Henrique Lima',
      appointmentType: 'consultation',
      convenioId: foundPatient.convenioId || 'conv_04',
      convenioName: 'Convênio',
      status: 'waiting',
      isPreferential: age >= 60,
      preferentialReason: age >= 60 ? `Idoso (${age} anos)` : undefined,
    })
    const lastEntry = state.entries[state.entries.length - 1]
    setGeneratedTicket(age >= 60 ? `SP${String(state.entries.filter(e => e.ticketCategory === 'SP').length + 1).padStart(3, '0')}` : `SN${String(state.entries.filter(e => e.ticketCategory === 'SN').length + 1).padStart(3, '0')}`)
    setScreen('ticket')
    setCountdown(10)
  }, [foundPatient, addToQueue, state.entries])

  const NumKey = ({ val, onPress }: { val: string; onPress: (v: string) => void }) => (
    <button onClick={() => onPress(val)} className="h-16 rounded-xl bg-white/10 text-white text-2xl font-bold hover:bg-white/20 active:scale-95 transition-all">
      {val}
    </button>
  )

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'linear-gradient(180deg, hsl(191 100% 30%) 0%, hsl(262 92% 30%) 100%)', cursor: 'none' }}>

      {/* Logo */}
      <div className="pt-8 text-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">AXIS INOVA</h1>
        <p className="text-white/70 text-sm">Clínica Demo</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-lg px-6">
        {screen === 'welcome' && (
          <div className="text-center w-full space-y-6 animate-fade-in">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Bem-vindo!</h2>
              <p className="text-white/80 text-lg">Como posso ajudar?</p>
            </div>
            <button onClick={() => setScreen('search-options')} className="w-full py-5 rounded-2xl bg-white text-[hsl(191,100%,30%)] font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <Calendar className="h-6 w-6" /> Tenho AGENDAMENTO
            </button>
            <button className="w-full py-5 rounded-2xl bg-white/10 text-white font-bold text-lg border border-white/20 hover:bg-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <User className="h-6 w-6" /> Não tenho AGENDAMENTO
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

        {screen === 'result' && foundPatient && (
          <div className="w-full space-y-4 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                <Check className="h-6 w-6 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Agendamento Encontrado!</h2>
              </div>
              <div className="space-y-2 text-white/90">
                <p className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-white/60" /> {foundPatient.fullName}</p>
                <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-white/60" /> Hoje, {time.toLocaleDateString('pt-BR')} às 09:00</p>
                <p className="flex items-center gap-2 text-sm text-white/70"><CreditCard className="h-4 w-4 text-white/60" /> {foundPatient.convenioId === 'conv_04' ? 'Particular' : 'Convênio'}</p>
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
            <h2 className="text-2xl font-bold text-white">CHECK-IN REALIZADO</h2>
            <p className="text-white/70">Sua senha:</p>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl py-8 px-6 border border-white/20">
              <span className="text-7xl font-extrabold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                {generatedTicket}
              </span>
            </div>
            <div className="text-white/70 space-y-1">
              <p>Aguarde ser chamado na recepção</p>
              <p className="text-sm">Posição na fila: {state.entries.filter(e => e.status === 'waiting').length}ª</p>
            </div>
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

      {/* Footer */}
      <div className="pb-6 text-center">
        <p className="text-white/50 text-sm">
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
