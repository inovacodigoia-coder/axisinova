import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, Rocket, Users, Building2, UserPlus, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingWizardProps {
  companyName: string
  onComplete: () => void
  onSkip: () => void
}

const STEPS = [
  { id: 'welcome', title: 'Boas-vindas', icon: PartyPopper },
  { id: 'doctor', title: 'Primeiro Médico', icon: Users },
  { id: 'convenios', title: 'Convênios', icon: Building2 },
  { id: 'user', title: 'Primeiro Usuário', icon: UserPlus },
  { id: 'done', title: 'Pronto!', icon: Rocket },
]

const COMMON_CONVENIOS = ['Unimed', 'Hapvida', 'Bradesco Saúde', 'Amil', 'Particular', 'SUS']

export function OnboardingWizard({ companyName, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [doctorName, setDoctorName] = useState('')
  const [doctorCRM, setDoctorCRM] = useState('')
  const [doctorSpecialty, setDoctorSpecialty] = useState('')
  const [selectedConvenios, setSelectedConvenios] = useState<string[]>([])
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('Recepcionista')

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const toggleConvenio = (c: string) => {
    setSelectedConvenios(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Progress */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'gradient-bg' : 'bg-muted')} />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="text-center space-y-4">
                  <div className="text-5xl">🎉</div>
                  <h2 className="text-2xl font-bold text-foreground">Bem-vindo ao Axis Inova!</h2>
                  <p className="text-muted-foreground"><strong>{companyName}</strong> está pronta para decolar.</p>
                  <p className="text-sm text-muted-foreground">Vamos configurar o essencial em 5 minutos.</p>
                  <div className="flex flex-col gap-2 pt-4">
                    <button onClick={next} className="gradient-bg text-primary-foreground rounded-lg py-3 font-medium hover:opacity-90 transition-opacity">
                      Começar configuração
                    </button>
                    <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Pular e explorar sozinho
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">Cadastrar primeiro médico</h2>
                  <p className="text-sm text-muted-foreground">Adicione pelo menos um profissional para começar a agendar.</p>
                  <div className="space-y-3">
                    <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Nome completo" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={doctorCRM} onChange={e => setDoctorCRM(e.target.value)} placeholder="CRM" className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <select value={doctorSpecialty} onChange={e => setDoctorSpecialty(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Especialidade</option>
                        <option>Cardiologia</option>
                        <option>Clínica Geral</option>
                        <option>Dermatologia</option>
                        <option>Ortopedia</option>
                        <option>Pediatria</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={next} className="text-sm text-muted-foreground hover:text-foreground">Farei isso depois →</button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">Convênios atendidos</h2>
                  <p className="text-sm text-muted-foreground">Selecione os convênios que sua clínica atende.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMON_CONVENIOS.map(c => (
                      <button
                        key={c}
                        onClick={() => toggleConvenio(c)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                          selectedConvenios.includes(c)
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-input text-foreground hover:border-primary/50'
                        )}
                      >
                        {selectedConvenios.includes(c) && <Check className="h-4 w-4" />}
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">Convidar primeiro usuário</h2>
                  <p className="text-sm text-muted-foreground">Adicione uma pessoa da sua equipe.</p>
                  <div className="space-y-3">
                    <input value={userName} onChange={e => setUserName(e.target.value)} placeholder="Nome completo" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="E-mail" type="email" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <select value={userRole} onChange={e => setUserRole(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option>Recepcionista</option>
                      <option>Médico</option>
                      <option>Faturamento</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="text-center space-y-4">
                  <div className="text-5xl">✅</div>
                  <h2 className="text-2xl font-bold text-foreground">Sua clínica está configurada!</h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {doctorName && <p>✅ Médico cadastrado: {doctorName}</p>}
                    {selectedConvenios.length > 0 && <p>✅ Convênios habilitados: {selectedConvenios.length}</p>}
                    {userName && <p>✅ Usuário convidado: {userName}</p>}
                  </div>
                  <div className="flex flex-col gap-2 pt-4">
                    <button onClick={onComplete} className="gradient-bg text-primary-foreground rounded-lg py-3 font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                      <Rocket className="h-4 w-4" />
                      Ir para o Dashboard
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        {step > 0 && step < 4 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <button onClick={prev} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Anterior
            </button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {step} de {STEPS.length - 1}
            </div>
            <button onClick={next} className="inline-flex items-center gap-1 gradient-bg text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
