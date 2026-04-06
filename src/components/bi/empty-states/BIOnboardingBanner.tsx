import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Progress } from '@/components/ui/progress'

interface BIOnboardingBannerProps {
  totalAppointments: number
  dark?: boolean
}

export function BIOnboardingBanner({ totalAppointments, dark }: BIOnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || totalAppointments >= 10) return null

  const pct = Math.round((totalAppointments / 10) * 100)

  return (
    <div className={cn(
      'rounded-xl border p-4 mb-6 flex items-center gap-4',
      dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border'
    )}>
      <span className="text-2xl">📊</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-foreground')}>
          Seus dados estão começando a aparecer!
        </p>
        <p className={cn('text-xs mt-0.5', dark ? 'text-white/50' : 'text-muted-foreground')}>
          Complete mais atendimentos para análises mais ricas. {totalAppointments} atendimentos realizados · Meta: 10 para análise completa
        </p>
        <Progress value={pct} className="mt-2 h-1.5" />
      </div>
      <button onClick={() => setDismissed(true)} className={cn('shrink-0 p-1 rounded', dark ? 'text-white/30 hover:text-white/60' : 'text-muted-foreground hover:text-foreground')}>
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
