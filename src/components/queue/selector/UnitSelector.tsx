import type { Unit } from '@/types/queue-system.types'

interface UnitSelectorProps {
  units: Unit[]
  value: string
  onChange: (id: string) => void
  label?: string
}

export function UnitSelector({ units, value, onChange, label = 'Unidade' }: UnitSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Selecione uma unidade</option>
        {units.map(u => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
    </div>
  )
}
