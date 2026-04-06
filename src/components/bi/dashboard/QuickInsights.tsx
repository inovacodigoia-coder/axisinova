import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface QuickInsightsProps { insights: string[]; dark?: boolean }

export function QuickInsights({ insights, dark }: QuickInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className={cn('rounded-xl border p-5', dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border')}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-foreground')}>Insights do Período</h3>
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-2xl mb-2">🤖</span>
          <p className={cn('text-xs', dark ? 'text-white/50' : 'text-muted-foreground')}>
            Os insights aparecerão aqui conforme você usar o sistema.
          </p>
          <p className={cn('text-[10px] mt-1', dark ? 'text-white/30' : 'text-muted-foreground')}>
            Realize pelo menos 5 atendimentos para ver análises automáticas.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border p-5', dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border')}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-foreground')}>Insights do Período</h3>
      </div>
      <ul className="space-y-3">
        {insights.map((insight, i) => (
          <li key={i} className={cn('text-xs leading-relaxed', dark ? 'text-white/70' : 'text-muted-foreground')}>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  )
}
