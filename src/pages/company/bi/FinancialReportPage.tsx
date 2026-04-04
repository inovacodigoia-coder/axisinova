import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { RevenueBarChart } from '@/components/bi/charts/RevenueBarChart'
import { GlosaRateChart } from '@/components/bi/charts/GlosaRateChart'

export default function FinancialReportPage() {
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { monthlyData } = useBIData(dateRange, {})
  const current = monthlyData[monthlyData.length - 1]
  const glosaRate = ((current.glosa / current.revenue) * 100).toFixed(1)

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
        { label: 'Faturado', value: `R$ ${(current.revenue / 1000).toFixed(1)}k` },
        { label: 'Recebido', value: `R$ ${(current.received / 1000).toFixed(1)}k` },
        { label: 'Glosado', value: `R$ ${(current.glosa / 1000).toFixed(1)}k` },
        { label: 'Taxa de Glosa', value: `${glosaRate}%` },
        { label: 'Resultado Líquido', value: `R$ ${(current.received / 1000).toFixed(1)}k` },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Faturado vs Recebido" subtitle="Últimos 6 meses">
          <RevenueBarChart data={monthlyData} />
        </ChartCard>
        <ChartCard title="Taxa de Glosa" subtitle="Evolução mensal">
          <GlosaRateChart data={monthlyData} />
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
            {monthlyData.slice(-6).reverse().map(m => (
              <tr key={m.month} className="border-b border-border hover:bg-muted/50">
                <td className="py-2.5 font-medium">{m.month}</td>
                <td className="py-2.5 text-right">R$ {(m.revenue / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right text-emerald-600">R$ {(m.received / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right text-red-500">R$ {(m.glosa / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right">{((m.glosa / m.revenue) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
