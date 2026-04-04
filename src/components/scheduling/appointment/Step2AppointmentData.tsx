import { MOCK_DOCTORS, MOCK_CONVENIOS, MOCK_EXAMS } from '@/mocks/company.mock'
import { MOCK_APPOINTMENTS } from '@/mocks/scheduling.mock'
import type { SchedulingPatient, AppointmentType } from '@/types/scheduling.types'
import { ConvenioSelector } from './ConvenioSelector'
import { FirstVisitBadge } from './FirstVisitBadge'
import { differenceInYears, format } from 'date-fns'

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
  onChange: (data: Partial<FormData>) => void
  prefilledDoctor?: string
  prefilledDate?: string
  prefilledTime?: string
}

export function Step2AppointmentData({ patient, formData, onChange, prefilledDoctor, prefilledDate, prefilledTime }: Props) {
  const doctor = MOCK_DOCTORS.find(d => d.id === formData.doctorId)
  const today = new Date().toISOString().split('T')[0]

  // Calculate available time slots
  const getAvailableSlots = () => {
    if (!formData.doctorId || !formData.date) return []
    const doc = MOCK_DOCTORS.find(d => d.id === formData.doctorId)
    if (!doc) return []
    const dayOfWeek = new Date(formData.date + 'T12:00:00').getDay()
    const schedules = doc.schedule.filter(s => s.dayOfWeek === dayOfWeek && s.active)
    if (schedules.length === 0) return []

    const slots: { time: string; available: boolean }[] = []
    schedules.forEach(sch => {
      const [sh, sm] = sch.startTime.split(':').map(Number)
      const [eh, em] = sch.endTime.split(':').map(Number)
      let mins = sh * 60 + sm
      const endMins = eh * 60 + em
      while (mins < endMins) {
        const t = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
        const occupied = MOCK_APPOINTMENTS.some(a =>
          a.doctorId === formData.doctorId && a.date === formData.date && a.time === t && a.status !== 'cancelled'
        )
        slots.push({ time: t, available: !occupied })
        mins += doc.consultDuration + doc.consultInterval
      }
    })
    return slots
  }

  const slots = getAvailableSlots()
  const age = differenceInYears(new Date(), new Date(patient.birthDate))
  const exams = formData.type !== 'consultation' ? MOCK_EXAMS.filter(e => e.isActive) : []

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Dados do Agendamento</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Tipo de Atendimento *</label>
            <div className="flex gap-2">
              {([
                { value: 'consultation' as AppointmentType, label: '📋 Consulta' },
                { value: 'exam' as AppointmentType, label: '🔬 Exame' },
                { value: 'procedure' as AppointmentType, label: '⚕️ Procedimento' },
              ]).map(t => (
                <button key={t.value} type="button"
                  onClick={() => onChange({ type: t.value, examId: '' })}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${formData.type === t.value
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-input hover:border-primary/30'
                    }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Doctor */}
          <div>
            <label className="text-sm font-medium text-foreground">Médico/Profissional *</label>
            <select value={formData.doctorId} onChange={e => onChange({ doctorId: e.target.value, convenioId: '', time: '' })}
              disabled={!!prefilledDoctor}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-60">
              <option value="">Selecione...</option>
              {MOCK_DOCTORS.filter(d => d.isActive).map(d => (
                <option key={d.id} value={d.id}>{d.fullName} · {d.mainSpecialty}</option>
              ))}
            </select>
          </div>

          {/* Convenio */}
          <ConvenioSelector doctorId={formData.doctorId} value={formData.convenioId} onChange={v => onChange({ convenioId: v })} />

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Data *</label>
              <input type="date" value={formData.date} min={today}
                onChange={e => onChange({ date: e.target.value, time: '' })}
                disabled={!!prefilledDate}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-60" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Horário *</label>
              <select value={formData.time} onChange={e => onChange({ time: e.target.value })}
                disabled={!!prefilledTime}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-60">
                <option value="">Selecione...</option>
                {slots.map(s => (
                  <option key={s.time} value={s.time} disabled={!s.available}>
                    {s.time}{!s.available ? ' (ocupado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exam selector */}
          {formData.type !== 'consultation' && (
            <div>
              <label className="text-sm font-medium text-foreground">Exame/Procedimento *</label>
              <select value={formData.examId} onChange={e => onChange({ examId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                <option value="">Selecione...</option>
                {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.tussCode} - {ex.name}</option>)}
              </select>
            </div>
          )}

          {/* Observations */}
          <div>
            <label className="text-sm font-medium text-foreground">Observações</label>
            <textarea value={formData.observations} onChange={e => onChange({ observations: e.target.value })} rows={2}
              placeholder="Informações adicionais para o atendimento..."
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
          </div>
        </div>

        {/* Right - Patient context */}
        <div className="rounded-xl border border-border p-4 bg-muted/30 space-y-3 h-fit">
          <h4 className="text-sm font-bold text-foreground">Paciente Selecionado</h4>
          <p className="font-semibold text-foreground">{patient.fullName}</p>
          <p className="text-xs text-muted-foreground">{age} anos · {patient.phone1}</p>
          {patient.convenioId && (
            <p className="text-xs text-muted-foreground">
              {MOCK_CONVENIOS.find(c => c.id === patient.convenioId)?.name || 'Convênio'}
            </p>
          )}
          {formData.doctorId && (
            <FirstVisitBadge patientId={patient.id} doctorId={formData.doctorId} appointments={MOCK_APPOINTMENTS} />
          )}

          {/* Alert for existing future appointments */}
          {MOCK_APPOINTMENTS.some(a => a.patientId === patient.id && a.date >= today && a.status !== 'cancelled') && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2">
              <p className="text-xs text-yellow-700 font-medium">⚠️ Paciente possui agendamentos futuros</p>
            </div>
          )}

          {/* Last appointments */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Últimos atendimentos</p>
            {MOCK_APPOINTMENTS
              .filter(a => a.patientId === patient.id && a.status === 'completed')
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)
              .map(a => (
                <p key={a.id} className="text-[10px] text-muted-foreground">
                  {format(new Date(a.date), 'dd/MM/yy')} · {a.doctorName} · {a.type === 'consultation' ? 'Consulta' : a.type === 'exam' ? 'Exame' : 'Procedimento'}
                </p>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
