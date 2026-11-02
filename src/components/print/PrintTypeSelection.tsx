import { Button } from '@/components/ui/button'
import { CheckCircle2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PrintTypeSelection({ options, selected, onSelect, disabled = false }: { options: { id: string; label: string; description?: string; icon?: LucideIcon }[]; selected: string | null; onSelect: (id: string) => void; disabled?: boolean }) {
  return <div role="radiogroup" aria-label="Tipo de impressão" className="grid gap-2">{options.map(option => { const Icon = option.icon; return <Button key={option.id} role="radio" aria-checked={selected === option.id} variant="outline" disabled={disabled} onClick={() => onSelect(option.id)} className={cn('h-auto min-h-16 justify-start whitespace-normal text-left p-3 gap-3', selected === option.id && 'border-primary bg-primary/10')}>
    {Icon && <Icon className="h-5 w-5 shrink-0" />}<span className="flex-1 min-w-0"><span className="block font-semibold">{option.label}</span>{option.description && <span className="block text-xs text-muted-foreground font-normal">{option.description}</span>}</span>{selected === option.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
  </Button> })}</div>
}