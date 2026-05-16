import { useEffect, useState } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { useRegisters } from '@/context/RegistersContext'
import { CalendarDays } from 'lucide-react'
import type { Patient } from '@/types/patient.types'

// Minimal type used here (we accept any appointment shape compatible)
interface SchedAppointment {
  id: string
  patientId: string
  doctorId: string
  doctorName: string
  appointmentType: 'consulta' | 'exame' | 'procedimento'
  convenioId?: string
  convenioName?: string
  startTime: string
  status: 'scheduled' | 'confirmed' | string
  unitId?: string
}

interface Props {
  unitId: string
  onSelect: (patient: Patient, appointment: SchedAppointment) => void
}

export function ScheduledAppointmentCard({ unitId, onSelect }: Props) {
  const { patients } = usePatients()
  const { doctors } = useRegisters()
  const [appointments, setAppointments] = useState<SchedAppointment[]>([])
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')

  // Carregar agendamentos do dia (mock: vazio em produção)
  useEffect(() => {
    setAppointments([])
  }, [unitId])

  const filtered = appointments.filter(a => {
    if (filterDoctor && a.doctorId !== filterDoctor) return false
    if (filterType && a.appointmentType !== filterType) return false
    if (search) {
      const p = patients.find(pt => pt.id === a.patientId)
      if (!p?.fullName.toLowerCase().includes(search.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente..."
          className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="">Todos os médicos</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="">Todos os tipos</option>
          <option value="consulta">Consulta</option>
          <option value="exame">Exame</option>
          <option value="procedimento">Procedimento</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">Nenhum agendamento confirmado para hoje</p>
          <p className="text-xs text-muted-foreground mt-1">Use as outras abas para buscar ou cadastrar paciente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(apt => {
            const patient = patients.find(p => p.id === apt.patientId)
            if (!patient) return null
            const time = new Date(apt.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={apt.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">📅</div>
                  <div className="text-lg font-bold text-foreground">{time}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{patient.fullName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {apt.status === 'confirmed' ? 'CONFIRMADO ✅' : 'AGENDADO'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {apt.appointmentType.charAt(0).toUpperCase() + apt.appointmentType.slice(1)} · {apt.doctorName}
                  </div>
                  <div className="text-xs text-muted-foreground">{apt.convenioName || 'Particular'}</div>
                </div>
                <button onClick={() => onSelect(patient, apt)}
                  className="rounded-md gradient-bg px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
                  Vincular e Avançar →
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
