import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface QuickInsightsProps { insights: string[]; dark?: boolean }

export function QuickInsights({ insights, dark }: QuickInsightsProps) {
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
