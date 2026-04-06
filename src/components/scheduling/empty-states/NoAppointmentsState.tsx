interface Props {
  onNewAppointment?: () => void
}

export function NoAppointmentsState({ onNewAppointment }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <span className="text-4xl">📅</span>
      <h3 className="text-lg font-bold text-foreground">Nenhum agendamento para este dia</h3>
      {onNewAppointment && (
        <button onClick={onNewAppointment}
          className="rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
          + Novo Agendamento
        </button>
      )}
    </div>
  )
}
