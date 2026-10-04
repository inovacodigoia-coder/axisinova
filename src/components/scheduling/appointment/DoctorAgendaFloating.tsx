import { useRef, useState } from 'react'
import { X, GripHorizontal, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import type { Doctor } from '@/types/registers.types'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import { useAvailableSlots } from '@/hooks/useAvailableSlots'

const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const TYPE_LABEL: Record<string, string> = { consultation: 'Consulta', exam: 'Exame', procedure: 'Procedimento' }

interface Props {
  doctor: Doctor
  appointments: SchedulingAppointment[]
  initialDate?: string
  onClose: () => void
}

export function DoctorAgendaFloating({ doctor, appointments, initialDate, onClose }: Props) {
  const [pos, setPos] = useState({ x: Math.max(16, window.innerWidth - 1100), y: 80 })
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const [openDay, setOpenDay] = useState<number | null>(null)
  const [previewDate, setPreviewDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'))

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos({
      x: Math.min(Math.max(0, e.clientX - drag.current.dx), window.innerWidth - 120),
      y: Math.min(Math.max(0, e.clientY - drag.current.dy), window.innerHeight - 60),
    })
  }
  const onPointerUp = () => { drag.current = null }

  const cfg: any = doctor.scheduleConfig
  const workDays: any[] = cfg?.workDays || []
  const dayCfg = (d: number) => workDays.find(w => Number(w.day ?? w.dayOfWeek) === d && w.isActive !== false)

  const preview = useAvailableSlots(doctor, previewDate, appointments)
  const previewDow = new Date(previewDate + 'T12:00:00').getDay()

  return (
    <div className="fixed z-[70] w-[380px] max-h-[80vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl"
      style={{ left: pos.x, top: pos.y }} onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border cursor-move select-none touch-none rounded-t-xl bg-muted/50"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
        <CalendarDays className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Agenda — {doctor.fullName}</p>
          {cfg && <p className="text-[10px] text-muted-foreground">Duração {cfg.consultationDuration ?? '-'} min · intervalo {cfg.intervalBetween ?? 0} min</p>}
        </div>
        <button type="button" onPointerDown={e => e.stopPropagation()} onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar agenda">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="overflow-y-auto p-3 space-y-3">
        {!cfg || workDays.length === 0 ? (
          <p className="text-xs text-muted-foreground">Este médico ainda não tem agenda configurada.</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">Dias da semana</p>
            {DAYS.map((name, d) => {
              const w = dayCfg(d)
              const types: string[] = w ? (w.attendanceTypes?.length ? w.attendanceTypes : ['consultation']) : []
              return (
                <div key={d} className={`rounded-lg border px-2.5 py-1.5 ${w ? 'border-primary/30 bg-primary/5' : 'border-border opacity-60'}`}>
                  <button type="button" className="flex w-full items-center justify-between text-left" disabled={!w}
                    onClick={() => setOpenDay(openDay === d ? null : d)}>
                    <span className="text-xs font-medium text-foreground">{name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {w ? `${w.startTime} – ${w.endTime}` : 'Não atende'}
                      {w && (openDay === d ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                    </span>
                  </button>
                  {w && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {types.map(t => <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{TYPE_LABEL[t] || t}</span>)}
                    </div>
                  )}
                  {w && openDay === d && (
                    <div className="mt-1.5 text-[11px] text-muted-foreground space-y-0.5">
                      {w.lunchStart && w.lunchEnd && <p>Almoço: {w.lunchStart} – {w.lunchEnd}</p>}
                      <p>Duração: {w.slotDuration ?? cfg.consultationDuration} min · intervalo {w.intervalBetween ?? cfg.intervalBetween ?? 0} min</p>
                      {w.maxPatients ? <p>Máx. {w.maxPatients} pacientes/dia</p> : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="rounded-lg border border-border p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Preview de horários</p>
            <input type="date" value={previewDate} onChange={e => setPreviewDate(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs" />
          </div>
          <p className="text-[10px] text-muted-foreground">{DAYS[previewDow]}</p>
          {preview.error === 'not_working_day' && <p className="text-xs text-muted-foreground">Não atende neste dia.</p>}
          {preview.error === 'no_schedule' && <p className="text-xs text-muted-foreground">Sem agenda configurada.</p>}
          {!preview.error && preview.slots.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground">
                {preview.slots.filter(s => s.isAvailable).length} livres · {preview.slots.filter(s => !s.isAvailable).length} ocupados
              </p>
              <div className="grid grid-cols-4 gap-1">
                {preview.slots.map(s => (
                  <span key={s.time} title={s.isAvailable ? 'Disponível' : 'Ocupado'}
                    className={`rounded-md px-1 py-1 text-center text-[11px] font-medium ${s.isAvailable ? 'bg-success/10 text-success border border-success/30' : 'bg-destructive/10 text-destructive border border-destructive/30 line-through'}`}>
                    {s.time}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
