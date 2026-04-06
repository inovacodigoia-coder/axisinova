import { useState } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Step1PatientSearch } from './Step1PatientSearch'
import { Step2AppointmentData } from './Step2AppointmentData'
import { Step3Confirmation } from './Step3Confirmation'
import { PatientQuickForm } from './PatientQuickForm'
import { useRegisters } from '@/context/RegistersContext'
import type { SchedulingPatient, AppointmentType } from '@/types/scheduling.types'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: any) => void
  prefilledDoctor?: string
  prefilledDate?: string
  prefilledTime?: string
}

export function AppointmentWizard({ open, onClose, onSave, prefilledDoctor, prefilledDate, prefilledTime }: Props) {
  const navigate = useNavigate()
  const { doctors, convenios } = useRegisters()
  const [step, setStep] = useState(1)
  const [patient, setPatient] = useState<SchedulingPatient | null>(null)
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'consultation' as AppointmentType,
    doctorId: prefilledDoctor || '',
    convenioId: '',
    date: prefilledDate || '',
    time: prefilledTime || '',
    examId: '',
    observations: '',
  })

  if (!open) return null

  const activeDoctors = doctors.filter(d => d.isActive && !d.isBlocked)
  const activeConvenios = convenios.filter(c => c.isActive)
  const hasDoctors = activeDoctors.length > 0
  const hasConvenios = activeConvenios.length > 0

  // Pre-validation: no doctors
  if (!hasDoctors) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card rounded-2xl shadow-2xl p-8 max-w-md text-center space-y-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold text-foreground">Não é possível criar agendamento</h2>
          <p className="text-sm text-muted-foreground">Você precisa cadastrar ao menos um médico antes de criar agendamentos.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { onClose(); navigate('/app/cadastros/medicos') }}
              className="rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              👨‍⚕️ Ir para Cadastro de Médicos
            </button>
            <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">Fechar</button>
          </div>
        </div>
      </div>
    )
  }

  const canGoStep2 = !!patient
  const canGoStep3 = formData.doctorId && formData.convenioId && formData.date && formData.time &&
    (formData.type === 'consultation' || formData.examId)

  const handleConfirm = (confirmMethod: '24h' | '48h' | null) => {
    setLoading(true)
    setTimeout(() => {
      onSave({ patient, ...formData, confirmMethod })
      toast.success('Agendamento realizado com sucesso!')
      setLoading(false)
      onClose()
      setStep(1)
      setPatient(null)
      setFormData({ type: 'consultation', doctorId: '', convenioId: '', date: '', time: '', examId: '', observations: '' })
    }, 800)
  }

  const steps = [
    { num: 1, label: 'Paciente' },
    { num: 2, label: 'Agendamento' },
    { num: 3, label: 'Confirmação' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-2xl bg-card shadow-2xl overflow-y-auto"
      >
        {/* No convenios warning */}
        {!hasConvenios && step === 1 && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Atenção:</strong> Sem convênios cadastrados.{' '}
              <button onClick={() => { onClose(); navigate('/app/cadastros/convenios') }} className="text-primary hover:underline font-medium">
                Cadastrar Convênios
              </button>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Novo Agendamento</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-colors ${step >= s.num ? 'gradient-bg text-white' : 'bg-muted text-muted-foreground'}`}>
                  {s.num}
                </div>
                <span className={`text-xs font-medium ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > s.num ? 'gradient-bg' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && !showQuickForm && (
            <Step1PatientSearch
              onSelect={p => { setPatient(p); setStep(2) }}
              onCreateNew={() => setShowQuickForm(true)}
            />
          )}
          {step === 1 && showQuickForm && (
            <PatientQuickForm
              onSave={p => { setPatient(p); setShowQuickForm(false); setStep(2) }}
              onCancel={() => setShowQuickForm(false)}
            />
          )}
          {step === 2 && patient && (
            <Step2AppointmentData
              patient={patient}
              formData={formData}
              onChange={d => setFormData(prev => ({ ...prev, ...d }))}
              prefilledDoctor={prefilledDoctor}
              prefilledDate={prefilledDate}
              prefilledTime={prefilledTime}
            />
          )}
          {step === 3 && patient && (
            <Step3Confirmation
              patient={patient}
              formData={formData}
              onConfirm={handleConfirm}
              loading={loading}
            />
          )}
        </div>

        {/* Footer nav */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex items-center gap-1 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          ) : <div />}
          {step < 3 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canGoStep2 : !canGoStep3}
              className="flex items-center gap-1 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
