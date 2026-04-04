import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface Props {
  time: string
  isEmpty: boolean
  onClickEmpty: () => void
  children?: React.ReactNode
}

export function AppointmentSlot({ time, isEmpty, onClickEmpty, children }: Props) {
  if (!isEmpty) return <div className="p-0.5">{children}</div>

  return (
    <button
      onClick={onClickEmpty}
      className="w-full h-full min-h-[48px] border border-dashed border-border/40 rounded-md flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group cursor-pointer hover:bg-primary/5"
    >
      <Plus className="h-3.5 w-3.5 text-primary/50 group-hover:text-primary transition-colors" />
    </button>
  )
}
