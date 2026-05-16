import { useState } from 'react'
import { Search, UserCheck, CalendarDays, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PatientSearchInput } from '../lookup/PatientSearchInput'
import { ScheduledAppointmentCard } from '../lookup/ScheduledAppointmentCard'
import { QuickPatientForm } from '../lookup/QuickPatientForm'
import { PatientResultCard } from '../lookup/PatientResultCard'
import type { CadastroState } from '../AttendanceCadastroModal'
import type { Patient } from '@/types/patient.types'

interface Props {
  state: CadastroState
  update: (patch: Partial<CadastroState>) => void
  unitId: string
}

type TabKey = 'search' | 'scheduled' | 'new'

export function Step1PatientLookup({ state, update, unitId }: Props) {
  const [tab, setTab] = useState<TabKey>('search')

  const handleSelect = (patient: Patient) => {
    update({ patient })
  }

  if (state.patient) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/40 p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <UserCheck className="h-4 w-4" /> PACIENTE SELECIONADO
          </div>
          <PatientResultCard patient={state.patient} compact={false} />
          {state.patient.clinicalData?.allergies?.length ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700">
              ⚠️ Alergias: {state.patient.clinicalData.allergies.map(a => a.substance).join(', ')}
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <button
              onClick={() => update({ patient: undefined, scheduledAppointmentId: undefined })}
              className="text-xs rounded-md border border-border px-3 py-2 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3 inline mr-1" /> Trocar paciente
            </button>
            <span className="text-xs text-emerald-600 font-medium">✓ Pronto para avançar</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex gap-1 mb-4 rounded-xl border border-border bg-card p-1">
        <TabBtn active={tab === 'search'} onClick={() => setTab('search')} icon={<Search className="h-4 w-4" />} label="Buscar Paciente" />
        <TabBtn active={tab === 'scheduled'} onClick={() => setTab('scheduled')} icon={<CalendarDays className="h-4 w-4" />} label="Agendamentos do Dia" />
        <TabBtn active={tab === 'new'} onClick={() => setTab('new')} icon={<UserPlus className="h-4 w-4" />} label="Novo Paciente" />
      </div>

      {tab === 'search' && <PatientSearchInput onSelect={handleSelect} />}
      {tab === 'scheduled' && <ScheduledAppointmentCard unitId={unitId} onSelect={(patient, apt) => {
        update({
          patient,
          scheduledAppointmentId: apt.id,
          doctorId: apt.doctorId, doctorName: apt.doctorName,
          serviceType: apt.appointmentType === 'consulta' ? 'consultation' : apt.appointmentType === 'exame' ? 'exam' : 'procedure',
          convenioId: apt.convenioId, convenioName: apt.convenioName,
        })
      }} />}
      {tab === 'new' && <QuickPatientForm onCreate={handleSelect} />}
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all',
        active ? 'gradient-bg text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}>
      {icon} {label}
    </button>
  )
}
