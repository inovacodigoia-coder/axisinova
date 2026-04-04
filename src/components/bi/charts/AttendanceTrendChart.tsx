import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import type { MonthlyData } from '@/types/bi.types'

interface AttendanceTrendChartProps { data: MonthlyData[]; dark?: boolean }

export function AttendanceTrendChart({ data, dark }: AttendanceTrendChartProps) {
  const avg = Math.round(data.reduce((s, d) => s + d.attendances, 0) / data.length)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={{ fill: dark ? 'rgba(255,255,255,0.4)' : '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: dark ? 'rgba(255,255,255,0.4)' : '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
        <ReferenceLine y={avg} stroke={CHART_COLORS.neutral} strokeDasharray="4 4" label={{ value: `Média: ${avg}`, fill: dark ? 'rgba(255,255,255,0.5)' : '#718096', fontSize: 10 }} />
        <Area type="monotone" dataKey="attendances" name="Atendimentos" stroke={CHART_COLORS.primary} fill="url(#attendGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
