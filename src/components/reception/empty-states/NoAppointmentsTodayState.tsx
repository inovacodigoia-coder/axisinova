import { Calendar, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function NoAppointmentsTodayState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Calendar className="h-14 w-14 text-muted-foreground/30 mb-4" />
      <h3 className="text-base font-semibold text-foreground mb-1">Nenhum agendamento para hoje</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Os pacientes agendados aparecerão aqui conforme chegarem na clínica.
      </p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/app/agendamento')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-input hover:bg-muted transition-colors">
          <Calendar className="h-4 w-4" /> Ver Agenda
        </button>
        <button onClick={() => navigate('/app/agendamento')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg gradient-bg text-white hover:brightness-110 transition-all">
          <Plus className="h-4 w-4" /> Novo Agendamento
        </button>
      </div>
    </div>
  )
}
