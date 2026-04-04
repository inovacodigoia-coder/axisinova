import { BarChart3 } from 'lucide-react'

interface EmptyChartStateProps {
  onReset?: () => void
  dark?: boolean
}

export function EmptyChartState({ onReset, dark }: EmptyChartStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className={`h-12 w-12 ${dark ? 'text-white/20' : 'text-muted-foreground/30'}`} />
      <p className={`mt-3 text-sm font-medium ${dark ? 'text-white/50' : 'text-muted-foreground'}`}>
        Nenhum dado encontrado para o período selecionado
      </p>
      {onReset && (
        <button onClick={onReset} className="mt-2 text-xs text-primary hover:underline">
          Ampliar período
        </button>
      )}
    </div>
  )
}
