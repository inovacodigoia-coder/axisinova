import { FileText } from 'lucide-react'

export function NoAttendanceHistoryState() {
  return (
    <div className="text-center py-12 px-4">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum atendimento registrado</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Este é o primeiro atendimento deste paciente no sistema. O histórico será construído a partir de hoje.
      </p>
    </div>
  )
}
