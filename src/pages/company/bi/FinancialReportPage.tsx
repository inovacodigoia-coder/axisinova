import { useNavigate } from 'react-router-dom'
import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { RevenueBarChart } from '@/components/bi/charts/RevenueBarChart'
import { GlosaRateChart } from '@/components/bi/charts/GlosaRateChart'
import { EmptyReportState } from '@/components/bi/empty-states/EmptyReportState'
import { EmptyChartState } from '@/components/bi/shared/EmptyChartState'
import { usePaginatedList } from '@/hooks/usePaginatedList'

export default function FinancialReportPage() {
  const navigate = useNavigate()
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { monthlyData, hasData } = useBIData(dateRange, {})

  const { visibleItems, hasMore, showMore, showAll, totalItems, remainingCount } = usePaginatedList(monthlyData, 10)

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório Financeiro</h1>
            <p className="text-xs text-muted-foreground">Faturamento, recebimento e glosas por período</p>
          </div>
          <ExportMenu />
        </div>
        <ReportFilters preset={preset} onPresetChange={setPreset} />
        <EmptyReportState
          hasFilters={false}
          reportName="dado financeiro"
          emptyMessage="As guias serão criadas automaticamente após os atendimentos serem finalizados."
          actionLabel="Ir para Agendamento"
          onAction={() => navigate('/app/agendamento')}
        />
      </div>
    )
  }

  const totalFaturado = monthlyData.reduce((s, m) => s + m.revenue, 0)
  const totalRecebido = monthlyData.reduce((s, m) => s + m.received, 0)
  const totalGlosa = monthlyData.reduce((s, m) => s + m.glosa, 0)
  const taxaGlosa = totalFaturado > 0 ? ((totalGlosa / totalFaturado) * 100).toFixed(1) : '0'

  const hasRevenueData = monthlyData.some(m => m.revenue > 0)
  const hasGlosaData = monthlyData.some(m => m.glosa > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório Financeiro</h1>
          <p className="text-xs text-muted-foreground">Faturamento, recebimento e glosas por período</p>
        </div>
        <ExportMenu />
      </div>
      <ReportFilters preset={preset} onPresetChange={setPreset} />
      <ReportSummaryBar items={[
        { label: 'Faturado', value: `R$ ${(totalFaturado / 1000).toFixed(1)}k` },
        { label: 'Recebido', value: `R$ ${(totalRecebido / 1000).toFixed(1)}k` },
        { label: 'Glosado', value: `R$ ${(totalGlosa / 1000).toFixed(1)}k` },
        { label: 'Taxa de Glosa', value: `${taxaGlosa}%` },
        { label: 'Resultado Líquido', value: `R$ ${((totalRecebido) / 1000).toFixed(1)}k` },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Faturado vs Recebido" subtitle="No período">
          {hasRevenueData ? <RevenueBarChart data={monthlyData} /> : <EmptyChartState />}
        </ChartCard>
        <ChartCard title="Taxa de Glosa" subtitle="Evolução mensal">
          {hasGlosaData ? <GlosaRateChart data={monthlyData} /> : <EmptyChartState />}
        </ChartCard>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Detalhamento Mensal</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-2 font-medium">Competência</th>
              <th className="text-right py-2 font-medium">Faturado</th>
              <th className="text-right py-2 font-medium">Recebido</th>
              <th className="text-right py-2 font-medium">Glosado</th>
              <th className="text-right py-2 font-medium">Taxa Glosa</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(m => (
              <tr key={m.month} className="border-b border-border hover:bg-muted/50">
                <td className="py-2.5 font-medium">{m.month}</td>
                <td className="py-2.5 text-right">R$ {(m.revenue / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right text-emerald-600">R$ {(m.received / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right text-red-500">R$ {(m.glosa / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right">{m.revenue > 0 ? ((m.glosa / m.revenue) * 100).toFixed(1) : '0'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  )
}
