import { useNavigate } from 'react-router-dom'
import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { EmptyReportState } from '@/components/bi/empty-states/EmptyReportState'
import { cn } from '@/lib/utils'

export default function SchedulingReportPage() {
  const navigate = useNavigate()
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { monthlyData, heatmap, hasData, totalAppointments } = useBIData(dateRange, {})

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório de Agendamentos</h1>
            <p className="text-xs text-muted-foreground">Ocupação, faltosos e padrões de agendamento</p>
          </div>
          <ExportMenu />
        </div>
        <ReportFilters preset={preset} onPresetChange={setPreset} />
        <EmptyReportState
          hasFilters={false}
          reportName="agendamento"
          emptyMessage="Crie agendamentos para visualizar dados de ocupação e faltosos."
          actionLabel="Ir para Agendamento"
          onAction={() => navigate('/app/agendamento')}
        />
      </div>
    )
  }

  const totalAtt = monthlyData.reduce((s, m) => s + m.attendances, 0)
  const totalAbsent = monthlyData.reduce((s, m) => s + m.absentees, 0)

  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
  const hours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

  const getColor = (rate: number) => {
    if (rate < 5) return 'bg-emerald-100 text-emerald-800'
    if (rate < 10) return 'bg-amber-100 text-amber-800'
    if (rate < 15) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório de Agendamentos</h1>
          <p className="text-xs text-muted-foreground">Ocupação, faltosos e padrões de agendamento</p>
        </div>
        <ExportMenu />
      </div>
      <ReportFilters preset={preset} onPresetChange={setPreset} />
      <ReportSummaryBar items={[
        { label: 'Agendados', value: String(totalAtt) },
        { label: 'Realizados', value: String(totalAtt - totalAbsent) },
        { label: 'Faltosos', value: String(totalAbsent) },
        { label: 'Taxa Faltosos', value: totalAtt > 0 ? `${((totalAbsent / totalAtt) * 100).toFixed(1)}%` : '0%' },
        { label: 'Total no Período', value: String(totalAppointments) },
      ]} />

      {heatmap.length > 0 ? (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Heatmap de Faltosos (por dia e horário)</h3>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-left text-muted-foreground font-medium">Horário</th>
                  {days.map(d => <th key={d} className="py-2 px-3 text-center text-muted-foreground font-medium">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour => (
                  <tr key={hour}>
                    <td className="py-1.5 px-3 text-muted-foreground font-medium">{hour}</td>
                    {days.map(day => {
                      const cell = heatmap.find(c => c.day === day && c.hour === hour)
                      const rate = cell?.rate || 0
                      return (
                        <td key={day} className="py-1.5 px-3">
                          <div className={cn('rounded px-2 py-1 text-center font-semibold text-[11px]', getColor(rate))} title={`${day} ${hour}: ${rate}% faltosos`}>
                            {rate}%
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
            <span>Legenda:</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-100" /> {'<5%'}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-100" /> 5-10%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-orange-100" /> 10-15%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-100" /> {'>15%'}</span>
          </div>
        </div>
      ) : (
        <EmptyReportState
          hasFilters={false}
          reportName="heatmap"
          emptyMessage="Sem dados suficientes para gerar o heatmap de faltosos."
        />
      )}
    </div>
  )
}
