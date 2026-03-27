import { useNavigate } from 'react-router-dom'
import { icons } from 'lucide-react'
import type { FunctionItem } from '@/types/profile.types'
import { cn } from '@/lib/utils'

interface FunctionCardProps {
  item: FunctionItem
}

export function FunctionCard({ item }: FunctionCardProps) {
  const navigate = useNavigate()
  const IconComponent = (icons as any)[item.icon] || icons.CircleHelp

  return (
    <button
      onClick={() => navigate(item.route)}
      className={cn(
        'group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        'active:scale-[0.97]'
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] gradient-bg-subtle transition-transform duration-200 group-hover:scale-110">
        <IconComponent className="h-6 w-6 text-primary" />
      </div>
      <span className="text-[13px] font-semibold text-foreground text-center leading-tight">
        {item.label}
      </span>
    </button>
  )
}
