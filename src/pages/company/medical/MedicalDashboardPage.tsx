import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScheduling } from '@/context/SchedulingContext'
import { useRegisters } from '@/context/RegistersContext'
import { useMedical } from '@/context/MedicalContext'
import { useAuth } from '@/context/AuthContext'
import { useQueue } from '@/context/QueueContext'
import { useDoctorQueue } from '@/hooks/useDoctorQueue'
import { NoPatientsInQueueState } from '@/components/medical/empty-states/NoPatientsInQueueState'
import { Clock, Users, CheckCircle, Timer, Play, Eye, AlertTriangle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { TriageDoctorQueue } from '@/components/medical/TriageDoctorQueue'
import { AdmissionRequestDialog } from '@/components/inpatient/AdmissionRequestDialog'

function getAge(birthDate: string) {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default function MedicalDashboardPage() {
  const [admOpen, setAdmOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { doctors, specialties } = useRegisters()
  const { patients, appointments } = useScheduling()
  const { attendanceRecords, getPatientAlerts } = useMedical()
  const { state: queueState, callTicket, updateStatus } = useQueue()

  const activeCompanyId = user?.companyId ?? ''

  // Find the doctor linked to the logged-in user
  const loggedDoctor = useMemo(() => {
    if (!user) return null
    return doctors.find(d =>
      d.companyId === activeCompanyId &&
      d.isActive &&
      (d.email === user.email)
    ) ?? null
  }, [doctors, user, activeCompanyId])

  const { doctorQueue, currentPatient, nextPatient, waitingCount } = useDoctorQueue(loggedDoctor?.id, activeCompanyId)

  const today = new Date().toISOString().split('T')[0]

  const todayAppts = useMemo(() =>
    appointments.filter(a =>
      a.date === today &&
      a.doctorId === loggedDoctor?.id &&
      a.companyId === activeCompanyId
    ).sort((a, b) => a.time.localeCompare(b.time)),
    [today, loggedDoctor?.id, appointments, activeCompanyId]
  )

  const completedRecords = useMemo(() =>
    attendanceRecords.filter(r =>
      r.doctorId === loggedDoctor?.id &&
      r.companyId === activeCompanyId &&
      r.startedAt.startsWith(today) &&
      (r.status === 'signed' || r.status === 'completed')
    ),
    [attendanceRecords, loggedDoctor?.id, activeCompanyId, today]
  )

  const completed = todayAppts.filter(a => a.status === 'completed' || a.status === 'in_progress').length
  const waiting = todayAppts.filter(a => ['waiting', 'confirmed', 'scheduled'].includes(a.status)).length
  const avgDuration = completedRecords.length
    ? Math.round(completedRecords.reduce((s, r) => s + (r.duration || 0), 0) / completedRecords.length)
    : 0

  const activeAppt = todayAppts.find(a => a.status === 'in_progress')
  const nextAppt = todayAppts.find(a => ['waiting', 'confirmed', 'scheduled'].includes(a.status))

  const doctorSpecialties = useMemo(() => {
    if (!loggedDoctor) return ''
    return specialties
      .filter(s => loggedDoctor.specialtyIds.includes(s.id))
      .map(s => s.name)
      .join(' · ')
  }, [loggedDoctor, specialties])

  const handleStartAttendance = (appointmentId: string) => {
    navigate(`/app/atendimento/${appointmentId}`)
  }

  const handleCallNext = () => {
    if (!nextAppt) return
    const queueEntry = queueState.entries.find(e => e.appointmentId === nextAppt.id)
    if (queueEntry) {
      callTicket(queueEntry.id)
      updateStatus(queueEntry.id, 'called_doctor', 'Consultório')
    }
  }

  // If role is doctor and no linked doctor record
  if (user?.role === 'doctor' && !loggedDoctor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Cadastro de médico não encontrado</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Seu usuário não está vinculado a um médico cadastrado no sistema.
            Solicite ao administrador que vincule seu usuário ao cadastro de médico.
          </p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total hoje', value: todayAppts.length, icon: Users, color: 'text-primary' },
    { label: 'Atendidos', value: completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Aguardando', value: waiting, icon: Clock, color: 'text-yellow-600' },
    { label: 'Tempo médio', value: `${avgDuration} min`, icon: Timer, color: 'text-muted-foreground' },
  ]

  const statusColors: Record<string, string> = {
    scheduled: 'border-l-blue-400', confirmed: 'border-l-green-500',
    waiting: 'border-l-yellow-500', in_progress: 'border-l-purple-500',
    completed: 'border-l-gray-400', absent: 'border-l-red-500',
    cancelled: 'border-l-gray-300',
  }
  const statusLabels: Record<string, string> = {
    scheduled: 'Agendado', confirmed: 'Confirmado', waiting: 'Aguardando',
    in_progress: 'Em Atendimento', completed: 'Concluído', absent: 'Faltou', cancelled: 'Cancelado',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel do Médico</h1>
          <p className="text-sm text-muted-foreground">
            {loggedDoctor ? `Dr. ${loggedDoctor.fullName}` : user?.name} · {doctorSpecialties || 'Médico'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left - Patient list */}
        <div className="lg:col-span-3 space-y-3">
          <TriageDoctorQueue />
          <h2 className="text-lg font-semibold text-foreground">Agenda do Dia</h2>
          {todayAppts.length === 0 && <NoPatientsInQueueState />}
          {todayAppts.map(appt => {
            const patient = patients.find(p => p.id === appt.patientId)
            const alerts = getPatientAlerts(appt.patientId, activeCompanyId)
            const isActive = appt.status === 'in_progress'
            const queueEntry = queueState.entries.find(e => e.appointmentId === appt.id)
            const canStart = queueEntry !== null && ['in_reception', 'documents_ok', 'called_doctor'].includes(queueEntry?.status ?? '')

            return (
              <motion.div
                key={appt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border-l-4 ${statusColors[appt.status] || 'border-l-gray-300'} bg-card border border-border p-4 ${isActive ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-foreground">{appt.time}</span>
                      {queueEntry && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground">
                          {queueEntry.ticketNumber}
                        </span>
                      )}
                      {appt.visitType === 'first_visit' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-primary to-secondary text-white">1ª VEZ</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground">RETORNO</span>
                      )}
                      {alerts.length > 0 && (
                        <span className="flex items-center gap-0.5 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-[10px] font-bold">{alerts.length}</span>
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-foreground">{appt.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {patient ? `${getAge(patient.birthDate)} anos` : ''} · {appt.convenioName} · {appt.type === 'consultation' ? 'Consulta' : appt.type === 'exam' ? 'Exame' : 'Procedimento'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        appt.status === 'completed' ? 'bg-muted text-muted-foreground' :
                        appt.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                        appt.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>{statusLabels[appt.status]}</span>
                      {queueEntry && !canStart && !['completed', 'in_progress'].includes(appt.status) && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⚠️ Aguardando recepção</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['waiting', 'confirmed', 'scheduled'].includes(appt.status) && (
                      <button
                        onClick={() => canStart ? handleStartAttendance(appt.id) : undefined}
                        disabled={!canStart}
                        title={!canStart ? 'Paciente ainda não fez check-in na recepção' : ''}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity ${
                          canStart
                            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Play className="h-3 w-3" /> Iniciar
                      </button>
                    )}
                    {appt.status === 'in_progress' && (
                      <button
                        onClick={() => handleStartAttendance(appt.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                      >
                        <Play className="h-3 w-3" /> Continuar
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/app/prontuario/${appt.patientId}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <Eye className="h-3 w-3" /> Prontuário
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {activeAppt && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
              <p className="text-xs font-medium text-purple-600 mb-2">ATENDIMENTO EM ANDAMENTO</p>
              <p className="text-lg font-bold text-foreground">{activeAppt.patientName}</p>
              <p className="text-sm text-muted-foreground">{activeAppt.convenioName} · {activeAppt.time}</p>
              <button
                onClick={() => handleStartAttendance(activeAppt.id)}
                className="mt-3 w-full py-2.5 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Continuar Atendimento
              </button>
              <button
                onClick={() => setAdmOpen(true)}
                className="mt-2 w-full py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                Solicitar internação
              </button>
              <AdmissionRequestDialog open={admOpen} onOpenChange={setAdmOpen} patientName={activeAppt.patientName} />
            </div>
          )}

          {nextAppt && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-medium text-primary mb-2">PRÓXIMO PACIENTE</p>
              <p className="text-lg font-bold text-foreground">{nextAppt.patientName}</p>
              <p className="text-sm text-muted-foreground">{nextAppt.time} · {nextAppt.convenioName}</p>
              {nextAppt.visitType === 'first_visit' && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-primary to-secondary text-white">1ª VEZ</span>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={handleCallNext} className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-opacity">
                  📢 Chamar
                </button>
                <button onClick={() => handleStartAttendance(nextAppt.id)} className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors">
                  ▶ Iniciar
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">RESUMO DO DIA</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Consultas</span><span className="font-medium text-foreground">{todayAppts.filter(a => a.type === 'consultation').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Exames</span><span className="font-medium text-foreground">{todayAppts.filter(a => a.type === 'exam').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Procedimentos</span><span className="font-medium text-foreground">{todayAppts.filter(a => a.type === 'procedure').length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
