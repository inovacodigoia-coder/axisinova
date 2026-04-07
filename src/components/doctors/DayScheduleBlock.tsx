import { useState, useMemo } from 'react'
import { AttendanceTypeSelector } from './AttendanceTypeSelector'
import type { DayScheduleConfig } from '@/types/schedule-config.types'
import type { Room } from '@/types/totem-tv.types'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  day: DayScheduleConfig
  dayName: string
  rooms: Room[]
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<DayScheduleConfig>) => void
}

function calculateMaxPatients(startTime: string, endTime: string, lunchStart?: string, lunchEnd?: string, duration?: number, interval?: number): number {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const start = toMin(startTime)
  const end = toMin(endTime)
  let total = end - start
  if (lunchStart && lunchEnd) {
    total -= (toMin(lunchEnd) - toMin(lunchStart))
  }
  const slotSize = (duration || 30) + (interval || 0)
  return Math.max(0, Math.floor(total / slotSize))
}

export function DayScheduleBlock({ day, dayName, rooms, isSelected, onSelect, onChange }: Props) {
  const [showLunch, setShowLunch] = useState(!!(day.lunchStart && day.lunchEnd))
  const [expanded, setExpanded] = useState(day.isActive)

  const maxPatients = useMemo(() => {
    if (!day.isActive) return 0
    return calculateMaxPatients(day.startTime, day.endTime, showLunch ? day.lunchStart : undefined, showLunch ? day.lunchEnd : undefined, day.slotDuration, day.intervalBetween)
  }, [day.isActive, day.startTime, day.endTime, day.lunchStart, day.lunchEnd, day.slotDuration, day.intervalBetween, showLunch])

  const capacityColor = maxPatients < 5 ? 'text-[hsl(var(--warning))]' : maxPatients > 30 ? 'text-primary' : 'text-[hsl(var(--success))]'
  const capacityBg = maxPatients < 5 ? 'bg-[hsl(var(--warning))]/10' : maxPatients > 30 ? 'bg-primary/10' : 'bg-[hsl(var(--success))]/10'

  return (
    <div
      className={cn(
        'rounded-xl border-2 transition-all cursor-pointer',
        !day.isActive && 'opacity-50 border-border bg-muted/20',
        day.isActive && isSelected && 'border-primary bg-primary/5',
        day.isActive && !isSelected && 'border-border hover:border-primary/30',
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={e => { e.stopPropagation(); onChange({ isActive: !day.isActive }) }}
            className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors', day.isActive ? 'border-primary bg-primary' : 'border-muted-foreground')}
          >
            {day.isActive && <span className="text-white text-[10px]">✓</span>}
          </button>
          <span className="text-sm font-bold text-foreground">{dayName}</span>
        </div>
        <div className="flex items-center gap-2">
          {day.isActive && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', capacityBg, capacityColor)}>
              📊 {maxPatients} pac/dia
            </span>
          )}
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} className="p-1 hover:bg-muted rounded">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {expanded && day.isActive && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3" onClick={e => e.stopPropagation()}>
          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Início</label>
              <input type="time" value={day.startTime} onChange={e => onChange({ startTime: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Fim</label>
              <input type="time" value={day.endTime} onChange={e => onChange({ endTime: e.target.value })}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
            </div>
          </div>

          {/* Lunch */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowLunch(!showLunch); if (showLunch) onChange({ lunchStart: undefined, lunchEnd: undefined }) }}
              className={cn('text-[10px] font-medium px-2 py-1 rounded-md border', showLunch ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted')}>
              🍽️ Intervalo de almoço
            </button>
          </div>
          {showLunch && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Almoço início</label>
                <input type="time" value={day.lunchStart || '12:00'} onChange={e => onChange({ lunchStart: e.target.value })}
                  className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Almoço fim</label>
                <input type="time" value={day.lunchEnd || '13:00'} onChange={e => onChange({ lunchEnd: e.target.value })}
                  className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
              </div>
            </div>
          )}

          {/* Attendance types */}
          <AttendanceTypeSelector
            selected={day.attendanceTypes}
            onChange={types => onChange({ attendanceTypes: types })}
          />

          {/* Duration + interval override */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Duração (min)</label>
              <input type="number" min={1} max={120} value={day.slotDuration}
                onChange={e => { const v = Number(e.target.value); if (v > 0) onChange({ slotDuration: v }) }}
                list="day-duration-presets"
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
              <datalist id="day-duration-presets">
                {[15, 20, 30, 45, 60].map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Intervalo (min)</label>
              <input type="number" min={0} max={60} value={day.intervalBetween}
                onChange={e => { const v = Number(e.target.value); if (v >= 0) onChange({ intervalBetween: v }) }}
                list="day-interval-presets"
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs" />
              <datalist id="day-interval-presets">
                {[0, 5, 10, 15].map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>

          {/* Room */}
          {rooms.length > 0 && (
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">Sala</label>
              <select value={day.roomId || ''} onChange={e => onChange({ roomId: e.target.value || undefined })}
                className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs">
                <option value="">Sem sala vinculada</option>
                {rooms.filter(r => r.isActive).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
