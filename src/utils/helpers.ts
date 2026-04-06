/**
 * Filter any array of items by companyId — used for multi-tenant isolation.
 */
export function filterByCompany<T extends { companyId: string }>(
  items: T[],
  companyId: string
): T[] {
  return items.filter(item => item.companyId === companyId)
}

/**
 * Generate a unique ID with timestamp + random suffix.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Safely parse a date string, returning null on failure.
 */
export function safeParse(dateStr: string): Date | null {
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

/**
 * Add business days (skip weekends).
 */
export function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) added++
  }
  return result
}
