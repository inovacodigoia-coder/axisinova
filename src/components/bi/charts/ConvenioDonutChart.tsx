import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import type { ConvenioData } from '@/types/bi.types'
import { cn } from '@/lib/utils'

interface ConvenioDonutChartProps { data: ConvenioData[]; dark?: boolean }

export function ConvenioDonutChart({ data, dark }: ConvenioDonutChartProps) {
  const total = data.reduce((s, d) => s + d.attendances, 0)

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="attendances" nameKey="convenioName" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS.series[i % CHART_COLORS.series.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className={cn('text-2xl font-bold -mt-32 mb-24', dark ? 'text-white' : 'text-foreground')}>{total}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
        {data.map((d, i) => (
          <div key={d.convenioId} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS.series[i % CHART_COLORS.series.length] }} />
            <span className={dark ? 'text-white/60' : 'text-muted-foreground'}>{d.convenioName}</span>
            <span className={cn('ml-auto font-semibold', dark ? 'text-white' : 'text-foreground')}>{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
