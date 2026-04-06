import { useMemo } from 'react'
import { isWithinInterval, parseISO, format, startOfMonth, differenceInDays, getDay } from 'date-fns'
import { useScheduling } from '@/context/SchedulingContext'
import { useBillingContext } from '@/context/BillingContext'
import { useMedical } from '@/context/MedicalContext'
import { useRegisters } from '@/context/RegistersContext'
import { useAuth } from '@/context/AuthContext'
import type { KPIData, DateRange, BIFilters, MonthlyData, DoctorProductionData, ConvenioData, HeatmapCell } from '@/types/bi.types'
import { MONTHLY_DATA, DOCTOR_PRODUCTION, CONVENIO_DATA, BI_ALERTS, QUICK_INSIGHTS, ABSENTEE_HEATMAP } from '@/mocks/bi.mock'
import { isDemoCompany } from '@/mocks/registers.mock'

export interface BIDataResult {
  kpis: KPIData[]
  monthlyData: MonthlyData[]
  doctorProduction: DoctorProductionData[]
  convenioData: ConvenioData[]
  alerts: any[]
  insights: string[]
  heatmap: HeatmapCell[]
  hasData: boolean
  totalAppointments: number
}

function safeInterval(range: DateRange) {
  return { start: range.from, end: range.to }
}

export function useBIData(dateRange: DateRange, _filters: BIFilters): BIDataResult {
  const { user } = useAuth()
  const companyId = user?.companyId
  const isDemo = isDemoCompany(companyId)

  const { appointments } = useScheduling()
  const { guides, glosas } = useBillingContext()
  const { attendanceRecords } = useMedical()
  const { doctors, specialties, convenios } = useRegisters()

  return useMemo(() => {
    // Demo company: use mock data
    if (isDemo) {
      const currentMonth = MONTHLY_DATA[MONTHLY_DATA.length - 1]
      const prevMonth = MONTHLY_DATA[MONTHLY_DATA.length - 2]
      const pct = (cur: number, prev: number) => prev ? ((cur - prev) / prev) * 100 : 0

      const totalAtt = currentMonth.attendances
      const totalRev = currentMonth.revenue
      const totalRec = currentMonth.received
      const glosaRate = (currentMonth.glosa / currentMonth.revenue) * 100
      const absentRate = (currentMonth.absentees / currentMonth.attendances) * 100
      const avgTicket = totalRev / totalAtt

      const kpis: KPIData[] = [
        { label: 'Atendimentos no Período', value: totalAtt, unit: 'pacientes', trend: pct(totalAtt, prevMonth.attendances), trendDirection: totalAtt >= prevMonth.attendances ? 'up' : 'down', trendIsPositive: totalAtt >= prevMonth.attendances, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.attendances) },
        { label: 'Receita Bruta', value: totalRev, unit: 'R$', trend: pct(totalRev, prevMonth.revenue), trendDirection: totalRev >= prevMonth.revenue ? 'up' : 'down', trendIsPositive: totalRev >= prevMonth.revenue, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.revenue), target: 55000, targetReached: totalRev >= 55000 },
        { label: 'Receita Líquida', value: totalRec, unit: 'R$', trend: pct(totalRec, prevMonth.received), trendDirection: totalRec >= prevMonth.received ? 'up' : 'down', trendIsPositive: totalRec >= prevMonth.received, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.received) },
        { label: 'Taxa de Glosa', value: glosaRate.toFixed(1), unit: '%', trend: pct(glosaRate, (prevMonth.glosa / prevMonth.revenue) * 100), trendDirection: glosaRate <= (prevMonth.glosa / prevMonth.revenue) * 100 ? 'down' : 'up', trendIsPositive: glosaRate <= (prevMonth.glosa / prevMonth.revenue) * 100, sparklineData: MONTHLY_DATA.slice(-7).map(m => (m.glosa / m.revenue) * 100), target: 5, targetReached: glosaRate <= 5 },
        { label: 'Taxa de Faltosos', value: absentRate.toFixed(1), unit: '%', trend: pct(absentRate, (prevMonth.absentees / prevMonth.attendances) * 100), trendDirection: absentRate <= (prevMonth.absentees / prevMonth.attendances) * 100 ? 'down' : 'up', trendIsPositive: absentRate <= (prevMonth.absentees / prevMonth.attendances) * 100, sparklineData: MONTHLY_DATA.slice(-7).map(m => (m.absentees / m.attendances) * 100) },
        { label: 'Ticket Médio', value: avgTicket.toFixed(0), unit: 'R$', trend: pct(avgTicket, prevMonth.revenue / prevMonth.attendances), trendDirection: avgTicket >= prevMonth.revenue / prevMonth.attendances ? 'up' : 'down', trendIsPositive: avgTicket >= prevMonth.revenue / prevMonth.attendances, sparklineData: MONTHLY_DATA.slice(-7).map(m => m.revenue / m.attendances) },
        { label: 'Ocupação da Agenda', value: 73, unit: '%', trend: 3.2, trendDirection: 'up', trendIsPositive: true, sparklineData: [65, 68, 70, 72, 71, 74, 73], target: 80, targetReached: false },
        { label: 'NPS / Satisfação', value: '4.6', unit: 'pontos', trend: 2.1, trendDirection: 'up', trendIsPositive: true, sparklineData: [4.2, 4.3, 4.4, 4.5, 4.4, 4.6, 4.6] },
      ]

      return {
        kpis,
        monthlyData: MONTHLY_DATA,
        doctorProduction: DOCTOR_PRODUCTION,
        convenioData: CONVENIO_DATA,
        alerts: BI_ALERTS,
        insights: QUICK_INSIGHTS,
        heatmap: ABSENTEE_HEATMAP,
        hasData: true,
        totalAppointments: totalAtt,
      }
    }

    // Real data aggregation
    const interval = safeInterval(dateRange)

    const periodAppointments = appointments.filter(a => {
      try {
        return isWithinInterval(parseISO(a.date), interval)
      } catch { return false }
    })

    const periodGuides = guides.filter(g => {
      try {
        return isWithinInterval(parseISO(g.attendanceDate), interval)
      } catch { return false }
    })

    const periodRecords = attendanceRecords.filter(r => {
      try {
        return isWithinInterval(parseISO(r.startedAt), interval)
      } catch { return false }
    })

    const hasData = periodAppointments.length > 0 || periodGuides.length > 0 || periodRecords.length > 0

    if (!hasData) {
      return {
        kpis: [],
        monthlyData: [],
        doctorProduction: [],
        convenioData: [],
        alerts: [],
        insights: [],
        heatmap: [],
        hasData: false,
        totalAppointments: 0,
      }
    }

    // KPIs
    const completedAppts = periodAppointments.filter(a => a.status === 'completed')
    const absentAppts = periodAppointments.filter(a => a.status === 'absent')
    const grossRevenue = periodGuides.reduce((s, g) => s + g.totalValueSubmitted, 0)
    const totalGlosaValue = glosas.filter(gl => periodGuides.some(g => g.id === gl.guideId)).reduce((s, g) => s + g.value, 0)
    const netRevenue = grossRevenue - totalGlosaValue
    const glosaRate = grossRevenue > 0 ? (totalGlosaValue / grossRevenue) * 100 : 0
    const absenteeRate = periodAppointments.length > 0 ? (absentAppts.length / periodAppointments.length) * 100 : 0
    const avgTicket = completedAppts.length > 0 ? grossRevenue / completedAppts.length : 0

    const sparkBase = (arr: number[]) => arr.length > 0 ? arr : [0]

    const kpis: KPIData[] = [
      { label: 'Atendimentos', value: completedAppts.length, unit: 'pacientes', trend: 0, trendDirection: 'neutral', trendIsPositive: true, sparklineData: sparkBase(completedAppts.map(() => 1)) },
      { label: 'Receita Bruta', value: grossRevenue, unit: 'R$', trend: 0, trendDirection: 'neutral', trendIsPositive: true, sparklineData: sparkBase(periodGuides.map(g => g.totalValueSubmitted)) },
      { label: 'Receita Líquida', value: netRevenue, unit: 'R$', trend: 0, trendDirection: 'neutral', trendIsPositive: true, sparklineData: sparkBase([netRevenue]) },
      { label: 'Taxa de Glosa', value: glosaRate.toFixed(1), unit: '%', trend: 0, trendDirection: 'neutral', trendIsPositive: glosaRate <= 5, sparklineData: [glosaRate], target: 5, targetReached: glosaRate <= 5 },
      { label: 'Taxa de Faltosos', value: absenteeRate.toFixed(1), unit: '%', trend: 0, trendDirection: absenteeRate > 10 ? 'up' : 'neutral', trendIsPositive: absenteeRate <= 10, sparklineData: [absenteeRate] },
      { label: 'Ticket Médio', value: avgTicket.toFixed(0), unit: 'R$', trend: 0, trendDirection: 'neutral', trendIsPositive: true, sparklineData: [avgTicket] },
    ]

    // Monthly data from guides
    const monthMap = new Map<string, MonthlyData>()
    periodGuides.forEach(g => {
      const key = format(parseISO(g.attendanceDate), 'MMM/yy')
      const existing = monthMap.get(key) || { month: key, attendances: 0, revenue: 0, received: 0, glosa: 0, absentees: 0 }
      existing.revenue += g.totalValueSubmitted
      existing.received += g.totalValueApproved ?? 0
      const guideGlosas = glosas.filter(gl => gl.guideId === g.id)
      existing.glosa += guideGlosas.reduce((s, gl) => s + gl.value, 0)
      monthMap.set(key, existing)
    })
    periodAppointments.forEach(a => {
      const key = format(parseISO(a.date), 'MMM/yy')
      const existing = monthMap.get(key) || { month: key, attendances: 0, revenue: 0, received: 0, glosa: 0, absentees: 0 }
      existing.attendances++
      if (a.status === 'absent') existing.absentees++
      monthMap.set(key, existing)
    })
    const monthlyData = Array.from(monthMap.values())

    // Doctor production
    const doctorMap = new Map<string, DoctorProductionData>()
    periodAppointments.forEach(a => {
      const existing = doctorMap.get(a.doctorId) || {
        doctorId: a.doctorId,
        doctorName: a.doctorName,
        specialty: doctors.find(d => d.id === a.doctorId)?.specialtyIds
          .map(sid => specialties.find(s => s.id === sid)?.name).filter(Boolean).join(', ') || '—',
        consultations: 0, exams: 0, procedures: 0, totalAttendances: 0,
        revenue: 0, avgAttendanceTime: 0, absenteeRate: 0,
      }
      if (a.status === 'completed') {
        existing.totalAttendances++
        if (a.type === 'consultation') existing.consultations++
        else if (a.type === 'exam') existing.exams++
        else existing.procedures++
      }
      doctorMap.set(a.doctorId, existing)
    })
    // Add revenue from guides
    periodGuides.forEach(g => {
      const existing = doctorMap.get(g.doctorId)
      if (existing) existing.revenue += g.totalValueSubmitted
    })
    // Calculate absentee rates per doctor
    doctorMap.forEach((data, doctorId) => {
      const doctorAppts = periodAppointments.filter(a => a.doctorId === doctorId)
      const doctorAbsent = doctorAppts.filter(a => a.status === 'absent')
      data.absenteeRate = doctorAppts.length > 0 ? (doctorAbsent.length / doctorAppts.length) * 100 : 0
      // Avg attendance time from medical records
      const records = periodRecords.filter(r => r.doctorId === doctorId && r.duration)
      data.avgAttendanceTime = records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.duration ?? 0), 0) / records.length) : 0
    })
    const doctorProduction = Array.from(doctorMap.values())

    // Convenio data
    const convenioMap = new Map<string, ConvenioData>()
    periodAppointments.forEach(a => {
      const existing = convenioMap.get(a.convenioId) || {
        convenioId: a.convenioId,
        convenioName: a.convenioName,
        attendances: 0, revenue: 0, glosaRate: 0, avgTicket: 0, percentage: 0,
      }
      existing.attendances++
      convenioMap.set(a.convenioId, existing)
    })
    periodGuides.forEach(g => {
      const existing = convenioMap.get(g.convenioId)
      if (existing) existing.revenue += g.totalValueSubmitted
    })
    const convenioArr = Array.from(convenioMap.values())
    const totalConvAtts = convenioArr.reduce((s, c) => s + c.attendances, 0)
    convenioArr.forEach(c => {
      c.percentage = totalConvAtts > 0 ? Math.round((c.attendances / totalConvAtts) * 100) : 0
      c.avgTicket = c.attendances > 0 ? Math.round(c.revenue / c.attendances) : 0
    })
    const convenioData = convenioArr.sort((a, b) => b.attendances - a.attendances)

    // Heatmap
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    const hours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
    const heatmap: HeatmapCell[] = []
    const dayMap: Record<string, number> = { 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5 }
    days.forEach(day => {
      hours.forEach(hour => {
        const dayAppts = periodAppointments.filter(a => {
          try { return getDay(parseISO(a.date)) === dayMap[day] && a.time >= hour && a.time < (parseInt(hour) + 1 + ':00') } catch { return false }
        })
        const absent = dayAppts.filter(a => a.status === 'absent').length
        const rate = dayAppts.length > 0 ? Math.round((absent / dayAppts.length) * 100) : 0
        heatmap.push({ day, hour, rate })
      })
    })

    // Generate real insights
    const insights: string[] = []
    if (doctorProduction.length > 0) {
      const top = [...doctorProduction].sort((a, b) => b.totalAttendances - a.totalAttendances)[0]
      insights.push(`🏆 ${top.doctorName} é o profissional mais produtivo com ${top.totalAttendances} atendimentos no período.`)
    }
    if (absenteeRate > 10) {
      insights.push(`⚠️ Taxa de faltosos está em ${absenteeRate.toFixed(1)}%, acima do ideal de 10%. Considere reforçar confirmações.`)
    }
    if (convenioData.length > 1) {
      const best = convenioData[0]
      insights.push(`📊 ${best.convenioName} lidera com ${best.attendances} atendimentos (${best.percentage}% do total).`)
    }
    if (grossRevenue > 0) {
      insights.push(`💰 Receita bruta do período: R$ ${(grossRevenue / 1000).toFixed(1)}k com ticket médio de R$ ${avgTicket.toFixed(0)}.`)
    }
    if (completedAppts.length < 10) {
      insights.push(`📈 Complete mais atendimentos para análises mais detalhadas. Atual: ${completedAppts.length}.`)
    }

    // Generate real alerts
    const alerts: any[] = []
    if (glosaRate > 5) {
      alerts.push({
        id: 'high-glosa', type: glosaRate > 8 ? 'critical' : 'warning', category: 'financial',
        title: `Taxa de glosa: ${glosaRate.toFixed(1)}%`,
        description: `A taxa de glosa está acima da meta de 5%. Valor em risco: R$ ${totalGlosaValue.toFixed(0)}.`,
        action: 'Ver glosas', actionRoute: '/app/faturamento/glosas',
        detectedAt: new Date().toISOString(),
      })
    }
    if (absenteeRate > 15) {
      alerts.push({
        id: 'high-absent', type: 'warning', category: 'operational',
        title: `Alta taxa de faltosos: ${absenteeRate.toFixed(1)}%`,
        description: `${absentAppts.length} pacientes não compareceram no período. Revise a estratégia de confirmações.`,
        action: 'Ver faltosos', actionRoute: '/app/agendamento/faltosos',
        detectedAt: new Date().toISOString(),
      })
    }
    const pendingGuides = guides.filter(g => ['draft', 'pending_docs'].includes(g.status) && differenceInDays(new Date(), parseISO(g.createdAt)) > 7)
    if (pendingGuides.length > 0) {
      alerts.push({
        id: 'pending-guides', type: 'warning', category: 'financial',
        title: `${pendingGuides.length} guia(s) pendente(s) há mais de 7 dias`,
        description: `Valor total em risco: R$ ${pendingGuides.reduce((s, g) => s + g.totalValueSubmitted, 0).toFixed(0)}.`,
        action: 'Ver guias', actionRoute: '/app/faturamento/guias',
        detectedAt: new Date().toISOString(),
      })
    }
    if (completedAppts.length > 10) {
      alerts.push({
        id: 'good-volume', type: 'success', category: 'operational',
        title: `${completedAppts.length} atendimentos realizados`,
        description: `Bom volume de atendimentos no período selecionado.`,
        detectedAt: new Date().toISOString(),
      })
    }

    return {
      kpis,
      monthlyData,
      doctorProduction,
      convenioData,
      alerts,
      insights,
      heatmap,
      hasData,
      totalAppointments: periodAppointments.length,
    }
  }, [isDemo, dateRange, appointments, guides, glosas, attendanceRecords, doctors, specialties, convenios])
}
