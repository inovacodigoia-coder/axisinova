import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import type { MonthlyData } from '@/types/bi.types'

interface RevenueBarChartProps { data: MonthlyData[]; dark?: boolean }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg bg-white p-3 shadow-lg border text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: R$ {(p.value / 1000).toFixed(1)}k
        </p>
      ))}
    </div>
  )
}

export function RevenueBarChart({ data, dark }: RevenueBarChartProps) {
  const last6 = data.slice(-6)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={last6}>
        <XAxis dataKey="month" tick={{ fill: dark ? 'rgba(255,255,255,0.5)' : '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: dark ? 'rgba(255,255,255,0.4)' : '#718096', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="revenue" name="Faturado" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="received" name="Recebido" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="glosa" name="Glosado" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} barSize={20} />
        <Line type="monotone" dataKey="received" name="Tendência" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={false} strokeDasharray="4 4" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
