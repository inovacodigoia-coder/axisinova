import { useState, useMemo } from 'react'

export function usePaginatedList<T>(items: T[], pageSize = 10) {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const totalItems = items.length
  const hasMore = visibleCount < totalItems
  const remainingCount = Math.max(0, totalItems - visibleCount)

  return {
    visibleItems,
    totalItems,
    hasMore,
    visibleCount: Math.min(visibleCount, totalItems),
    remainingCount,
    showMore: () => setVisibleCount(prev => Math.min(prev + pageSize, totalItems)),
    showAll: () => setVisibleCount(totalItems),
    reset: () => setVisibleCount(pageSize),
  }
}
