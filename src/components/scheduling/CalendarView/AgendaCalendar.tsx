import { useMemo } from 'react'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import type { LegacyDoctor as Doctor } from '@/mocks/company.mock'
import { DayColumn } from './DayColumn'
import { MOCK_DOCTORS } from '@/mocks/company.mock'
import { format, addDays, startOfWeek, getDaysInMonth, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppointmentCard } from './AppointmentCard'
import { STATUS_CONFIG } from '@/types/scheduling.types'
import type { ViewMode } from './AgendaFilters'

const TIME_SLOTS: string[] = []
for (let h = 7; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

interface Props {
  selectedDate: Date
  appointments: SchedulingAppointment[]
  doctorFilter: string
  viewMode: ViewMode
  onSlotClick: (doctor: Doctor, date: string, time: string) => void
  onAppointmentClick: (apt: SchedulingAppointment) => void
}

export function AgendaCalendar({ selectedDate, appointments, doctorFilter, viewMode, onSlotClick, onAppointmentClick }: Props) {
  const doctors = useMemo(() => {
    const active = MOCK_DOCTORS.filter(d => d.isActive)
    if (doctorFilter !== 'all') return active.filter(d => d.id === doctorFilter)
    return active
  }, [doctorFilter])

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  if (viewMode === 'day') {
    const dayAppts = appointments.filter(a => a.date === dateStr)

    return (
      <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-fit">
            {/* Time column */}
            <div className="flex flex-col w-[60px] shrink-0">
              <div className="sticky top-0 z-10 border-b border-border px-2 py-3 bg-card h-[76px]" />
              {TIME_SLOTS.map(t => (
                <div key={t} className="border-b border-border/30 min-h-[48px] flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{t}</span>
                </div>
              ))}
            </div>
            {/* Doctor columns */}
            {doctors.map(doc => (
              <DayColumn
                key={doc.id}
                doctor={doc}
                date={dateStr}
                appointments={dayAppts.filter(a => a.doctorId === doc.id)}
                timeSlots={TIME_SLOTS}
                onSlotClick={onSlotClick}
                onAppointmentClick={onAppointmentClick}
                isToday={dateStr === todayStr}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'week') {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    return (
      <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-border">
          {weekDays.map(day => {
            const ds = format(day, 'yyyy-MM-dd')
            const isToday = ds === todayStr
            const dayAppts = appointments.filter(a => a.date === ds).sort((a, b) => a.time.localeCompare(b.time))

            return (
              <div key={ds} className={`min-h-[300px] ${isToday ? 'bg-primary/5' : ''}`}>
                <div className="border-b border-border p-2 text-center">
                  <p className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: ptBR })}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>{format(day, 'dd')}</p>
                  <span className="text-[10px] text-muted-foreground">{dayAppts.length} agend.</span>
                </div>
                <div className="p-1 space-y-1">
                  {dayAppts.slice(0, 6).map(apt => (
                    <AppointmentCard key={apt.id} appointment={apt} onClick={onAppointmentClick} compact />
                  ))}
                  {dayAppts.length > 6 && (
                    <p className="text-[10px] text-center text-muted-foreground font-medium">+{dayAppts.length - 6} mais</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Month view
  const monthStart = startOfMonth(selectedDate)
  const daysInMonth = getDaysInMonth(selectedDate)
  const firstDayOfWeek = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDayOfWeek + 1
    if (dayNum < 1 || dayNum > daysInMonth) return null
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNum)
  })

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="min-h-[80px] border-b border-r border-border/30 bg-muted/30" />
          const ds = format(cell, 'yyyy-MM-dd')
          const isToday = ds === todayStr
          const dayAppts = appointments.filter(a => a.date === ds)
          const statusDots = [...new Set(dayAppts.map(a => a.status))].slice(0, 3)

          return (
            <div key={i} className={`min-h-[80px] border-b border-r border-border/30 p-1 ${isToday ? 'bg-primary/5' : ''}`}>
              <p className={`text-sm font-medium ${isToday ? 'text-primary font-bold' : 'text-foreground'}`}>{format(cell, 'd')}</p>
              {dayAppts.length > 0 && (
                <div className="mt-1">
                  <div className="flex gap-0.5">
                    {statusDots.map(s => (
                      <div key={s} className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].bg.replace('bg-', 'bg-')}`}
                        style={{ backgroundColor: s === 'confirmed' ? '#38A169' : s === 'scheduled' ? '#3B82F6' : s === 'waiting' ? '#D69E2E' : '#718096' }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{dayAppts.length} agend.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
