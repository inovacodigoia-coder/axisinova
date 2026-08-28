import { useMemo, useState } from 'react'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { useRegisters } from '@/context/RegistersContext'
import {
  startOfDay, endOfDay, subDays, startOfMonth, endOfMonth,
  isWithinInterval, parseISO, getDay, getHours, differenceInCalendarWeeks, startOfWeek,
} from 'date-fns'

export type LabPeriod = 'today' | 'last_7_days' | 'last_30_days' | 'this_month'
export type HeatmapZoom = 'day' | 'week' | 'month'

export const LAB_PERIOD_OPTIONS: { value: LabPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'last_7_days', label: '7 dias' },
  { value: 'last_30_days', label: '30 dias' },
  { value: 'this_month', label: 'Este mês' },
]

export const LAB_STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; route?: string }> = {
  waiting_collection: { label: 'AGUARDANDO', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-500/10', route: '/app/lab/coleta' },
  collection_done: { label: 'COLETA REALIZADA', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-500/10', route: '/app/lab/analise' },
  open: { label: 'ABERTO', dot: 'bg-blue-400', text: 'text-blue-500', bg: 'bg-blue-400/10' },
  in_analysis: { label: 'Em Análise', dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-500/10', route: '/app/lab/analise' },
  validation: { label: 'Validação', dot: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-500/10', route: '/app/lab/validacao' },
  released: { label: 'Liberado', dot: 'bg-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-600/10', route: '/app/lab/laudos' },
  cancelled: { label: 'Cancelado', dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-500/10' },
  authorized: { label: 'Autorizado', dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-500/10' },
  completed: { label: 'Concluído', dot: 'bg-emerald-700', text: 'text-emerald-800', bg: 'bg-emerald-700/10' },
}

export const LAB_STATUS_ORDER = [
  'waiting_collection', 'collection_done', 'open', 'in_analysis',
  'validation', 'released', 'cancelled', 'authorized', 'completed',
]

function getRange(period: LabPeriod) {
  const now = new Date()
  switch (period) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) }
    case 'last_7_days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
    case 'last_30_days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) }
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) }
  }
}

const normalize = (v?: string) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function materialGroup(raw?: string) {
  const m = normalize(raw)
  if (!m) return 'Não informado'
  if (m.includes('edta') || m.includes('sangue total')) return 'Sangue total (EDTA)'
  if (m.includes('citrato') || m.includes('plasma')) return 'Plasma (Citrato)'
  if (m.includes('soro') || m.includes('gel')) return 'Soro'
  if (m.includes('urina')) return 'Urina'
  if (m.includes('fezes')) return 'Fezes'
  if (m.includes('swab') || m.includes('secre')) return 'Swab / Secreção'
  if (m.includes('fluor')) return 'Fluoreto'
  return (raw || '').trim()
}

export function useLabDashboardMetrics() {
  const [period, setPeriod] = useState<LabPeriod>('last_30_days')
  const [heatmapZoom, setHeatmapZoom] = useState<HeatmapZoom>('week')
  const [topLimit, setTopLimit] = useState<number>(10)

  const { orders, loading } = useAttendanceCadastro()
  const { exams: catalog, workbenches } = useRegisters()

  const range = useMemo(() => getRange(period), [period])

  const labOrders = useMemo(() => {
    return (orders || []).filter((o: any) => {
      if (o.status === 'deleted') return false
      if (o.examMode && o.examMode !== 'lab') return false
      if (!o.registeredAt) return false
      try {
        return isWithinInterval(parseISO(o.registeredAt), range)
      } catch { return false }
    })
  }, [orders, range])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    LAB_STATUS_ORDER.forEach(s => { counts[s] = 0 })
    labOrders.forEach((o: any) => {
      if (counts[o.status] === undefined) counts[o.status] = 0
      counts[o.status] += 1
    })
    return counts
  }, [labOrders])

  const examRows = useMemo(() => {
    const catalogById = new Map<string, any>()
    const catalogByName = new Map<string, any>()
    ;(catalog || []).forEach((e: any) => {
      catalogById.set(e.id, e)
      catalogByName.set(normalize(e.name), e)
    })
    const benchById = new Map((workbenches || []).map((w: any) => [w.id, w.name]))

    const rows: { name: string; code?: string; material: string; sector: string }[] = []
    labOrders.forEach((o: any) => {
      if (o.status === 'cancelled') return
      ;(o.labGuides || []).forEach((g: any) => {
        ;(g.exams || []).forEach((e: any) => {
          const cat = catalogById.get(e.examId || e.id) || catalogByName.get(normalize(e.name || e.examName))
          const sector = cat?.workbenchId ? (benchById.get(cat.workbenchId) || 'Sem setor') : 'Sem setor'
          rows.push({
            name: e.name || e.examName || cat?.name || 'Exame',
            code: e.internalCode || cat?.internalCode || cat?.tussCode,
            material: materialGroup(e.material || e.selectedMaterial || e.materialName || cat?.defaultMaterial),
            sector,
          })
        })
      })
    })
    return rows
  }, [labOrders, catalog, workbenches])

  const tally = (key: 'material' | 'sector') => {
    const map = new Map<string, number>()
    examRows.forEach(r => map.set(r[key], (map.get(r[key]) || 0) + 1))
    const total = examRows.length || 1
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count, percentage: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
  }

  const byMaterial = useMemo(() => tally('material'), [examRows])
  const bySector = useMemo(() => tally('sector'), [examRows])

  const topExams = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; sector: string; count: number }>()
    examRows.forEach(r => {
      const key = normalize(r.name)
      const cur = map.get(key)
      if (cur) cur.count += 1
      else map.set(key, { name: r.name, code: r.code, sector: r.sector, count: 1 })
    })
    const all = Array.from(map.values()).sort((a, b) => b.count - a.count)
    const max = all[0]?.count || 1
    return { rows: all.slice(0, topLimit).map(r => ({ ...r, ratio: r.count / max })), total: all.length }
  }, [examRows, topLimit])

  const heatmap = useMemo(() => {
    const now = new Date()
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const dates = labOrders
      .map((o: any) => { try { return parseISO(o.registeredAt) } catch { return null } })
      .filter(Boolean) as Date[]

    let columns: string[] = []
    let rows: { label: string; cells: { value: number; tooltip: string }[] }[] = []

    if (heatmapZoom === 'day') {
      columns = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
      const counts = new Array(24).fill(0)
      dates.filter(d => isWithinInterval(d, { start: startOfDay(now), end: endOfDay(now) }))
        .forEach(d => { counts[getHours(d)] += 1 })
      rows = [{ label: 'Hoje', cells: counts.map((v, h) => ({ value: v, tooltip: `${String(h).padStart(2, '0')}h — ${v} atendimento(s)` })) }]
    } else if (heatmapZoom === 'week') {
      const hours = Array.from({ length: 15 }, (_, i) => i + 6) // 06h - 20h
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
      const weeks = [0, 1, 2, 3, 4, 5]
      rows = weeks.map(w => ({
        label: `S${w + 1}`,
        cells: dayNames.map((dn, di) => {
          const v = dates.filter(d =>
            d >= monthStart && d <= endOfMonth(now) &&
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
  }, [labOrders, heatmapZoom])

  return {
    loading,
    period, setPeriod,
    heatmapZoom, setHeatmapZoom,
    topLimit, setTopLimit,
    totalOrders: labOrders.length,
    totalSamples: examRows.length,
    statusCounts,
    byMaterial,
    bySector,
    topExams,
    heatmap,
  }
}
