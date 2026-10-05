import { useState } from 'react'
import { GradientButton } from '@/components/ui/GradientButton'
import { useRegisters } from '@/context/RegistersContext'
import { useScheduling } from '@/context/SchedulingContext'
import type { SchedulingPatient, AppointmentType } from '@/types/scheduling.types'
import { APPOINTMENT_TYPE_CONFIG } from '@/types/scheduling.types'
import { FirstVisitBadge } from './FirstVisitBadge'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'

interface FormData {
  type: AppointmentType
  doctorId: string
  convenioId: string
  date: string
  time: string
  examId: string
  observations: string
}

interface Props {
  patient: SchedulingPatient
  formData: FormData
  onConfirm: (confirmMethod: '24h' | '48h' | null) => void
  loading: boolean
}

export function Step3Confirmation({ patient, formData, onConfirm, loading }: Props) {
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [method, setMethod] = useState<'24h' | '48h'>('24h')
  const { doctors, convenios, exams, procedures } = useRegisters()
  const { appointments } = useScheduling()

  const doctor = doctors.find(d => d.id === formData.doctorId)
  const convenio = convenios.find(c => c.id === formData.convenioId)
  const exam = formData.examId
    ? exams.find(e => e.id === formData.examId) || procedures.find(p => p.id === formData.examId)
    : null
  const typeCfg = APPOINTMENT_TYPE_CONFIG[formData.type]
  const aptDate = new Date(formData.date + 'T12:00:00')
  const confirmDate = method === '24h' ? addDays(aptDate, -1) : addDays(aptDate, -2)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Revisão e Confirmação</h3>

      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
        <p className="text-sm font-bold text-primary flex items-center gap-2">✅ RESUMO DO AGENDAMENTO</p>
        <div className="space-y-2 text-sm">
          <div className="flex gap-3"><span className="text-muted-foreground w-24">👤 Paciente:</span><span className="font-medium text-foreground">{patient.fullName}</span></div>
          <div className="flex gap-3 items-center">
            <span className="text-muted-foreground w-24">🏷️ Tipo:</span>
            <FirstVisitBadge patientId={patient.id} doctorId={formData.doctorId} appointments={appointments} />
            <span className="font-medium text-foreground">{typeCfg.icon} {typeCfg.label}</span>
            {exam && <span className="text-muted-foreground">· {exam.name}</span>}
          </div>
          <div className="flex gap-3"><span className="text-muted-foreground w-24">👨‍⚕️ Médico:</span><span className="font-medium text-foreground">{doctor?.fullName}</span></div>
          <div className="flex gap-3"><span className="text-muted-foreground w-24">📅 Data/Hora:</span><span className="font-medium text-foreground">{format(aptDate, "EEE, dd/MM/yyyy", { locale: ptBR })} {formData.time}</span></div>
          <div className="flex gap-3"><span className="text-muted-foreground w-24">💳 Convênio:</span><span className="font-medium text-foreground">{convenio?.name}</span></div>
          <div className="flex gap-3"><span className="text-muted-foreground w-24">📞 Telefones:</span><span className="font-medium text-foreground">{patient.phone1}{patient.phone2 ? ` · ${patient.phone2}` : ''}</span></div>
          {formData.observations && <div className="flex gap-3"><span className="text-muted-foreground w-24">📝 Obs:</span><span className="text-foreground">{formData.observations}</span></div>}
        </div>
      </div>

      {/* Auto confirmation */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Enviar confirmação automática?</label>
          <button type="button" onClick={() => setAutoConfirm(!autoConfirm)}
            className={`relative h-6 w-11 rounded-full transition-colors ${autoConfirm ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${autoConfirm ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {autoConfirm && (
          <>
            <div className="flex gap-3">
              {(['24h', '48h'] as const).map(m => (
                <label key={m} className={`flex-1 flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer transition-all ${method === m ? 'border-primary bg-primary/5' : 'border-input'}`}>
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">📱 {m} antes</p>
                    <p className="text-xs text-muted-foreground">Envio: {format(confirmDate, 'dd/MM/yyyy')}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p className="italic">
                A mensagem segue os modelos configurados em Configurações &gt; WhatsApp, alternando entre eles.
              </p>
            </div>
          </>
        )}
      </div>

      <GradientButton
        onClick={() => onConfirm(autoConfirm ? method : null)}
        disabled={loading}
        className="w-full py-3 text-base"
      >
        {loading ? <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Salvando...</> : 'Confirmar Agendamento'}
      </GradientButton>
    </div>
  )
}
