import type { AttendanceTypeDay } from '@/types/schedule-config.types'
import { cn } from '@/lib/utils'

interface Props {
  selected: AttendanceTypeDay[]
  onChange: (types: AttendanceTypeDay[]) => void
}

const TYPES: { value: AttendanceTypeDay; label: string; icon: string }[] = [
  { value: 'consultation', label: 'Consulta', icon: '📋' },
  { value: 'exam', label: 'Exame', icon: '🔬' },
  { value: 'procedure', label: 'Procedimento', icon: '⚕️' },
]

export function AttendanceTypeSelector({ selected, onChange }: Props) {
  const toggle = (type: AttendanceTypeDay) => {
    if (selected.includes(type)) {
      if (selected.length === 1) return // keep at least one
      onChange(selected.filter(t => t !== type))
    } else {
      onChange([...selected, type])
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-muted-foreground">Tipo de atendimento neste dia</label>
      <div className="flex gap-2">
        {TYPES.map(t => (
          <button key={t.value} type="button" onClick={() => toggle(t.value)}
            className={cn(
              'flex-1 rounded-lg border-2 px-2 py-2 text-center transition-all text-[10px] font-medium',
              selected.includes(t.value)
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-input text-muted-foreground hover:border-primary/30'
            )}>
            <span className="text-sm">{t.icon}</span>
            <span className="block mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>
      {selected.length > 1 && (
        <p className="text-[9px] text-[hsl(var(--warning))]">⚠️ Agenda mista — pacientes podem ser agendados para qualquer tipo selecionado neste dia.</p>
      )}
    </div>
  )
}
