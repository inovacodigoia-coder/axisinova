import { FileText } from 'lucide-react'

export function EmptyTimelineState() {
  return (
    <div className="text-center py-12 px-4">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum atendimento registrado</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Este paciente ainda não possui atendimentos registrados. O prontuário será preenchido durante o primeiro atendimento.
      </p>
    </div>
  )
}
