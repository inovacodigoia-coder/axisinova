import { useEffect, useState } from 'react'

interface Props {
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  id?: string
}

const format = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Currency input with BRL mask. Stores value as number (reais).
 * Internally tracks cents while typing for predictable mask behavior.
 */
export function CurrencyInput({ value, onChange, placeholder, className, id }: Props) {
  const initialCents = Math.round((Number(value) || 0) * 100)
  const [display, setDisplay] = useState<string>(format(initialCents))

  useEffect(() => {
    const cents = Math.round((Number(value) || 0) * 100)
    setDisplay(format(cents))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const cents = digits === '' ? 0 : parseInt(digits, 10)
    setDisplay(format(cents))
    onChange(cents / 100)
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
      <input
        id={id}
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={
          className ??
          'w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
        }
      />
    </div>
  )
}
