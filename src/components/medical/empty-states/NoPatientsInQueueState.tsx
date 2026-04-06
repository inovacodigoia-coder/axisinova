import { CheckCircle } from 'lucide-react'

export function NoPatientsInQueueState() {
  return (
    <div className="text-center py-12 px-4">
      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum paciente aguardando</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Sua fila está vazia no momento. Novos pacientes aparecerão aqui após o check-in na recepção.
      </p>
    </div>
  )
}
