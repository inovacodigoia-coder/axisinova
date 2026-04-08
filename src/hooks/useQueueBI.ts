import { useMemo } from 'react'
import { MOCK_QUEUE_BI } from '@/mocks/queue-system.mock'
import type { QueueBIData } from '@/types/queue-system.types'

export function useQueueBI(unitId?: string): QueueBIData {
  return useMemo(() => {
    const data = MOCK_QUEUE_BI
    if (!unitId || unitId === 'all') return data
    const unitMetric = data.unitMetrics.find(u => u.unitId === unitId)
    if (!unitMetric) return data
    const ratio = unitMetric.generated / data.totals.generated
    return {
      ...data,
      dailyStats: data.dailyStats.map(d => ({
        ...d,
        generated: Math.round(d.generated * ratio),
        attended: Math.round(d.attended * ratio),
        abandoned: Math.round(d.abandoned * ratio),
      })),
      totals: {
        generated: unitMetric.generated,
        attended: unitMetric.attended,
        abandoned: unitMetric.abandoned,
        avgWaitMinutes: unitMetric.avgWaitMinutes,
      },
      unitMetrics: [unitMetric],
    }
  }, [unitId])
}
