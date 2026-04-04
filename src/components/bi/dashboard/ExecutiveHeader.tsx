import { Sun, Moon, RefreshCw } from 'lucide-react'
import { PeriodSelector } from '@/components/bi/shared/PeriodSelector'
import { ExportMenu } from '@/components/bi/reports/ExportMenu'
import type { PeriodPreset } from '@/types/bi.types'

interface ExecutiveHeaderProps {
  dark: boolean
  onToggleDark: () => void
  preset: PeriodPreset
  onPresetChange: (p: PeriodPreset) => void
}

export function ExecutiveHeader({ dark, onToggleDark, preset, onPresetChange }: ExecutiveHeaderProps) {
  const now = new Date()
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`rounded-xl border p-4 mb-6 ${dark ? 'bg-[#1A1F2E] border-white/[0.06]' : 'bg-card border-border'}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div>
          <h1 className={`text-xl font-bold ${dark ? 'text-white' : 'text-foreground'}`}>Business Intelligence</h1>
          <p className={`text-xs flex items-center gap-1.5 mt-1 ${dark ? 'text-white/40' : 'text-muted-foreground'}`}>
            <RefreshCw className="h-3 w-3" /> Atualizado às {time}
          </p>
        </div>
        <PeriodSelector preset={preset} onChange={onPresetChange} dark={dark} />
        <div className="flex items-center gap-2">
          <button onClick={onToggleDark} className={`rounded-lg p-2 transition-colors ${dark ? 'bg-white/[0.06] text-white/60 hover:bg-white/10' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <ExportMenu dark={dark} />
        </div>
      </div>
    </div>
  )
}
