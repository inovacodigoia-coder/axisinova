import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { DayScheduleBlock } from './DayScheduleBlock'
import { ScheduleSlotPreview } from './ScheduleSlotPreview'
import type { DayScheduleConfig } from '@/types/schedule-config.types'
import type { Room } from '@/types/totem-tv.types'
import { Save, CalendarOff, X, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const DURATIONS = [15, 20, 30, 45, 60]
const INTERVALS = [0, 5, 10, 15]

interface Props {
  initialDays?: DayScheduleConfig[]
  defaultDuration?: number
  defaultInterval?: number
  rooms?: Room[]
  blockedDates?: string[]
  onSave: (days: DayScheduleConfig[], defaultDuration: number, defaultInterval: number) => void
  onBlockedDatesChange?: (dates: string[]) => void
  onChange?: (days: DayScheduleConfig[], defaultDuration: number, defaultInterval: number) => void
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

// Ensure we have all 7 days, filling missing ones with defaults
function ensureAllDays(initial: DayScheduleConfig[], duration: number, interval: number): DayScheduleConfig[] {
  const defaults = createDefaultDays(duration, interval)
  return defaults.map(def => {
    const existing = initial.find(d => d.dayOfWeek === def.dayOfWeek)
    return existing || { ...def, isActive: false }
  })
}

export function DoctorScheduleEditor({ initialDays, defaultDuration = 30, defaultInterval = 10, rooms = [], blockedDates = [], onSave, onBlockedDatesChange, onChange }: Props) {
  const [globalDuration, setGlobalDuration] = useState(defaultDuration)
  const [globalInterval, setGlobalInterval] = useState(defaultInterval)
  const [days, setDays] = useState<DayScheduleConfig[]>(() =>
    initialDays && initialDays.length > 0
      ? ensureAllDays(initialDays, defaultDuration, defaultInterval)
      : createDefaultDays(defaultDuration, defaultInterval)
  )
  const [selectedDay, setSelectedDay] = useState(1)
  const [newBlockedDate, setNewBlockedDate] = useState('')
  const [showBlockedDates, setShowBlockedDates] = useState(blockedDates.length > 0)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => { onChangeRef.current?.(days, globalDuration, globalInterval) }, [days, globalDuration, globalInterval])

  const updateDay = useCallback((dayOfWeek: number, updates: Partial<DayScheduleConfig>) => {
    setDays(prev => prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d))
  }, [])

  const applyToAll = () => {
    setDays(prev => prev.map(d => d.isActive ? { ...d, slotDuration: globalDuration, intervalBetween: globalInterval } : d))
  }

  const addBlockedDate = () => {
    if (!newBlockedDate) return
    if (blockedDates.includes(newBlockedDate)) return
    onBlockedDatesChange?.([...blockedDates, newBlockedDate].sort())
    setNewBlockedDate('')
  }

  const removeBlockedDate = (date: string) => {
    onBlockedDatesChange?.(blockedDates.filter(d => d !== date))
  }

  const selectedDayConfig = days[selectedDay]
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {/* Global defaults */}
      <div className="rounded-xl border border-border p-4 bg-muted/30">
        <h4 className="text-sm font-bold text-foreground mb-3">Configurações Padrão</h4>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duração da consulta * (min)</label>
            <div className="relative mt-1">
              <input type="number" min={1} max={120} value={globalDuration}
                onChange={e => { const v = Number(e.target.value); if (v > 0) setGlobalDuration(v) }}
                list="duration-presets"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <datalist id="duration-presets">
                {DURATIONS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Intervalo entre consultas (min)</label>
            <div className="relative mt-1">
              <input type="number" min={0} max={60} value={globalInterval}
                onChange={e => { const v = Number(e.target.value); if (v >= 0) setGlobalInterval(v) }}
                list="interval-presets"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <datalist id="interval-presets">
                {INTERVALS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
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

          {/* Blocked Dates Section */}
          <div className="mt-4">
            <button
              onClick={() => setShowBlockedDates(!showBlockedDates)}
              className="flex items-center gap-2 text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              <CalendarOff className="h-4 w-4" />
              Datas Bloqueadas (Feriados / Folgas)
              {blockedDates.length > 0 && (
                <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-semibold">
                  {blockedDates.length}
                </span>
              )}
            </button>

            {showBlockedDates && (
              <div className="mt-2 rounded-xl border border-border p-4 bg-muted/30 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Marque datas em que o médico não atenderá (feriados, folgas, eventos, etc.). O agendamento será bloqueado nessas datas.
                </p>

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium text-muted-foreground">Adicionar data</label>
                    <input
                      type="date"
                      value={newBlockedDate}
                      min={today}
                      onChange={e => setNewBlockedDate(e.target.value)}
                      className="mt-0.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={addBlockedDate}
                    disabled={!newBlockedDate}
                    className="rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm font-medium hover:bg-destructive/20 disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Bloquear
                  </button>
                </div>

                {blockedDates.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {blockedDates.map(date => {
                      const d = parseISO(date)
                      const dayName = format(d, 'EEEE', { locale: ptBR })
                      return (
                        <div key={date} className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {format(d, 'dd/MM/yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">({dayName})</span>
                          </div>
                          <button
                            onClick={() => removeBlockedDate(date)}
                            className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {blockedDates.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Nenhuma data bloqueada</p>
                )}
              </div>
            )}
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
