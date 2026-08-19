import type { CompanyStatus } from '@/types/company.types'
import { StatusBadge } from '@/components/ui/StatusBadge'

const STATUS_CONFIG: Record<CompanyStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'error' | 'neutral'; icon: string }> = {
  active: { label: 'Ativa', variant: 'success', icon: '●' },
  trial: { label: 'Trial', variant: 'info', icon: '◌' },
  overdue: { label: 'Inadimplente', variant: 'warning', icon: '⚠' },
  suspended: { label: 'Suspensa', variant: 'error', icon: '⏸' },
  cancelled: { label: 'Cancelada', variant: 'neutral', icon: '✕' },
  deleted: { label: 'Excluída', variant: 'neutral', icon: '🗑' },
}

interface CompanyStatusBadgeProps {
  status: CompanyStatus
  trialDaysLeft?: number
}

export function CompanyStatusBadge({ status, trialDaysLeft }: CompanyStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge variant={config.variant}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {status === 'trial' && trialDaysLeft !== undefined && <span className="ml-0.5">({trialDaysLeft}d)</span>}
    </StatusBadge>
  )
}
