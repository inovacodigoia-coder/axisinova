import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ReportFilters } from '@/components/bi/reports/ReportFilters'
import { ReportSummaryBar } from '@/components/bi/reports/ReportSummaryBar'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import { DoctorProductionChart } from '@/components/bi/charts/DoctorProductionChart'

export default function DoctorPerformancePage() {
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { doctorProduction } = useBIData(dateRange, {})
  const topProd = [...doctorProduction].sort((a, b) => b.totalAttendances - a.totalAttendances)[0]
  const topRev = [...doctorProduction].sort((a, b) => b.revenue - a.revenue)[0]
  const bestAbs = [...doctorProduction].sort((a, b) => a.absenteeRate - b.absenteeRate)[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Performance por Médico</h1>
          <p className="text-xs text-muted-foreground">Análise de produtividade e indicadores médicos</p>
        </div>
        <ExportMenu />
      </div>
      <ReportFilters preset={preset} onPresetChange={setPreset} />
      <ReportSummaryBar items={[
        { label: 'Médicos Ativos', value: String(doctorProduction.length) },
        { label: 'Mais Produtivo', value: topProd.doctorName },
        { label: 'Maior Receita', value: topRev.doctorName },
        { label: 'Menor Faltosos', value: `${bestAbs.doctorName} (${bestAbs.absenteeRate}%)` },
      ]} />
      <DoctorProductionChart data={doctorProduction} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctorProduction.map(doc => (
          <div key={doc.doctorId} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-white">
                {doc.doctorName.split(' ').slice(0, 2).map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{doc.doctorName}</p>
                <p className="text-xs text-muted-foreground">{doc.specialty}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Atend.', value: doc.totalAttendances },
                { label: 'Receita', value: `R$ ${(doc.revenue / 1000).toFixed(1)}k` },
                { label: 'Faltosos', value: `${doc.absenteeRate}%` },
                { label: 'Tempo', value: `${doc.avgAttendanceTime} min` },
                { label: 'Ticket', value: `R$ ${(doc.revenue / doc.totalAttendances).toFixed(0)}` },
                { label: 'Satisfação', value: doc.rating ? `${doc.rating}⭐` : '—' },
              ].map(m => (
                <div key={m.label} className="rounded-lg bg-muted p-2">
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-xs font-semibold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
