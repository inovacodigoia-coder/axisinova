import { useMemo } from 'react'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import type { LegacyDoctor as Doctor } from '@/mocks/company.mock'
import { AppointmentCard } from './AppointmentCard'
import { AppointmentSlot } from './AppointmentSlot'

interface Props {
  doctor: Doctor
  date: string
  appointments: SchedulingAppointment[]
  timeSlots: string[]
  onSlotClick: (doctor: Doctor, date: string, time: string) => void
  onAppointmentClick: (apt: SchedulingAppointment) => void
  isToday?: boolean
}

export function DayColumn({ doctor, date, appointments, timeSlots, onSlotClick, onAppointmentClick, isToday }: Props) {
  const aptMap = useMemo(() => {
    const map = new Map<string, SchedulingAppointment>()
    appointments.forEach(a => map.set(a.time, a))
    return map
  }, [appointments])

  const todayCount = appointments.filter(a => a.status !== 'cancelled').length

  return (
    <div className="flex flex-col min-w-[160px]">
      <div className={`sticky top-0 z-10 border-b border-border px-2 py-3 text-center bg-card ${isToday ? 'bg-primary/5' : ''}`}>
        <div className="flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white">
            {doctor.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-foreground truncate max-w-[100px]">{doctor.fullName}</p>
            <p className="text-[10px] text-muted-foreground">{doctor.mainSpecialty}</p>
          </div>
        </div>
        <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {todayCount} paciente{todayCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1">
        {timeSlots.map(time => {
          const apt = aptMap.get(time)
          return (
            <div key={time} className="border-b border-border/30 min-h-[48px] border-l border-border/50">
              <AppointmentSlot
                time={time}
                isEmpty={!apt}
                onClickEmpty={() => onSlotClick(doctor, date, time)}
              >
                {apt && <AppointmentCard appointment={apt} onClick={onAppointmentClick} />}
              </AppointmentSlot>
            </div>
          )
        })}
      </div>
    </div>
  )
}
