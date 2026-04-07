import { useMemo, useState, useEffect } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import { useScheduling } from '@/context/SchedulingContext'
import { useAvailableSlots } from '@/hooks/useAvailableSlots'
import { useRestrictionAlerts } from '@/hooks/useRestrictionAlerts'
import { ConvenioSelector } from './ConvenioSelector'
import { FirstVisitBadge } from './FirstVisitBadge'
import { DependencyAlert } from '@/components/scheduling/empty-states/DependencyAlert'
import { RestrictionAlertSystem } from '@/components/doctors/RestrictionAlertSystem'
import type { SchedulingPatient, AppointmentType } from '@/types/scheduling.types'
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
  const { doctors, convenios, exams, procedures, specialties } = useRegisters()
  const { appointments } = useScheduling()
  const today = new Date().toISOString().split('T')[0]

  const activeDoctors = useMemo(() => doctors.filter(d => d.isActive && !d.isBlocked), [doctors])
  const activeExams = useMemo(() => exams.filter(e => e.isActive), [exams])
  const activeProcedures = useMemo(() => procedures.filter(p => p.isActive), [procedures])

  const selectedDoctor = doctors.find(d => d.id === formData.doctorId)
  const slotsResult = useAvailableSlots(selectedDoctor, formData.date, appointments)

  const age = differenceInYears(new Date(), new Date(patient.birthDate))

  const getSpecialtyName = (doc: typeof doctors[0]) => {
    if (doc.specialtyIds.length === 0) return ''
    return specialties.find(s => s.id === doc.specialtyIds[0])?.name || ''
  }

  const examItems = formData.type === 'exam' ? activeExams : formData.type === 'procedure' ? activeProcedures : []

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Dados do Agendamento</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Tipo de Atendimento *</label>
            <div className="flex gap-2">
              {([
                { value: 'consultation' as AppointmentType, label: '📋 Consulta', count: null },
                { value: 'exam' as AppointmentType, label: '🔬 Exame', count: activeExams.length },
                { value: 'procedure' as AppointmentType, label: '⚕️ Procedimento', count: activeProcedures.length },
              ]).map(t => (
                <button key={t.value} type="button"
                  onClick={() => onChange({ type: t.value, examId: '' })}
                  disabled={t.count !== null && t.count === 0}
                  title={t.count === 0 ? `Nenhum ${t.value === 'exam' ? 'exame' : 'procedimento'} cadastrado. Vá em Cadastros.` : undefined}
                  className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${formData.type === t.value
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-input hover:border-primary/30'
                    }`}>
                  {t.label}
                  {t.count !== null && <span className="ml-1 text-[10px]">({t.count})</span>}
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
              {activeDoctors.map(d => (
                <option key={d.id} value={d.id}>{d.fullName} · {getSpecialtyName(d)}</option>
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
                disabled={!!prefilledDate || !formData.doctorId}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-60" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Horário *</label>
              {slotsResult.error === 'no_schedule' && formData.doctorId && (
                <DependencyAlert
                  icon="⚠️"
                  message={`${selectedDoctor?.fullName || 'Médico'} não possui horários configurados.`}
                  actionLabel="Configurar agenda"
                  actionRoute="/app/cadastros/medicos"
                  variant="warning"
                />
              )}
              {slotsResult.error === 'not_working_day' && (
                <p className="text-xs text-yellow-600 mt-1">ℹ️ {selectedDoctor?.fullName} não atende às {slotsResult.dayName}s. Selecione outro dia.</p>
              )}
              {!slotsResult.error && slotsResult.slots.length > 0 && slotsResult.slots.every(s => !s.isAvailable) && (
                <p className="text-xs text-yellow-600 mt-1">📅 Todos os horários deste dia estão ocupados. Selecione outra data.</p>
              )}
              <select value={formData.time} onChange={e => onChange({ time: e.target.value })}
                disabled={!!prefilledTime || !formData.doctorId || !formData.date || slotsResult.error !== null}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm disabled:opacity-60">
                <option value="">{!formData.doctorId ? 'Selecione um médico' : !formData.date ? 'Selecione uma data' : 'Selecione...'}</option>
                {slotsResult.slots.map(s => (
                  <option key={s.time} value={s.time} disabled={!s.isAvailable}>
                    {s.time}{!s.isAvailable ? ' (ocupado)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exam selector */}
          {formData.type !== 'consultation' && (
            <div>
              <label className="text-sm font-medium text-foreground">{formData.type === 'exam' ? 'Exame' : 'Procedimento'} *</label>
              {examItems.length === 0 ? (
                <DependencyAlert
                  icon="⚠️"
                  message={`Nenhum ${formData.type === 'exam' ? 'exame' : 'procedimento'} cadastrado.`}
                  actionLabel={`Cadastrar ${formData.type === 'exam' ? 'Exame' : 'Procedimento'}`}
                  actionRoute={`/app/cadastros/${formData.type === 'exam' ? 'exames' : 'procedimentos'}`}
                  variant="warning"
                />
              ) : (
                <select value={formData.examId} onChange={e => onChange({ examId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
                  <option value="">Selecione...</option>
                  {examItems.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {'tussCode' in ex && ex.tussCode ? `${ex.tussCode} - ` : ''}{ex.name}
                    </option>
                  ))}
                </select>
              )}
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
              {convenios.find(c => c.id === patient.convenioId)?.name || 'Convênio'}
            </p>
          )}
          {formData.doctorId && (
            <FirstVisitBadge patientId={patient.id} doctorId={formData.doctorId} appointments={appointments} />
          )}

          {/* Alert for existing future appointments */}
          {appointments.some(a => a.patientId === patient.id && a.date >= today && a.status !== 'cancelled') && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-2">
              <p className="text-xs text-yellow-700 font-medium">⚠️ Paciente possui agendamentos futuros</p>
            </div>
          )}

          {/* Last appointments */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Últimos atendimentos</p>
            {appointments
              .filter(a => a.patientId === patient.id && a.status === 'completed')
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)
              .map(a => (
                <p key={a.id} className="text-[10px] text-muted-foreground">
                  {format(new Date(a.date), 'dd/MM/yy')} · {a.doctorName} · {a.type === 'consultation' ? 'Consulta' : a.type === 'exam' ? 'Exame' : 'Procedimento'}
                </p>
              ))
            }
            {appointments.filter(a => a.patientId === patient.id && a.status === 'completed').length === 0 && (
              <p className="text-[10px] text-muted-foreground">Nenhum atendimento anterior registrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
