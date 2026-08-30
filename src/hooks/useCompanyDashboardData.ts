import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { useScheduling } from '@/context/SchedulingContext'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subDays, subMonths, isWithinInterval, parseISO, format, eachDayOfInterval,
  getDay, getHours, differenceInCalendarWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type HeatmapZoom = 'day' | 'week' | 'month'

const safeParse = (v?: string | null) => {
  if (!v) return null
  try { const d = parseISO(v); return isNaN(d.getTime()) ? null : d } catch { return null }
}

export function useCompanyDashboardData() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const { orders, loading } = useAttendanceCadastro()
  const { appointments } = useScheduling()
  const [heatmapZoom, setHeatmapZoom] = useState<HeatmapZoom>('week')

  const { data: patientsCount = 0 } = useQuery({
    queryKey: ['dashboard_patients_count', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { count, error } = await (supabase.from('patients' as any) as any)
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
      if (error) throw error
      return count || 0
    },
  })

  const validOrders = useMemo(
    () => (orders || []).filter((o: any) => o.status !== 'deleted' && safeParse(o.registeredAt)),
    [orders]
  )

  const dates = useMemo(
    () => validOrders.map((o: any) => safeParse(o.registeredAt)!).filter(Boolean),
    [validOrders]
  )

  const stats = useMemo(() => {
    const now = new Date()
    const inRange = (d: Date, start: Date, end: Date) => isWithinInterval(d, { start, end })

    const todayCount = dates.filter(d => inRange(d, startOfDay(now), endOfDay(now))).length
    const yCount = dates.filter(d => inRange(d, startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1)))).length
    const change = yCount > 0 ? ((todayCount - yCount) / yCount) * 100 : null

    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const weekAppointments = (appointments || []).filter((a: any) => {
      const d = safeParse(a.date)
      return d ? inRange(d, weekStart, weekEnd) : false
    }).length

    const monthOrders = validOrders.filter((o: any) => {
      const d = safeParse(o.registeredAt)!
      return inRange(d, startOfMonth(now), endOfMonth(now)) && o.status !== 'cancelled'
    })
    const monthlyRevenue = monthOrders.reduce((acc: number, o: any) => acc + (Number(o.privateValue) || 0), 0)

    const weeklyChartData = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => ({
      day: format(day, 'EEE', { locale: ptBR }),
      atendimentos: dates.filter(d => inRange(d, startOfDay(day), endOfDay(day))).length,
    }))

    const monthlyRevenueData = Array.from({ length: 6 }).map((_, i) => {
      const ref = subMonths(now, 5 - i)
      const valor = validOrders
        .filter((o: any) => {
          const d = safeParse(o.registeredAt)!
          return o.status !== 'cancelled' && inRange(d, startOfMonth(ref), endOfMonth(ref))
        })
        .reduce((acc: number, o: any) => acc + (Number(o.privateValue) || 0), 0)
      return { month: format(ref, 'MMM', { locale: ptBR }), valor }
    })

    const recent = [...validOrders]
      .sort((a: any, b: any) => safeParse(b.registeredAt)!.getTime() - safeParse(a.registeredAt)!.getTime())
      .slice(0, 6)
      .map((o: any) => ({
        time: format(safeParse(o.registeredAt)!, 'dd/MM HH:mm'),
        patient: o.patientName || '—',
        doctor: o.doctorName || o.requestingDoctor || '—',
        type: o.examMode === 'lab' ? 'Laboratório' : 'Clínica',
        status: o.status as string,
      }))

    return {
      todayCount,
      change,
      patientsCount,
      weekAppointments,
      monthlyRevenue,
      weeklyChartData,
      monthlyRevenueData,
      recent,
      totalOrders: validOrders.length,
    }
  }, [validOrders, dates, appointments, patientsCount])

  const heatmap = useMemo(() => {
    const now = new Date()
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    let columns: string[] = []
    let rows: { label: string; cells: { value: number; tooltip: string }[] }[] = []

    if (heatmapZoom === 'day') {
      columns = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
      const counts = new Array(24).fill(0)
      dates
        .filter(d => isWithinInterval(d, { start: startOfDay(now), end: endOfDay(now) }))
        .forEach(d => { counts[getHours(d)] += 1 })
      rows = [{
        label: 'Hoje',
        cells: counts.map((v, h) => ({ value: v, tooltip: `${String(h).padStart(2, '0')}h — ${v} atendimento(s)` })),
      }]
    } else if (heatmapZoom === 'week') {
      const hours = Array.from({ length: 15 }, (_, i) => i + 6)
      columns = hours.map(h => String(h).padStart(2, '0'))
      rows = dayNames.map((dn, di) => ({
        label: dn,
        cells: hours.map(h => {
          const v = dates.filter(d => getDay(d) === di && getHours(d) === h).length
          return { value: v, tooltip: `${dn} ${String(h).padStart(2, '0')}h — ${v} atendimento(s)` }
        }),
      }))
    } else {
      columns = dayNames
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)
      rows = [0, 1, 2, 3, 4, 5].map(w => ({
        label: `S${w + 1}`,
        cells: dayNames.map((dn, di) => {
          const v = dates.filter(d =>
            d >= monthStart && d <= monthEnd &&
            differenceInCalendarWeeks(d, startOfWeek(monthStart)) === w &&
            getDay(d) === di
          ).length
          return { value: v, tooltip: `Semana ${w + 1} · ${dn} — ${v} atendimento(s)` }
        }),
      }))
    }

    let max = 0
    let peak = ''
    rows.forEach(r => r.cells.forEach(c => { if (c.value > max) { max = c.value; peak = c.tooltip } }))
    return { columns, rows, max, peak }
  }, [dates, heatmapZoom])

  return { loading, stats, heatmap, heatmapZoom, setHeatmapZoom }
}
