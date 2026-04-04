import type { SchedulingAppointment } from '@/types/scheduling.types'

interface Props {
  patientId: string
  doctorId: string
  appointments: SchedulingAppointment[]
}

export function FirstVisitBadge({ patientId, doctorId, appointments }: Props) {
  const hasCompleted = appointments.some(a =>
    a.patientId === patientId && a.doctorId === doctorId &&
    (a.status === 'completed' || a.status === 'in_progress')
  )

  if (!hasCompleted) {
    return (
      <span className="inline-flex items-center rounded-full gradient-bg px-2 py-0.5 text-[10px] font-bold text-white">
        1ª VEZ
      </span>
    )
  }

  const lastVisit = appointments
    .filter(a => a.patientId === patientId && a.doctorId === doctorId && (a.status === 'completed' || a.status === 'in_progress'))
    .sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      RETORNO {lastVisit && <span className="text-[9px]">· últ. {lastVisit.date.split('-').reverse().join('/')}</span>}
    </span>
  )
}
