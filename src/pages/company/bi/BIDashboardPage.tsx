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

export default function BIDashboardPage() {
  const [dark, setDark] = useState(true)
  const { preset, setPreset, dateRange } = usePeriodFilter()
  const { kpis, monthlyData, convenioData, doctorProduction, alerts, insights } = useBIData(dateRange, {})

  return (
    <div className={cn('min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 transition-colors', dark ? 'bg-[#0F1117]' : 'bg-muted')}>
      <ExecutiveHeader dark={dark} onToggleDark={() => setDark(!dark)} preset={preset} onPresetChange={setPreset} />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => <KPICard key={kpi.label} data={kpi} dark={dark} />)}
      </div>

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <ChartCard title="Faturamento vs Recebimento" subtitle="Últimos 6 meses" dark={dark} className="lg:col-span-3">
          <RevenueBarChart data={monthlyData} dark={dark} />
        </ChartCard>
        <ChartCard title="Distribuição por Convênio" subtitle="Atendimentos no período" dark={dark} className="lg:col-span-2">
          <ConvenioDonutChart data={convenioData} dark={dark} />
        </ChartCard>
      </div>

      {/* Secondary charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="Tendência de Atendimentos" subtitle="Últimos 12 meses" dark={dark}>
          <AttendanceTrendChart data={monthlyData} dark={dark} />
        </ChartCard>
        <ChartCard title="Taxa de Glosa" subtitle="Evolução vs Meta (5%)" dark={dark}>
          <GlosaRateChart data={monthlyData} dark={dark} />
        </ChartCard>
        <ChartCard title="Ocupação da Agenda" subtitle="Hoje" dark={dark}>
          <OccupancyGauge value={73} total={52} occupied={38} dark={dark} />
        </ChartCard>
      </div>

      {/* Doctor performance */}
      <div className="mb-6">
        <DoctorProductionChart data={doctorProduction} dark={dark} />
      </div>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsPanel alerts={alerts} dark={dark} />
        <QuickInsights insights={insights} dark={dark} />
      </div>
    </div>
  )
}
