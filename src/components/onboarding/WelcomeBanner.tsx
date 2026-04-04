import { useState } from 'react'
import { X, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WelcomeBannerProps {
  userName: string
  completionPercent: number
  onClose: () => void
  onViewDetails?: () => void
}

const CHECKLIST = [
  { label: 'Empresa cadastrada', done: true },
  { label: 'Primeiro médico adicionado', done: true },
  { label: 'Convênios configurados', done: false },
  { label: 'Regras de documentos por convênio', done: false },
  { label: 'Primeiro agendamento realizado', done: false },
]

export function WelcomeBanner({ userName, completionPercent, onClose, onViewDetails }: WelcomeBannerProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-6 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg-subtle opacity-50" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👋</span>
            <div>
              <h3 className="text-lg font-bold text-foreground">Bem-vindo ao Axis Inova, {userName}!</h3>
              <p className="text-sm text-muted-foreground">Sua clínica está a {completionPercent}% configurada.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full gradient-bg transition-all duration-500" style={{ width: `${completionPercent}%` }} />
        </div>

        {/* Checklist toggle */}
        <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs text-primary font-medium hover:underline">
          {expanded ? '▲ Ocultar detalhes' : '▼ Ver o que falta'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {CHECKLIST.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <span className={cn('h-4 w-4 rounded-full flex items-center justify-center text-[10px]', item.done ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground')}>
                  {item.done ? '✓' : '○'}
                </span>
                <span className={cn(item.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
