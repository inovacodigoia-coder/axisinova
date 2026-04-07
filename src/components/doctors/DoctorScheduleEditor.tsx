import { useState, useMemo, useCallback } from 'react'
import { DayScheduleBlock } from './DayScheduleBlock'
import { ScheduleSlotPreview } from './ScheduleSlotPreview'
import type { DayScheduleConfig } from '@/types/schedule-config.types'
import type { Room } from '@/types/totem-tv.types'
import { Save } from 'lucide-react'

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const DURATIONS = [15, 20, 30, 45, 60]
const INTERVALS = [0, 5, 10, 15]

interface Props {
  initialDays?: DayScheduleConfig[]
  defaultDuration?: number
  defaultInterval?: number
  rooms?: Room[]
  onSave: (days: DayScheduleConfig[], defaultDuration: number, defaultInterval: number) => void
}

function createDefaultDays(duration: number, interval: number): DayScheduleConfig[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i as DayScheduleConfig['dayOfWeek'],
    isActive: i >= 1 && i <= 5,
    startTime: '08:00',
    endTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    attendanceTypes: ['consultation'] as DayScheduleConfig['attendanceTypes'],
    slotDuration: duration,
    intervalBetween: interval,
    maxPatients: 0,
    roomId: undefined,
  }))
}

export function DoctorScheduleEditor({ initialDays, defaultDuration = 30, defaultInterval = 10, rooms = [], onSave }: Props) {
  const [globalDuration, setGlobalDuration] = useState(defaultDuration)
  const [globalInterval, setGlobalInterval] = useState(defaultInterval)
  const [days, setDays] = useState<DayScheduleConfig[]>(() => initialDays?.length === 7 ? initialDays : createDefaultDays(defaultDuration, defaultInterval))
  const [selectedDay, setSelectedDay] = useState(1)

  const updateDay = useCallback((dayOfWeek: number, updates: Partial<DayScheduleConfig>) => {
    setDays(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d))
  }, [])

  const applyToAll = () => {
    setDays(prev => prev.map(d => d.isActive ? { ...d, slotDuration: globalDuration, intervalBetween: globalInterval } : d))
  }

  const selectedDayConfig = days[selectedDay]

  return (
    <div className="space-y-4">
      {/* Global defaults */}
      <div className="rounded-xl border border-border p-4 bg-muted/30">
        <h4 className="text-sm font-bold text-foreground mb-3">Configurações Padrão</h4>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duração da consulta *</label>
            <select value={globalDuration} onChange={e => setGlobalDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {DURATIONS.map(d => <option key={d} value={d}>{d} minutos</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Intervalo entre consultas</label>
            <select value={globalInterval} onChange={e => setGlobalInterval(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {INTERVALS.map(d => <option key={d} value={d}>{d} minutos</option>)}
            </select>
          </div>
          <button onClick={applyToAll} className="rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">
            Aplicar a todos os dias ativos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        {/* Left: Day blocks */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground">Dias da Semana</h4>
          <div className="space-y-2">
            {days.map((day, idx) => (
              <DayScheduleBlock
                key={idx}
                day={day}
                dayName={DAY_NAMES[idx]}
                rooms={rooms}
                isSelected={selectedDay === idx}
                onSelect={() => setSelectedDay(idx)}
                onChange={(updates) => updateDay(idx, updates)}
              />
            ))}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="sticky top-4 h-fit">
          <ScheduleSlotPreview day={selectedDayConfig} dayName={DAY_NAMES[selectedDay]} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={() => onSave(days, globalDuration, globalInterval)}
          className="gradient-bg rounded-xl px-6 py-2.5 text-sm font-semibold text-white flex items-center gap-2 hover:opacity-90">
          <Save className="h-4 w-4" /> Salvar Agenda
        </button>
      </div>
    </div>
  )
}
