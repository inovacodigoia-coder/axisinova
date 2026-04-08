interface DeviceSelectorProps {
  items: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  label: string
  disabled?: boolean
  placeholder?: string
}

export function DeviceSelector({ items, value, onChange, label, disabled, placeholder }: DeviceSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder || `Selecione ${label.toLowerCase()}`}</option>
        {items.map(i => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </select>
    </div>
  )
}
