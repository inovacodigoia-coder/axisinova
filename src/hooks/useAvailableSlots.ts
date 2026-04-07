import { useMemo } from 'react'
import type { Doctor } from '@/types/registers.types'
import type { SchedulingAppointment } from '@/types/scheduling.types'

export interface TimeSlot {
  time: string
  isAvailable: boolean
  duration: number
}

export interface AvailableSlotsResult {
  slots: TimeSlot[]
  error: 'no_doctor' | 'no_schedule' | 'not_working_day' | null
  dayName?: string
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function generateTimeSlots(
  startTime: string,
  endTime: string,
  stepMinutes: number,
  lunchStart?: string,
  lunchEnd?: string
): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let mins = sh * 60 + sm
  const endMins = eh * 60 + em
  const slots: string[] = []

  const lunchStartMins = lunchStart ? lunchStart.split(':').map(Number).reduce((h, m) => h * 60 + m) : null
  const lunchEndMins = lunchEnd ? lunchEnd.split(':').map(Number).reduce((h, m) => h * 60 + m) : null

  while (mins < endMins) {
    if (lunchStartMins !== null && lunchEndMins !== null && mins >= lunchStartMins && mins < lunchEndMins) {
      mins = lunchEndMins
      continue
    }
    const t = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    slots.push(t)
    mins += stepMinutes
  }
  return slots
}

export function useAvailableSlots(
  doctor: Doctor | null | undefined,
  date: string | null,
  appointments: SchedulingAppointment[]
): AvailableSlotsResult {
  return useMemo(() => {
    if (!doctor) return { slots: [], error: 'no_doctor' }
    if (!doctor.scheduleConfig) return { slots: [], error: 'no_schedule' }
    if (!date) return { slots: [], error: null }

    const dayOfWeek = new Date(date + 'T12:00:00').getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

    // Check blocked dates
    if (doctor.scheduleConfig.blockedDates?.includes(date)) {
      return { slots: [], error: 'not_working_day', dayName: DAY_NAMES[dayOfWeek] }
    }

    const workDay = doctor.scheduleConfig.workDays.find(wd => wd.day === dayOfWeek && wd.isActive)

    if (!workDay) {
      return { slots: [], error: 'not_working_day', dayName: DAY_NAMES[dayOfWeek] }
    }

    const duration = doctor.scheduleConfig.consultationDuration
    const interval = doctor.scheduleConfig.intervalBetween
    const allSlots = generateTimeSlots(
      workDay.startTime,
      workDay.endTime,
      duration + interval,
      workDay.lunchStart,
      workDay.lunchEnd
    )

    const occupiedSlots = appointments
      .filter(a => a.doctorId === doctor.id && a.date === date && a.status !== 'cancelled')
      .map(a => a.time)

    return {
      slots: allSlots.map(time => ({
        time,
        isAvailable: !occupiedSlots.includes(time),
        duration,
      })),
      error: null,
    }
  }, [doctor, date, appointments])
}
