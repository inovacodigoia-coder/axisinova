import { cn } from '@/lib/utils'
import type { HeatmapZoom } from '@/hooks/useLabDashboardMetrics'

interface Props {
  columns: string[]
  rows: { label: string; cells: { value: number; tooltip: string }[] }[]
  max: number
  peak: string
  zoom: HeatmapZoom
  onZoomChange: (z: HeatmapZoom) => void
}

const ZOOMS: { value: HeatmapZoom; label: string }[] = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
]

function cellStyle(value: number, max: number) {
  if (value === 0) return { backgroundColor: 'hsl(var(--muted))' }
  const t = Math.min(1, value / (max || 1))
  // ciano -> roxo
  const from = [0, 212, 255]
  const to = [123, 47, 247]
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t))
  return { backgroundColor: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.25 + t * 0.75})` }
}

export function AttendanceHeatmap({ columns, rows, max, peak, zoom, onZoomChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Mapa de Calor de Atendimentos</h3>
          <p className="text-xs text-muted-foreground">
            {max > 0 ? `Pico: ${peak}` : 'Sem atendimentos registrados no recorte'}
          </p>
        </div>
        <div className="flex gap-1">
          {ZOOMS.map(z => (
            <button
              key={z.value}
              onClick={() => onZoomChange(z.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                zoom === z.value ? 'gradient-bg text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="flex items-center gap-1 pl-10">
            {columns.map(c => (
              <div key={c} className="flex-1 text-center text-[10px] text-muted-foreground">{c}</div>
            ))}
          </div>
          <div className="mt-1 space-y-1">
            {rows.map(r => (
              <div key={r.label} className="flex items-center gap-1">
                <div className="w-10 shrink-0 text-[10px] font-medium text-muted-foreground">{r.label}</div>
                {r.cells.map((cell, i) => (
                  <div
                    key={i}
                    title={cell.tooltip}
                    style={cellStyle(cell.value, max)}
                    className="h-7 flex-1 rounded-md transition-transform hover:scale-105"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <span key={t} className="h-3 w-6 rounded" style={cellStyle(t * max, max)} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  )
}
