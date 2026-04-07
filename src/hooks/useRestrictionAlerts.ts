import { useCallback } from 'react'
import { useRegisters } from '@/context/RegistersContext'
import type { RestrictionAlert } from '@/types/schedule-config.types'
import type { AppointmentType } from '@/types/scheduling.types'

interface RestrictionCheckParams {
  doctorId?: string
  convenioId?: string
  examId?: string
  procedureId?: string
  appointmentType?: AppointmentType
  date?: string
}

export function useRestrictionAlerts() {
  const { doctors, convenios, exams, procedures } = useRegisters()

  const checkRestrictions = useCallback((params: RestrictionCheckParams): RestrictionAlert[] => {
    const alerts: RestrictionAlert[] = []

    // Rule: Exam requires authorization
    if (params.examId) {
      const exam = exams.find(e => e.id === params.examId)
      if (exam?.requiresAuthorization) {
        alerts.push({
          id: `auth_${params.examId}`,
          severity: 'warning',
          title: 'Autorização prévia necessária',
          message: `"${exam.name}" requer autorização prévia do convênio antes do agendamento.`,
          canContinue: true,
          requiresConfirmation: true,
          confirmationLabel: 'Já tenho autorização, continuar',
          details: [exam.authorizationInstructions || 'Certifique-se de obter a autorização antes da data do exame.'],
        })
      }
    }

    // Rule: Procedure requires authorization
    if (params.procedureId) {
      const proc = procedures.find(p => p.id === params.procedureId)
      if (proc?.requiresAuthorization) {
        alerts.push({
          id: `auth_proc_${params.procedureId}`,
          severity: 'warning',
          title: 'Autorização prévia necessária',
          message: `"${proc.name}" requer autorização prévia do convênio.`,
          canContinue: true,
          requiresConfirmation: true,
          confirmationLabel: 'Já tenho autorização, continuar',
          details: [proc.authorizationInstructions || 'Certifique-se de obter a autorização.'],
        })
      }
    }

    // Rule: Doctor not enabled for convenio
    if (params.doctorId && params.convenioId) {
      const doctor = doctors.find(d => d.id === params.doctorId)
      if (doctor && !doctor.enabledConvenioIds.includes(params.convenioId)) {
        alerts.push({
          id: `doc_conv_${params.doctorId}_${params.convenioId}`,
          severity: 'block',
          title: 'Médico não habilitado neste convênio',
          message: `${doctor.fullName} não atende pelo convênio selecionado.`,
          canContinue: false,
          requiresConfirmation: false,
          details: ['Configure os convênios habilitados em Cadastros → Médicos → Aba Convênios.'],
        })
      }
    }

    // Rule: Attendance type not available on day
    if (params.doctorId && params.date && params.appointmentType) {
      const doctor = doctors.find(d => d.id === params.doctorId)
      if (doctor?.scheduleConfig) {
        const dayOfWeek = new Date(params.date + 'T12:00:00').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
        const workDay = doctor.scheduleConfig.workDays.find(wd => wd.day === dayOfWeek && wd.isActive)
        // We can check attendance types if they were configured in the extended format
        // For now this is a placeholder check
      }
    }

    return alerts
  }, [doctors, convenios, exams, procedures])

  return { checkRestrictions }
}
