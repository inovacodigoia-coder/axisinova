import { useNavigate } from 'react-router-dom'
import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHART_COLORS } from '@/hooks/useChartColors'
import { EmptyReportState } from '@/components/bi/empty-states/EmptyReportState'
import { EmptyChartState } from '@/components/bi/shared/EmptyChartState'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { cn } from '@/lib/utils'

export default function AbsenteesReportPage() {
  const navigate = useNavigate()
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { monthlyData, doctorProduction, hasData } = useBIData(dateRange, {})

  const topAbsentees = [...doctorProduction].sort((a, b) => b.absenteeRate - a.absenteeRate)
  const { visibleItems, hasMore, showMore, showAll, totalItems, remainingCount } = usePaginatedList(topAbsentees, 10)

  if (!hasData) {
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
        <EmptyReportState
          hasFilters={false}
          reportName="dado de faltosos"
          emptyMessage="Realize agendamentos para acompanhar a taxa de faltosos."
          actionLabel="Ir para Agendamento"
          onAction={() => navigate('/app/agendamento')}
        />
      </div>
    )
  }

  const totalAbsent = monthlyData.reduce((s, m) => s + m.absentees, 0)
  const totalAtt = monthlyData.reduce((s, m) => s + m.attendances, 0)
  const avgTicket = totalAtt > 0 ? monthlyData.reduce((s, m) => s + m.revenue, 0) / totalAtt : 0
  const estimatedLoss = totalAbsent * Math.round(avgTicket)

  const chartData = monthlyData.map(m => ({
    month: m.month,
    rate: m.attendances > 0 ? parseFloat(((m.absentees / m.attendances) * 100).toFixed(1)) : 0,
    meta: 8,
  }))

  const hasChartData = chartData.some(c => c.rate > 0)

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
        { label: 'Total Faltosos', value: String(totalAbsent) },
        { label: '% sobre Agendados', value: totalAtt > 0 ? `${((totalAbsent / totalAtt) * 100).toFixed(1)}%` : '0%' },
        { label: 'Receita Perdida (est.)', value: `R$ ${(estimatedLoss / 1000).toFixed(1)}k` },
      ]} />
      <ChartCard title="Evolução da Taxa de Faltosos" subtitle="vs Meta (8%)">
        {hasChartData ? (
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
        ) : (
          <EmptyChartState />
        )}
      </ChartCard>
      {doctorProduction.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Faltosos por Médico</h3>
          <div className="space-y-2">
            {visibleItems.map((doc, i) => (
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
                  {doc.absenteeRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          {totalItems > 0 && (
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>Exibindo {visibleItems.length} de {totalItems}</span>
              {hasMore && (
                <div className="flex gap-2">
                  <button onClick={showMore} className="text-primary hover:underline">Mostrar mais</button>
                  <button onClick={showAll} className="text-primary hover:underline">Ver todos ({totalItems})</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
