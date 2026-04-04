import { useState, useMemo } from 'react'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import type { PeriodPreset, DateRange } from '@/types/bi.types'

export function usePeriodFilter() {
  const [preset, setPreset] = useState<PeriodPreset>('this_month')
  const [customRange, setCustomRange] = useState<DateRange | null>(null)

  const dateRange = useMemo<DateRange>(() => {
    const now = new Date()
    if (preset === 'custom' && customRange) return customRange
    switch (preset) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) }
      case 'yesterday': { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) } }
      case 'last_7_days': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) }
      case 'last_30_days': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) }
      case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) }
      case 'last_month': { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) } }
      case 'last_3_months': return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) }
      case 'last_6_months': return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) }
      case 'this_year': return { from: startOfYear(now), to: endOfYear(now) }
      default: return { from: startOfMonth(now), to: endOfDay(now) }
    }
  }, [preset, customRange])

  const previousPeriodRange = useMemo<DateRange>(() => {
    const diff = dateRange.to.getTime() - dateRange.from.getTime()
    return {
      from: new Date(dateRange.from.getTime() - diff),
      to: new Date(dateRange.from.getTime() - 1),
    }
  }, [dateRange])

  return { preset, setPreset, dateRange, previousPeriodRange, setCustomRange }
}
