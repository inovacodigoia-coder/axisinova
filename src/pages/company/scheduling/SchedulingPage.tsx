import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { GradientButton } from '@/components/ui/GradientButton'
import { AgendaFilters, type ViewMode } from '@/components/scheduling/CalendarView/AgendaFilters'
import { AgendaCalendar } from '@/components/scheduling/CalendarView/AgendaCalendar'
import { AppointmentWizard } from '@/components/scheduling/appointment/AppointmentWizard'
import { AppointmentDetailDrawer } from '@/components/scheduling/AppointmentDetailDrawer'
import { MOCK_APPOINTMENTS, MOCK_PATIENTS } from '@/mocks/scheduling.mock'
import type { SchedulingAppointment } from '@/types/scheduling.types'
import type { LegacyDoctor as Doctor } from '@/mocks/company.mock'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function SchedulingPage() {
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
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS)

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

  const handleSlotClick = (doctor: Doctor, date: string, time: string) => {
    setPrefilledDoctor(doctor.id)
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
    const newApt: SchedulingAppointment = {
      id: `apt_new_${Date.now()}`,
      companyId: 'comp_001',
      patientId: data.patient.id,
      patientName: data.patient.fullName,
      patientPhone1: data.patient.phone1,
      patientPhone2: data.patient.phone2,
      doctorId: data.doctorId,
      doctorName: '', // will be set
      convenioId: data.convenioId,
      convenioName: '',
      type: data.type,
      examId: data.examId || undefined,
      date: data.date,
      time: data.time,
      duration: 30,
      status: 'scheduled',
      visitType: 'first_visit',
      observations: data.observations,
      createdBy: 'cu_03',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }
    setAppointments(prev => [...prev, newApt])
  }

  const handleStatusChange = (id: string, status: SchedulingAppointment['status'], reason?: string) => {
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status, cancelledReason: reason, updatedAt: new Date().toISOString().split('T')[0] } : a
    ))
    toast.success(`Status atualizado para: ${status}`)
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
