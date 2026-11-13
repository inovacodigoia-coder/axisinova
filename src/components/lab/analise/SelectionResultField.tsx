import { Check, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { selectedOptions, toggleOption } from '@/lib/parameterSelection'

/**
 * Campo de resultado do tipo Seleção na Digitação de Resultados.
 * - padrão: lista com uma opção;
 * - "Editar": o texto escolhido fica num campo que pode ser alterado;
 * - "Várias": marca mais de uma opção (separadas por vírgula).
 */
export function SelectionResultField({
  id,
  value,
  options,
  editable,
  multiple,
  disabled,
  onChange,
}: {
  id?: string
  value: string
  options: string[]
  editable?: boolean
  multiple?: boolean
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const base = cn(
    'h-10 text-sm font-bold bg-white border-slate-200 focus:border-primary',
    disabled && 'bg-slate-100 text-slate-500',
  )

  if (!editable && !multiple) {
    return (
      <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger id={id} className={base}>
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent className="z-[200] bg-white">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs font-semibold">{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const marcadas = selectedOptions(value, options)
  const escolher = (opt: string) => onChange(multiple ? toggleOption(value, opt, options) : opt)

  const lista = (
    <PopoverContent align="end" className="z-[200] w-64 p-1 bg-white">
      {multiple && (
        <p className="px-2 py-1 text-[9px] font-bold uppercase text-slate-400">Marque uma ou mais opções</p>
      )}
      <div className="max-h-64 overflow-y-auto">
        {options.map((opt) => {
          const on = marcadas.some((m) => m.toLowerCase() === opt.toLowerCase())
          return (
            <button
              key={opt}
              type="button"
              onClick={() => escolher(opt)}
              className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-semibold hover:bg-slate-100"
            >
              <span className={cn(
                'h-4 w-4 shrink-0 flex items-center justify-center border',
                multiple ? 'rounded-sm' : 'rounded-full',
                on ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-300',
              )}>
                {on && <Check className="h-3 w-3" />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
    </PopoverContent>
  )

  if (editable) {
    return (
      <div className="flex items-center gap-1">
        <Input
          id={id}
          className={cn(base, 'flex-1')}
          placeholder={multiple ? 'Escolha as opções ou digite' : 'Escolha a opção ou digite'}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              title="Escolher opção"
              aria-label="Escolher opção"
              className="h-10 w-9 shrink-0 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          {lista}
        </Popover>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(base, 'w-full flex items-center justify-between gap-2 rounded-md border px-3 text-left')}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground font-normal')}>
            {value || 'Selecione...'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      {lista}
    </Popover>
  )
}
