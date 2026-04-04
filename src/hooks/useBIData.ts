import { useMemo } from 'react'
import { MONTHLY_DATA, DOCTOR_PRODUCTION, CONVENIO_DATA, BI_ALERTS, QUICK_INSIGHTS, ABSENTEE_HEATMAP } from '@/mocks/bi.mock'
import type { KPIData, DateRange, BIFilters } from '@/types/bi.types'

export function useBIData(_period: DateRange, _filters: BIFilters) {
  const currentMonth = MONTHLY_DATA[MONTHLY_DATA.length - 1]
  const prevMonth = MONTHLY_DATA[MONTHLY_DATA.length - 2]

  const kpis = useMemo<KPIData[]>(() => {
    const pct = (cur: number, prev: number) => prev ? ((cur - prev) / prev) * 100 : 0
    const totalAtt = currentMonth.attendances
    const totalRev = currentMonth.revenue
    const totalRec = currentMonth.received
    const glosaRate = (currentMonth.glosa / currentMonth.revenue) * 100
    const absentRate = (currentMonth.absentees / currentMonth.attendances) * 100
    const avgTicket = totalRev / totalAtt
    const occupancy = 73

    return [
      { label: 'Atendimentos no Período', value: totalAtt, unit: 'pacientes', trend: pct(totalAtt, prevMonth.attendances), trendDirection: totalAtt >= prevMonth.attendances ? 'up' : 'down', trendIsPositive: totalAtt >= prevMonth.attendances, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.attendances) },
      { label: 'Receita Bruta', value: totalRev, unit: 'R$', trend: pct(totalRev, prevMonth.revenue), trendDirection: totalRev >= prevMonth.revenue ? 'up' : 'down', trendIsPositive: totalRev >= prevMonth.revenue, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.revenue), target: 55000, targetReached: totalRev >= 55000 },
      { label: 'Receita Líquida', value: totalRec, unit: 'R$', trend: pct(totalRec, prevMonth.received), trendDirection: totalRec >= prevMonth.received ? 'up' : 'down', trendIsPositive: totalRec >= prevMonth.received, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.received) },
      { label: 'Taxa de Glosa', value: glosaRate.toFixed(1), unit: '%', trend: pct(glosaRate, (prevMonth.glosa / prevMonth.revenue) * 100), trendDirection: glosaRate <= (prevMonth.glosa / prevMonth.revenue) * 100 ? 'down' : 'up', trendIsPositive: glosaRate <= (prevMonth.glosa / prevMonth.revenue) * 100, sparklineData: MONTHLY_DATA.slice(-7).map(m => (m.glosa / m.revenue) * 100), target: 5, targetReached: glosaRate <= 5 },
      { label: 'Taxa de Faltosos', value: absentRate.toFixed(1), unit: '%', trend: pct(absentRate, (prevMonth.absentees / prevMonth.attendances) * 100), trendDirection: absentRate <= (prevMonth.absentees / prevMonth.attendances) * 100 ? 'down' : 'up', trendIsPositive: absentRate <= (prevMonth.absentees / prevMonth.attendances) * 100, sparklineData: MONTHLY_DATA.slice(-7).map(m => (m.absentees / m.attendances) * 100) },
      { label: 'Ticket Médio', value: avgTicket.toFixed(0), unit: 'R$', trend: pct(avgTicket, prevMonth.revenue / prevMonth.attendances), trendDirection: avgTicket >= prevMonth.revenue / prevMonth.attendances ? 'up' : 'down', trendIsPositive: avgTicket >= prevMonth.revenue / prevMonth.attendances, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.revenue / m.attendances) },
      { label: 'Ocupação da Agenda', value: occupancy, unit: '%', trend: 3.2, trendDirection: 'up', trendIsPositive: true, sparklineData: [65, 68, 70, 72, 71, 74, 73], target: 80, targetReached: occupancy >= 80 },
      { label: 'NPS / Satisfação', value: '4.6', unit: 'pontos', trend: 2.1, trendDirection: 'up', trendIsPositive: true, sparklineData: [4.2, 4.3, 4.4, 4.5, 4.4, 4.6, 4.6] },
    ]
  }, [currentMonth, prevMonth])

  return {
    kpis,
    monthlyData: MONTHLY_DATA,
    doctorProduction: DOCTOR_PRODUCTION,
    convenioData: CONVENIO_DATA,
    alerts: BI_ALERTS,
    insights: QUICK_INSIGHTS,
    heatmap: ABSENTEE_HEATMAP,
  }
}
