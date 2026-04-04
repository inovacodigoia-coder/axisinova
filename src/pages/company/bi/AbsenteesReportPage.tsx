import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import { cn } from '@/lib/utils'

export default function AbsenteesReportPage() {
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { monthlyData, doctorProduction } = useBIData(dateRange, {})
  const current = monthlyData[monthlyData.length - 1]
  const estimatedLoss = current.absentees * 141

  const chartData = monthlyData.slice(-6).map(m => ({
    month: m.month,
    rate: parseFloat(((m.absentees / m.attendances) * 100).toFixed(1)),
    meta: 8,
  }))

  const topAbsentees = [...doctorProduction].sort((a, b) => b.absenteeRate - a.absenteeRate).slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório de Faltosos</h1>
          <p className="text-xs text-muted-foreground">Análise de ausências e receita perdida</p>
        </div>
        <ExportMenu />
      </div>
      <ReportFilters preset={preset} onPresetChange={setPreset} />
      <ReportSummaryBar items={[
        { label: 'Total Faltosos', value: String(current.absentees) },
        { label: '% sobre Agendados', value: `${((current.absentees / current.attendances) * 100).toFixed(1)}%` },
        { label: 'Receita Perdida (est.)', value: `R$ ${(estimatedLoss / 1000).toFixed(1)}k` },
      ]} />
      <ChartCard title="Evolução da Taxa de Faltosos" subtitle="Últimos 6 meses vs Meta (8%)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" tick={{ fill: '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#718096', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} formatter={(v: number) => [`${v}%`]} />
            <ReferenceLine y={8} stroke={CHART_COLORS.neutral} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="rate" name="Taxa" stroke={CHART_COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="meta" name="Meta" stroke={CHART_COLORS.neutral} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Faltosos por Médico</h3>
        <div className="space-y-2">
          {topAbsentees.map((doc, i) => (
            <div key={doc.doctorId} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{doc.doctorName}</p>
                <p className="text-xs text-muted-foreground">{doc.specialty}</p>
              </div>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold',
                doc.absenteeRate > 15 ? 'bg-red-500/15 text-red-600' :
                doc.absenteeRate > 10 ? 'bg-amber-500/15 text-amber-600' :
                'bg-emerald-500/15 text-emerald-600'
              )}>
                {doc.absenteeRate}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
