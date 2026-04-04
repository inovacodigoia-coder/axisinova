import { cn } from '@/lib/utils'
import type { PeriodPreset } from '@/types/bi.types'

interface PeriodSelectorProps {
  preset: PeriodPreset
  onChange: (p: PeriodPreset) => void
  dark?: boolean
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'last_7_days', label: '7 dias' },
  { value: 'last_30_days', label: '30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_3_months', label: '3 meses' },
  { value: 'this_year', label: 'Este ano' },
]

export function PeriodSelector({ preset, onChange, dark }: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {PRESETS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
            preset === p.value
              ? 'gradient-bg text-white shadow-md'
              : dark
                ? 'bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
