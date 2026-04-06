import { Armchair } from 'lucide-react'

export function EmptyQueueState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
      <Armchair className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">Nenhum paciente na fila</p>
      <p className="text-xs mt-1">Os check-ins aparecerão aqui</p>
    </div>
  )
}
