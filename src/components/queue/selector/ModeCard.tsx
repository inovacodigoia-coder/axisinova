import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ModeCardProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function ModeCard({ icon: Icon, label, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-10 cursor-pointer transition-all duration-200',
        'hover:border-secondary hover:shadow-lg hover:-translate-y-0.5'
      )}
    >
      <Icon className="h-12 w-12 text-foreground" />
      <span className="text-base font-bold text-foreground">{label}</span>
    </button>
  )
}
