import { cn } from '@/lib/utils'
import type { TicketCategory } from '@/types/reception.types'

const COLORS: Record<TicketCategory, string> = {
  SP: 'bg-purple-100 text-purple-700 border-purple-300',
  SN: 'bg-blue-100 text-blue-700 border-blue-300',
  EX: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  PR: 'bg-orange-100 text-orange-700 border-orange-300',
  RE: 'bg-gray-100 text-gray-600 border-gray-300',
}

interface TicketBadgeProps {
  category: TicketCategory
  number: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function TicketBadge({ category, number, size = 'md', className }: TicketBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1 font-bold',
    lg: 'text-lg px-3 py-1.5 font-bold',
    xl: 'text-4xl px-6 py-3 font-extrabold',
  }

  return (
    <span className={cn(
      'inline-flex items-center rounded-lg border font-mono tracking-wider',
      COLORS[category],
      sizeClasses[size],
      className
    )}>
      {number}
    </span>
  )
}
