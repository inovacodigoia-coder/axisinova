import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { ConvenioDonutChart } from '@/components/bi/charts/ConvenioDonutChart'
import { cn } from '@/lib/utils'

export default function ConvenioReportPage() {
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { convenioData } = useBIData(dateRange, {})
  const totalAtt = convenioData.reduce((s, d) => s + d.attendances, 0)
  const totalRev = convenioData.reduce((s, d) => s + d.revenue, 0)
  const maxGlosa = convenioData.reduce((max, d) => d.glosaRate > max.glosaRate ? d : max, convenioData[0])
  const maxRev = convenioData.reduce((max, d) => d.revenue > max.revenue ? d : max, convenioData[0])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório por Convênio</h1>
          <p className="text-xs text-muted-foreground">Análise comparativa entre convênios</p>
        </div>
        <ExportMenu />
      </div>
      <ReportFilters preset={preset} onPresetChange={setPreset} />
      <ReportSummaryBar items={[
        { label: 'Convênios Ativos', value: String(convenioData.length) },
        { label: 'Total Atendimentos', value: String(totalAtt) },
        { label: 'Faturado', value: `R$ ${(totalRev / 1000).toFixed(1)}k` },
        { label: 'Maior Receita', value: maxRev.convenioName },
        { label: 'Pior Glosa', value: `${maxGlosa.convenioName} (${maxGlosa.glosaRate}%)` },
      ]} />
      <ChartCard title="Distribuição por Convênio" className="max-w-md mx-auto">
        <ConvenioDonutChart data={convenioData} />
      </ChartCard>
      <div className="rounded-xl border bg-card p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-2 font-medium">Convênio</th>
              <th className="text-right py-2 font-medium">Atend.</th>
              <th className="text-right py-2 font-medium">%</th>
              <th className="text-right py-2 font-medium">Faturado</th>
              <th className="text-right py-2 font-medium">Ticket Médio</th>
              <th className="text-right py-2 font-medium">Glosa</th>
            </tr>
          </thead>
          <tbody>
            {convenioData.map(c => (
              <tr key={c.convenioId} className="border-b border-border hover:bg-muted/50">
                <td className="py-2.5 font-medium text-foreground">{c.convenioName}</td>
                <td className="py-2.5 text-right">{c.attendances}</td>
                <td className="py-2.5 text-right">{c.percentage}%</td>
                <td className="py-2.5 text-right font-semibold">R$ {(c.revenue / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right">R$ {c.avgTicket}</td>
                <td className="py-2.5 text-right">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    c.glosaRate > 8 ? 'bg-red-500/15 text-red-600' :
                    c.glosaRate > 3 ? 'bg-amber-500/15 text-amber-600' :
                    'bg-emerald-500/15 text-emerald-600'
                  )}>{c.glosaRate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
