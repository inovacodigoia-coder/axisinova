import type { RestrictionAlert } from '@/types/schedule-config.types'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Props {
  alerts: RestrictionAlert[]
  onClose: () => void
  onContinue: () => void
}

export function RestrictionAlertSystem({ alerts, onClose, onContinue }: Props) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  if (alerts.length === 0) return null

  const hasBlocks = alerts.some(a => a.severity === 'block')
  const warningsNeedingConfirm = alerts.filter(a => a.severity === 'warning' && a.requiresConfirmation)
  const allWarningsConfirmed = warningsNeedingConfirm.every(a => confirmed.has(a.id))
  const canContinue = !hasBlocks && allWarningsConfirmed

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">⚠️ Verificação de restrições</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
        </div>
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {alerts.map(alert => (
            <div key={alert.id} className={cn(
              'rounded-xl border p-4 space-y-2',
              alert.severity === 'block' && 'border-destructive/30 bg-destructive/5',
              alert.severity === 'warning' && 'border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5',
              alert.severity === 'info' && 'border-primary/30 bg-primary/5',
            )}>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                  alert.severity === 'block' && 'bg-destructive/10 text-destructive',
                  alert.severity === 'warning' && 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
                  alert.severity === 'info' && 'bg-primary/10 text-primary',
                )}>
                  {alert.severity === 'block' ? '🔴 BLOQUEIO' : alert.severity === 'warning' ? '⚠️ ATENÇÃO' : 'ℹ️ INFO'}
                </span>
                <span className="text-sm font-semibold text-foreground">{alert.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">{alert.message}</p>
              {alert.details && alert.details.length > 0 && (
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  {alert.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
              {alert.requiresConfirmation && alert.confirmationLabel && (
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={confirmed.has(alert.id)}
                    onChange={e => {
                      const next = new Set(confirmed)
                      e.target.checked ? next.add(alert.id) : next.delete(alert.id)
                      setConfirmed(next)
                    }}
                    className="rounded border-input" />
                  <span className="text-xs font-medium text-foreground">{alert.confirmationLabel}</span>
                </label>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancelar e corrigir
          </button>
          <button onClick={onContinue} disabled={!canContinue}
            title={!canContinue ? 'Resolva os bloqueios para continuar' : undefined}
            className={cn('rounded-lg px-4 py-2 text-sm font-semibold text-white', canContinue ? 'gradient-bg hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Continuar com avisos
          </button>
        </div>
      </div>
    </div>
  )
}
