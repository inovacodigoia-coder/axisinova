export type AppointmentType = 'consultation' | 'exam' | 'procedure'

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'absent'
  | 'cancelled'
  | 'rescheduled'

export type VisitType = 'first_visit' | 'return'

export interface SchedulingPatient {
  id: string
  fullName: string
  birthDate: string
  cpf?: string
  motherName: string
  phone1: string
  phone2?: string
  email?: string
  convenioId?: string
  convenioCardNumber?: string
  convenioCardExpiry?: string
  gender?: 'M' | 'F' | 'O'
  companyId: string
  createdAt: string
}

export interface SchedulingAppointment {
  id: string
  companyId: string
  patientId: string
  patientName: string
  patientPhone1: string
  patientPhone2?: string
  doctorId: string
  doctorName: string
  convenioId: string
  convenioName: string
  type: AppointmentType
  examId?: string
  examName?: string
  date: string
  time: string
  duration: number
  status: AppointmentStatus
  visitType: VisitType
  observations?: string
  confirmationSentAt?: string
  confirmationMethod?: '24h' | '48h'
  confirmedAt?: string
  confirmedBy?: string
  pedidoPaciente?: 'remarcar' | 'cancelar'
  pedidoPacienteEm?: string
  cancelledReason?: string
  absentRegisteredAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ConfirmationDispatch {
  id: string
  appointmentId: string
  patientName: string
  patientPhone1: string
  patientPhone2?: string
  appointmentDate: string
  appointmentTime: string
  doctorName: string
  method: '24h' | '48h'
  status: 'pending' | 'sent' | 'confirmed' | 'failed'
  sentAt?: string
  confirmedAt?: string
}

export const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string; border: string }> = {
  scheduled: { label: 'Agendado', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-l-blue-400' },
  confirmed: { label: 'Confirmado', color: 'text-green-700', bg: 'bg-green-50', border: 'border-l-green-500' },
  waiting: { label: 'Aguardando', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-l-yellow-500' },
  in_progress: { label: 'Em Atendimento', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-l-purple-500' },
  completed: { label: 'Concluído', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-l-gray-400' },
  absent: { label: 'Faltou', color: 'text-red-700', bg: 'bg-red-50', border: 'border-l-red-500' },
  cancelled: { label: 'Cancelado', color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-l-gray-300' },
  rescheduled: { label: 'Remarcado', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-l-orange-400' },
}

export const APPOINTMENT_TYPE_CONFIG: Record<AppointmentType, { label: string; icon: string }> = {
  consultation: { label: 'Consulta', icon: '📋' },
  exam: { label: 'Exame', icon: '🔬' },
  procedure: { label: 'Procedimento', icon: '⚕️' },
}
