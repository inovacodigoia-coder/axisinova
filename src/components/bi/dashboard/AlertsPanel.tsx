import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { AlertData } from '@/types/bi.types'
import { AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react'

const ICONS = { critical: AlertTriangle, warning: AlertCircle, info: Info, success: CheckCircle }
const COLORS = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
}

interface AlertsPanelProps { alerts: AlertData[]; dark?: boolean }

export function AlertsPanel({ alerts, dark }: AlertsPanelProps) {
  const navigate = useNavigate()
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, success: 3 }
    return order[a.type] - order[b.type]
  })

  return (
    <div className={cn('rounded-xl border p-5', dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border')}>
      <h3 className={cn('text-sm font-semibold mb-4', dark ? 'text-white' : 'text-foreground')}>Alertas Estratégicos</h3>
      <div className="space-y-3">
        {sorted.map(alert => {
          const Icon = ICONS[alert.type]
          const c = COLORS[alert.type]
          return (
            <div key={alert.id} className={cn('rounded-lg border p-3', c.bg, c.border)}>
              <div className="flex gap-3">
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', c.icon)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', dark ? 'text-white' : 'text-foreground')}>{alert.title}</p>
                  <p className={cn('text-[11px] mt-0.5', dark ? 'text-white/60' : 'text-muted-foreground')}>{alert.description}</p>
                  {alert.action && alert.actionRoute && (
                    <button onClick={() => navigate(alert.actionRoute!)} className="mt-1.5 text-[11px] text-primary font-medium hover:underline">
                      → {alert.action}
                    </button>
                  )}
                </div>
                {alert.value && <span className={cn('text-xs font-bold shrink-0', c.icon)}>{alert.value}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
