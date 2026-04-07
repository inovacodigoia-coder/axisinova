import { useMemo } from 'react'
import type { DayScheduleConfig } from '@/types/schedule-config.types'
import { cn } from '@/lib/utils'

interface Props {
  day: DayScheduleConfig
  dayName: string
}

function generateSlots(day: DayScheduleConfig) {
  if (!day.isActive) return []
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  const start = toMin(day.startTime)
  const end = toMin(day.endTime)
  const lunchS = day.lunchStart ? toMin(day.lunchStart) : null
  const lunchE = day.lunchEnd ? toMin(day.lunchEnd) : null
  const step = day.slotDuration + day.intervalBetween
  const slots: { time: string; endTime: string; isLunch: boolean; slotNumber: number }[] = []

  // Add lunch block
  if (lunchS !== null && lunchE !== null) {
    slots.push({ time: fmtTime(lunchS), endTime: fmtTime(lunchE), isLunch: true, slotNumber: 0 })
  }

  let current = start
  let num = 1
  while (current + day.slotDuration <= end) {
    if (lunchS !== null && lunchE !== null && current >= lunchS && current < lunchE) {
      current = lunchE
      continue
    }
    slots.push({ time: fmtTime(current), endTime: fmtTime(current + day.slotDuration), isLunch: false, slotNumber: num++ })
    current += step
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time))
}

export function ScheduleSlotPreview({ day, dayName }: Props) {
  const slots = useMemo(() => generateSlots(day), [day])
  const availableSlots = slots.filter(s => !s.isLunch)

  if (!day.isActive) {
    return (
      <div className="rounded-xl border border-border p-6 bg-card">
        <h4 className="text-sm font-bold text-foreground mb-2">Preview — {dayName}</h4>
        <p className="text-sm text-muted-foreground">Dia desativado</p>
      </div>
    )
  }

  const typeLabels = day.attendanceTypes.map(t => t === 'consultation' ? 'Consulta' : t === 'exam' ? 'Exame' : t === 'procedure' ? 'Procedimento' : 'Misto')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h4 className="text-sm font-bold text-foreground">Preview — {dayName}</h4>
        <p className="text-[10px] text-muted-foreground mt-1">
          {availableSlots.length} slots · {day.startTime} às {day.endTime} · {day.slotDuration} min cada
        </p>
      </div>
      <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
        {slots.map((slot, idx) => (
          <div key={idx} className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all',
            slot.isLunch ? 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' : 'bg-muted/30 text-foreground'
          )}>
            <span className="font-mono font-medium w-24">{slot.time} – {slot.endTime}</span>
            <span className="h-4 w-px bg-border" />
            {slot.isLunch ? (
              <span className="font-medium">🍽️ Almoço · Bloqueado</span>
            ) : (
              <>
                <span className="text-[hsl(var(--success))]">🟢 Disponível</span>
                <div className="flex gap-1 ml-auto">
                  {typeLabels.map(label => (
                    <span key={label} className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-medium">{label}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        {slots.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum slot disponível</p>
        )}
      </div>
    </div>
  )
}
