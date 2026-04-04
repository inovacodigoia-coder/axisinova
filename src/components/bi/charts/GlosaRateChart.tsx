import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import type { MonthlyData } from '@/types/bi.types'

interface GlosaRateChartProps { data: MonthlyData[]; dark?: boolean }

export function GlosaRateChart({ data, dark }: GlosaRateChartProps) {
  const chartData = data.map(d => ({
    month: d.month,
    rate: parseFloat(((d.glosa / d.revenue) * 100).toFixed(1)),
    meta: 5,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <XAxis dataKey="month" tick={{ fill: dark ? 'rgba(255,255,255,0.4)' : '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: dark ? 'rgba(255,255,255,0.4)' : '#718096', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} formatter={(v: number) => [`${v}%`]} />
        <ReferenceLine y={5} stroke={CHART_COLORS.neutral} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="rate" name="Taxa de Glosa" stroke={CHART_COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="meta" name="Meta" stroke={CHART_COLORS.neutral} strokeWidth={1} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
