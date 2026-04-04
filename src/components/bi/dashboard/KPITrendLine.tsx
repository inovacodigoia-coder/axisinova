import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'

interface KPITrendLineProps {
  data: number[]
  positive?: boolean
}

export function KPITrendLine({ data, positive = true }: KPITrendLineProps) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? CHART_COLORS.success : CHART_COLORS.danger}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
