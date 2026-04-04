import { PeriodSelector } from '@/components/bi/shared/PeriodSelector'
import type { PeriodPreset } from '@/types/bi.types'

interface ReportFiltersProps {
  preset: PeriodPreset
  onPresetChange: (p: PeriodPreset) => void
  dark?: boolean
  children?: React.ReactNode
}

export function ReportFilters({ preset, onPresetChange, dark, children }: ReportFiltersProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
      dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border'
    }`}>
      <PeriodSelector preset={preset} onChange={onPresetChange} dark={dark} />
      {children}
    </div>
  )
}
