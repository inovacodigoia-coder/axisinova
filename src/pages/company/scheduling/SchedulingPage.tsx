import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { AgendaFilters, type ViewMode } from '@/components/scheduling/CalendarView/AgendaFilters'
import { AgendaCalendar } from '@/components/scheduling/CalendarView/AgendaCalendar'
import { AppointmentWizard } from '@/components/scheduling/appointment/AppointmentWizard'
import { AppointmentDetailDrawer } from '@/components/scheduling/AppointmentDetailDrawer'
import { NoDoctorsState } from '@/components/scheduling/empty-states/NoDoctorsState'
import { useRegisters } from '@/context/RegistersContext'
import { useScheduling } from '@/context/SchedulingContext'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function SchedulingPage() {
  const { doctors, convenios, specialties } = useRegisters()
  const { appointments, addAppointment, updateAppointment } = useScheduling()

  const activeDoctors = useMemo(() => doctors.filter(d => d.isActive && !d.isBlocked && d.agendaEnabled !== false), [doctors])

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [convenioFilter, setConvenioFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedApt, setSelectedApt] = useState<SchedulingAppointment | null>(null)
  const [prefilledDoctor, setPrefilledDoctor] = useState('')
  const [prefilledDate, setPrefilledDate] = useState('')
  const [prefilledTime, setPrefilledTime] = useState('')

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (doctorFilter !== 'all' && a.doctorId !== doctorFilter) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (convenioFilter !== 'all' && a.convenioId !== convenioFilter) return false
      if (search && !a.patientName.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [appointments, doctorFilter, typeFilter, convenioFilter, search])

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const todayAppts = filtered.filter(a => a.date === dateStr && a.status !== 'cancelled')
  const todayCount = {
    total: todayAppts.length,
    consultations: todayAppts.filter(a => a.type === 'consultation').length,
    exams: todayAppts.filter(a => a.type === 'exam').length,
    procedures: todayAppts.filter(a => a.type === 'procedure').length,
  }

  const handleSlotClick = (doctorId: string, date: string, time: string) => {
    setPrefilledDoctor(doctorId)
    setPrefilledDate(date)
    setPrefilledTime(time)
    setWizardOpen(true)
  }

  const handleNewAppointment = () => {
    setPrefilledDoctor('')
    setPrefilledDate('')
    setPrefilledTime('')
    setWizardOpen(true)
  }

  const handleSave = (data: any) => {
    const doctor = doctors.find(d => d.id === data.doctorId)
    const convenio = convenios.find(c => c.id === data.convenioId)
    const newApt: SchedulingAppointment = {
      id: `apt_new_${Date.now()}`,
      companyId: data.patient.companyId,
      patientId: data.patient.id,
      patientName: data.patient.fullName,
      patientPhone1: data.patient.phone1,
      patientPhone2: data.patient.phone2,
      doctorId: data.doctorId,
      doctorName: doctor?.fullName || '',
      convenioId: data.convenioId,
      convenioName: convenio?.name || '',
      type: data.type,
      examId: data.examId || undefined,
      date: data.date,
      time: data.time,
      duration: doctor?.scheduleConfig?.consultationDuration || 30,
      status: 'scheduled',
      visitType: 'first_visit',
      observations: data.observations,
      createdBy: 'current_user',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }
    const horas = data.confirmMethod === '48h' ? 48 : data.confirmMethod === '24h' ? 24 : null
    return addAppointment(newApt, { confirmHoras: horas })
  }

  const handleStatusChange = (id: string, status: SchedulingAppointment['status'], reason?: string) => {
    updateAppointment(id, { status, cancelledReason: reason, updatedAt: new Date().toISOString().split('T')[0] })
    toast.success(`Status atualizado para: ${status}`)
  }

  // No doctors: show empty state
  if (activeDoctors.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">Central de agendamentos da clínica</p>
          </div>
        </div>
        <NoDoctorsState />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Central de agendamentos da clínica</p>
        </div>
        <GradientButton onClick={handleNewAppointment}><Plus className="h-4 w-4 mr-2" /> Novo Agendamento</GradientButton>
      </div>

      <AgendaFilters
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        doctorFilter={doctorFilter}
        onDoctorFilterChange={setDoctorFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        convenioFilter={convenioFilter}
        onConvenioFilterChange={setConvenioFilter}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        todayCount={todayCount}
      />

      <AgendaCalendar
        selectedDate={selectedDate}
        appointments={filtered}
        doctorFilter={doctorFilter}
        viewMode={viewMode}
        onSlotClick={handleSlotClick}
        onAppointmentClick={setSelectedApt}
        onNewAppointment={handleNewAppointment}
      />

      <AppointmentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSave={handleSave}
        prefilledDoctor={prefilledDoctor}
        prefilledDate={prefilledDate}
        prefilledTime={prefilledTime}
      />

      <AppointmentDetailDrawer
        appointment={selectedApt}
        onClose={() => setSelectedApt(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
