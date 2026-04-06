import { useState } from 'react'
import { cn } from '@/lib/utils'
import { usePeriodFilter } from '@/hooks/usePeriodFilter'
import { useBIData } from '@/hooks/useBIData'
import { ExecutiveHeader } from '@/components/bi/dashboard/ExecutiveHeader'
import { KPICard } from '@/components/bi/dashboard/KPICard'
import { AlertsPanel } from '@/components/bi/dashboard/AlertsPanel'
import { QuickInsights } from '@/components/bi/dashboard/QuickInsights'
import { ChartCard } from '@/components/bi/shared/ChartCard'
import { RevenueBarChart } from '@/components/bi/charts/RevenueBarChart'
import { ConvenioDonutChart } from '@/components/bi/charts/ConvenioDonutChart'
import { AttendanceTrendChart } from '@/components/bi/charts/AttendanceTrendChart'
import { GlosaRateChart } from '@/components/bi/charts/GlosaRateChart'
import { OccupancyGauge } from '@/components/bi/charts/OccupancyGauge'
import { DoctorProductionChart } from '@/components/bi/charts/DoctorProductionChart'
import { NoBIDataState } from '@/components/bi/empty-states/NoBIDataState'
import { BIOnboardingBanner } from '@/components/bi/empty-states/BIOnboardingBanner'
import { EmptyChartState } from '@/components/bi/shared/EmptyChartState'

export default function BIDashboardPage() {
  const [dark, setDark] = useState(true)
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const biData = useBIData(dateRange, {})
  const { kpis, monthlyData, convenioData, doctorProduction, alerts, insights, hasData, totalAppointments } = biData

  if (!hasData) {
    return (
      <div className={cn('min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 transition-colors', dark ? 'bg-[#0F1117]' : 'bg-muted')}>
        <ExecutiveHeader dark={dark} onToggleDark={() => setDark(!dark)} preset={preset} onPresetChange={setPreset} />
        <NoBIDataState dark={dark} />
      </div>
    )
  }

  const hasMonthlyData = monthlyData.some(m => m.revenue > 0 || m.received > 0)
  const hasConvenioData = convenioData.length > 0
  const hasAttendanceData = monthlyData.some(m => m.attendances > 0)
  const hasGlosaData = monthlyData.some(m => m.glosa > 0)
  const hasDoctorData = doctorProduction.length > 0

  return (
    <div className={cn('min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 transition-colors', dark ? 'bg-[#0F1117]' : 'bg-muted')}>
      <ExecutiveHeader dark={dark} onToggleDark={() => setDark(!dark)} preset={preset} onPresetChange={setPreset} />

      <BIOnboardingBanner totalAppointments={totalAppointments} dark={dark} />

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(kpi => <KPICard key={kpi.label} data={kpi} dark={dark} />)}
        </div>
      )}

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <ChartCard title="Faturamento vs Recebimento" subtitle="Últimos 6 meses" dark={dark} className="lg:col-span-3">
          {hasMonthlyData ? (
            <RevenueBarChart data={monthlyData} dark={dark} />
          ) : (
            <EmptyChartState onReset={() => setPreset('last_6_months')} dark={dark} />
          )}
        </ChartCard>
        <ChartCard title="Distribuição por Convênio" subtitle="Atendimentos no período" dark={dark} className="lg:col-span-2">
          {hasConvenioData ? (
            <ConvenioDonutChart data={convenioData} dark={dark} />
          ) : (
            <EmptyChartState dark={dark} />
          )}
        </ChartCard>
      </div>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Tendência de Atendimentos" subtitle="No período" dark={dark}>
          {hasAttendanceData ? (
            <AttendanceTrendChart data={monthlyData} dark={dark} />
          ) : (
            <EmptyChartState onReset={() => setPreset('last_3_months')} dark={dark} />
          )}
        </ChartCard>
        <ChartCard title="Taxa de Glosa" subtitle="Evolução vs Meta (5%)" dark={dark}>
          {hasGlosaData ? (
            <GlosaRateChart data={monthlyData} dark={dark} />
          ) : (
            <EmptyChartState dark={dark} />
          )}
        </ChartCard>
        <ChartCard title="Ocupação da Agenda" subtitle="Hoje" dark={dark}>
          <OccupancyGauge value={totalAppointments > 0 ? Math.min(100, Math.round((totalAppointments / 50) * 100)) : 0} total={50} occupied={totalAppointments} dark={dark} />
        </ChartCard>
      </div>

      {/* Doctor performance */}
      {hasDoctorData && (
        <div className="mb-6">
          <DoctorProductionChart data={doctorProduction} dark={dark} />
        </div>
      )}

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {alerts.length > 0 && <AlertsPanel alerts={alerts} dark={dark} />}
        <QuickInsights insights={insights} dark={dark} />
      </div>
    </div>
  )
}
