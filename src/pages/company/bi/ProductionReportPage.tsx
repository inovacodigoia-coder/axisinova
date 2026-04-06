import { useNavigate } from 'react-router-dom'
import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { AttendanceTrendChart } from '@/components/bi/charts/AttendanceTrendChart'
import { EmptyReportState } from '@/components/bi/empty-states/EmptyReportState'
import { usePaginatedList } from '@/hooks/usePaginatedList'

export default function ProductionReportPage() {
  const navigate = useNavigate()
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { monthlyData, doctorProduction, hasData } = useBIData(dateRange, {})

  const { visibleItems, hasMore, showMore, showAll, totalItems, remainingCount } = usePaginatedList(doctorProduction, 10)

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório de Produção</h1>
            <p className="text-xs text-muted-foreground">Produção médica detalhada por período</p>
          </div>
          <ExportMenu />
        </div>
        <ReportFilters preset={preset} onPresetChange={setPreset} />
        <EmptyReportState
          hasFilters={false}
          reportName="dado de produção"
          emptyMessage="Realize atendimentos para gerar dados de produção médica."
          actionLabel="Ir para Agendamento"
          onAction={() => navigate('/app/agendamento')}
        />
      </div>
    )
  }

  const totalAtt = doctorProduction.reduce((s, d) => s + d.totalAttendances, 0)
  const totalRev = doctorProduction.reduce((s, d) => s + d.revenue, 0)
  const totalCons = doctorProduction.reduce((s, d) => s + d.consultations, 0)
  const totalExams = doctorProduction.reduce((s, d) => s + d.exams, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório de Produção</h1>
          <p className="text-xs text-muted-foreground">Produção médica detalhada por período</p>
        </div>
        <ExportMenu />
      </div>
      <ReportFilters preset={preset} onPresetChange={setPreset} />
      <ReportSummaryBar items={[
        { label: 'Total Atendimentos', value: String(totalAtt) },
        { label: 'Consultas', value: String(totalCons) },
        { label: 'Exames', value: String(totalExams) },
        { label: 'Receita Gerada', value: `R$ ${(totalRev / 1000).toFixed(1)}k` },
        { label: 'Ticket Médio', value: totalAtt > 0 ? `R$ ${(totalRev / totalAtt).toFixed(0)}` : 'R$ 0' },
      ]} />
      {monthlyData.some(m => m.attendances > 0) && (
        <ChartCard title="Tendência de Atendimentos">
          <AttendanceTrendChart data={monthlyData} />
        </ChartCard>
      )}
      <div className="rounded-xl border bg-card p-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-2 font-medium">Médico</th>
              <th className="text-left py-2 font-medium">Especialidade</th>
              <th className="text-right py-2 font-medium">Consultas</th>
              <th className="text-right py-2 font-medium">Exames</th>
              <th className="text-right py-2 font-medium">Proced.</th>
              <th className="text-right py-2 font-medium">Total</th>
              <th className="text-right py-2 font-medium">Receita</th>
              <th className="text-right py-2 font-medium">Tempo Médio</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(doc => (
              <tr key={doc.doctorId} className="border-b border-border hover:bg-muted/50">
                <td className="py-2.5 font-medium text-foreground">{doc.doctorName}</td>
                <td className="py-2.5 text-muted-foreground">{doc.specialty}</td>
                <td className="py-2.5 text-right">{doc.consultations}</td>
                <td className="py-2.5 text-right">{doc.exams}</td>
                <td className="py-2.5 text-right">{doc.procedures}</td>
                <td className="py-2.5 text-right font-bold">{doc.totalAttendances}</td>
                <td className="py-2.5 text-right font-semibold">R$ {(doc.revenue / 1000).toFixed(1)}k</td>
                <td className="py-2.5 text-right">{doc.avgAttendanceTime} min</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalItems > 0 && (
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Exibindo {visibleItems.length} de {totalItems}</span>
            {hasMore && (
              <div className="flex gap-2">
                <button onClick={showMore} className="text-primary hover:underline">Mostrar mais {Math.min(10, remainingCount)}</button>
                <button onClick={showAll} className="text-primary hover:underline">Ver todos ({totalItems})</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
