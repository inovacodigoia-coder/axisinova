import type { SchedulingPatient, SchedulingAppointment, ConfirmationDispatch } from '@/types/scheduling.types'

const CID = 'comp_001'

// Helper to get dates relative to today
function d(offset: number): string {
  const dt = new Date()
  dt.setDate(dt.getDate() + offset)
  return dt.toISOString().split('T')[0]
}

const today = d(0)

export const MOCK_PATIENTS: SchedulingPatient[] = [
  { id: 'pat_01', fullName: 'João da Silva Santos', birthDate: '1983-05-14', cpf: '123.456.789-00', motherName: 'Maria da Silva', phone1: '(84) 99901-1001', phone2: '(84) 3201-1001', email: 'joao.silva@email.com', convenioId: 'conv_01', convenioCardNumber: '0012345678', gender: 'M', companyId: CID, createdAt: '2024-01-10' },
  { id: 'pat_02', fullName: 'Ana Beatriz Oliveira', birthDate: '1995-09-22', cpf: '234.567.890-11', motherName: 'Claudia Oliveira', phone1: '(84) 99902-2002', email: 'ana.beatriz@email.com', convenioId: 'conv_02', convenioCardNumber: '0023456789', gender: 'F', companyId: CID, createdAt: '2024-02-15' },
  { id: 'pat_03', fullName: 'Carlos Eduardo Pereira', birthDate: '1970-03-08', cpf: '345.678.901-22', motherName: 'Rosa Pereira', phone1: '(84) 99903-3003', phone2: '(84) 3203-3003', convenioId: 'conv_04', gender: 'M', companyId: CID, createdAt: '2024-03-01' },
  { id: 'pat_04', fullName: 'Mariana Costa Lima', birthDate: '2001-12-30', cpf: '456.789.012-33', motherName: 'Sandra Costa', phone1: '(84) 99904-4004', email: 'mari.lima@email.com', convenioId: 'conv_01', convenioCardNumber: '0034567890', gender: 'F', companyId: CID, createdAt: '2024-03-20' },
  { id: 'pat_05', fullName: 'Pedro Henrique Alves', birthDate: '1958-07-17', cpf: '567.890.123-44', motherName: 'Francisca Alves', phone1: '(84) 99905-5005', convenioId: 'conv_05', gender: 'M', companyId: CID, createdAt: '2024-04-05' },
  { id: 'pat_06', fullName: 'Fernanda Rodrigues', birthDate: '1988-11-03', motherName: 'Helena Rodrigues', phone1: '(84) 99906-6006', phone2: '(84) 3206-6006', email: 'fer.rodrigues@email.com', convenioId: 'conv_03', convenioCardNumber: '0045678901', gender: 'F', companyId: CID, createdAt: '2024-04-20' },
  { id: 'pat_07', fullName: 'Lucas Gabriel Souza', birthDate: '2019-02-14', motherName: 'Patrícia Souza', phone1: '(84) 99907-7007', convenioId: 'conv_01', convenioCardNumber: '0056789012', gender: 'M', companyId: CID, createdAt: '2024-05-10' },
  { id: 'pat_08', fullName: 'Isabela Cristina Freitas', birthDate: '1975-06-28', cpf: '678.901.234-55', motherName: 'Antônia Freitas', phone1: '(84) 99908-8008', email: 'isabela.f@email.com', convenioId: 'conv_06', convenioCardNumber: '0067890123', gender: 'F', companyId: CID, createdAt: '2024-05-25' },
  { id: 'pat_09', fullName: 'Rafael Mendes Barbosa', birthDate: '1992-10-11', cpf: '789.012.345-66', motherName: 'Lúcia Mendes', phone1: '(84) 99909-9009', convenioId: 'conv_02', convenioCardNumber: '0078901234', gender: 'M', companyId: CID, createdAt: '2024-06-08' },
  { id: 'pat_10', fullName: 'Gabriela Nogueira Silva', birthDate: '1999-04-05', motherName: 'Beatriz Nogueira', phone1: '(84) 99910-0010', email: 'gabi.nogueira@email.com', convenioId: 'conv_04', gender: 'F', companyId: CID, createdAt: '2024-06-22' },
  { id: 'pat_11', fullName: 'Antônio Carlos Ribeiro', birthDate: '1945-08-20', cpf: '890.123.456-77', motherName: 'Josefa Ribeiro', phone1: '(84) 99911-1011', phone2: '(84) 3211-1011', convenioId: 'conv_05', gender: 'M', companyId: CID, createdAt: '2024-07-01' },
  { id: 'pat_12', fullName: 'Letícia Amaral Dias', birthDate: '2005-01-18', motherName: 'Vanessa Amaral', phone1: '(84) 99912-2012', convenioId: 'conv_01', convenioCardNumber: '0089012345', gender: 'F', companyId: CID, createdAt: '2024-07-15' },
  { id: 'pat_13', fullName: 'José Francisco Moreira', birthDate: '1963-09-30', cpf: '901.234.567-88', motherName: 'Conceição Moreira', phone1: '(84) 99913-3013', convenioId: 'conv_06', convenioCardNumber: '0090123456', gender: 'M', companyId: CID, createdAt: '2024-08-05' },
  { id: 'pat_14', fullName: 'Camila Andrade Torres', birthDate: '1997-07-07', motherName: 'Regina Andrade', phone1: '(84) 99914-4014', email: 'camila.torres@email.com', convenioId: 'conv_03', convenioCardNumber: '0012340001', gender: 'F', companyId: CID, createdAt: '2024-08-20' },
  { id: 'pat_15', fullName: 'Thiago Nascimento Ramos', birthDate: '1986-02-25', cpf: '012.345.678-99', motherName: 'Eliane Nascimento', phone1: '(84) 99915-5015', phone2: '(84) 3215-5015', convenioId: 'conv_02', convenioCardNumber: '0012340002', gender: 'M', companyId: CID, createdAt: '2024-09-01' },
  { id: 'pat_16', fullName: 'Bianca Ferreira Lopes', birthDate: '1990-11-12', motherName: 'Marlene Ferreira', phone1: '(84) 99916-6016', convenioId: 'conv_01', convenioCardNumber: '0012340003', gender: 'F', companyId: CID, createdAt: '2024-09-15' },
  { id: 'pat_17', fullName: 'Eduardo Vieira Castro', birthDate: '1978-04-19', cpf: '111.222.333-00', motherName: 'Aparecida Vieira', phone1: '(84) 99917-7017', convenioId: 'conv_04', gender: 'M', companyId: CID, createdAt: '2024-10-01' },
  { id: 'pat_18', fullName: 'Sofia Helena Pinto', birthDate: '2021-06-03', motherName: 'Carolina Pinto', phone1: '(84) 99918-8018', convenioId: 'conv_01', convenioCardNumber: '0012340004', gender: 'F', companyId: CID, createdAt: '2024-10-20' },
  { id: 'pat_19', fullName: 'Marcos Aurélio Gomes', birthDate: '1955-12-08', cpf: '222.333.444-11', motherName: 'Teresa Gomes', phone1: '(84) 99919-9019', phone2: '(84) 3219-9019', convenioId: 'conv_05', gender: 'M', companyId: CID, createdAt: '2024-11-05' },
  { id: 'pat_20', fullName: 'Juliana Martins Duarte', birthDate: '1993-08-16', motherName: 'Ivone Martins', phone1: '(84) 99920-0020', email: 'ju.duarte@email.com', convenioId: 'conv_06', convenioCardNumber: '0012340005', gender: 'F', companyId: CID, createdAt: '2024-11-20' },
]

// Generate appointments
function makeAppt(
  id: string, patIdx: number, doctorId: string, doctorName: string,
  convenioId: string, convenioName: string, type: 'consultation' | 'exam' | 'procedure',
  date: string, time: string, duration: number, status: SchedulingAppointment['status'],
  visitType: 'first_visit' | 'return', extra?: Partial<SchedulingAppointment>
): SchedulingAppointment {
  const p = MOCK_PATIENTS[patIdx]
  return {
    id, companyId: CID, patientId: p.id, patientName: p.fullName,
    patientPhone1: p.phone1, patientPhone2: p.phone2,
    doctorId, doctorName, convenioId, convenioName, type,
    date, time, duration, status, visitType,
    createdBy: 'cu_03', createdAt: '2025-01-15', updatedAt: '2025-01-15',
    ...extra,
  }
}

export const MOCK_APPOINTMENTS: SchedulingAppointment[] = [
  // Today
  makeAppt('apt_01', 0, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', today, '08:00', 30, 'confirmed', 'return', { confirmedAt: d(-1), confirmedBy: 'Paciente' }),
  makeAppt('apt_02', 1, 'doc_01', 'Dr. Henrique Lima', 'conv_02', 'Hapvida', 'consultation', today, '08:40', 30, 'scheduled', 'first_visit'),
  makeAppt('apt_03', 2, 'doc_01', 'Dr. Henrique Lima', 'conv_04', 'Particular', 'consultation', today, '09:20', 30, 'waiting', 'return'),
  makeAppt('apt_04', 3, 'doc_03', 'Dr. Roberto Santos', 'conv_01', 'Unimed', 'consultation', today, '09:00', 45, 'confirmed', 'first_visit', { confirmedAt: d(-1), confirmedBy: 'Familiar' }),
  makeAppt('apt_05', 4, 'doc_03', 'Dr. Roberto Santos', 'conv_05', 'SUS', 'consultation', today, '10:00', 45, 'scheduled', 'return'),
  makeAppt('apt_06', 5, 'doc_04', 'Dra. Mariana Lopes', 'conv_03', 'Bradesco Saúde', 'consultation', today, '08:00', 30, 'in_progress', 'return'),
  makeAppt('apt_07', 6, 'doc_04', 'Dra. Mariana Lopes', 'conv_01', 'Unimed', 'consultation', today, '08:40', 30, 'waiting', 'first_visit'),
  makeAppt('apt_08', 7, 'doc_01', 'Dr. Henrique Lima', 'conv_06', 'Amil', 'exam', today, '10:00', 20, 'scheduled', 'return', { examId: 'ex_03', examName: 'Eletrocardiograma' }),
  makeAppt('apt_09', 8, 'doc_02', 'Dr. Pedro Almeida', 'conv_01', 'Unimed', 'consultation', today, '07:00', 20, 'completed', 'return'),
  makeAppt('apt_10', 9, 'doc_02', 'Dr. Pedro Almeida', 'conv_04', 'Particular', 'consultation', today, '07:25', 20, 'completed', 'first_visit'),

  // Tomorrow
  makeAppt('apt_11', 10, 'doc_03', 'Dr. Roberto Santos', 'conv_05', 'SUS', 'consultation', d(1), '09:00', 45, 'scheduled', 'first_visit'),
  makeAppt('apt_12', 11, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(1), '08:00', 30, 'confirmed', 'return', { confirmedAt: today }),
  makeAppt('apt_13', 12, 'doc_04', 'Dra. Mariana Lopes', 'conv_06', 'Amil', 'exam', d(1), '08:00', 30, 'scheduled', 'first_visit', { examId: 'ex_10', examName: 'Ultrassonografia Obstétrica' }),
  makeAppt('apt_14', 13, 'doc_01', 'Dr. Henrique Lima', 'conv_03', 'Bradesco Saúde', 'consultation', d(1), '08:40', 30, 'scheduled', 'first_visit'),
  makeAppt('apt_15', 14, 'doc_03', 'Dr. Roberto Santos', 'conv_02', 'Hapvida', 'procedure', d(1), '10:00', 60, 'scheduled', 'return', { examId: 'ex_06', examName: 'Ressonância Magnética' }),

  // Day +2
  makeAppt('apt_16', 15, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(2), '08:00', 30, 'scheduled', 'return'),
  makeAppt('apt_17', 0, 'doc_03', 'Dr. Roberto Santos', 'conv_01', 'Unimed', 'consultation', d(2), '09:00', 45, 'scheduled', 'return'),
  makeAppt('apt_18', 16, 'doc_04', 'Dra. Mariana Lopes', 'conv_04', 'Particular', 'consultation', d(2), '14:00', 30, 'scheduled', 'first_visit'),

  // Day +3-6
  makeAppt('apt_19', 1, 'doc_02', 'Dr. Pedro Almeida', 'conv_01', 'Unimed', 'exam', d(3), '07:00', 20, 'scheduled', 'return', { examId: 'ex_04', examName: 'Raio-X de Tórax' }),
  makeAppt('apt_20', 3, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(3), '08:00', 30, 'scheduled', 'first_visit'),
  makeAppt('apt_21', 5, 'doc_03', 'Dr. Roberto Santos', 'conv_06', 'Amil', 'consultation', d(4), '09:00', 45, 'scheduled', 'return'),
  makeAppt('apt_22', 7, 'doc_04', 'Dra. Mariana Lopes', 'conv_06', 'Amil', 'consultation', d(4), '08:00', 30, 'confirmed', 'return'),
  makeAppt('apt_23', 9, 'doc_05', 'Dra. Camila Souza', 'conv_04', 'Particular', 'consultation', d(5), '08:00', 20, 'scheduled', 'first_visit'),
  makeAppt('apt_24', 11, 'doc_05', 'Dra. Camila Souza', 'conv_01', 'Unimed', 'exam', d(5), '08:25', 20, 'scheduled', 'return', { examId: 'ex_01', examName: 'Hemograma Completo' }),
  makeAppt('apt_25', 13, 'doc_01', 'Dr. Henrique Lima', 'conv_03', 'Bradesco Saúde', 'consultation', d(5), '14:00', 30, 'scheduled', 'first_visit'),

  // Next week
  makeAppt('apt_26', 2, 'doc_01', 'Dr. Henrique Lima', 'conv_04', 'Particular', 'consultation', d(7), '08:00', 30, 'scheduled', 'return'),
  makeAppt('apt_27', 4, 'doc_03', 'Dr. Roberto Santos', 'conv_05', 'SUS', 'consultation', d(7), '09:00', 45, 'scheduled', 'return'),
  makeAppt('apt_28', 6, 'doc_04', 'Dra. Mariana Lopes', 'conv_01', 'Unimed', 'exam', d(8), '08:00', 30, 'scheduled', 'first_visit', { examId: 'ex_10', examName: 'Ultrassonografia Obstétrica' }),
  makeAppt('apt_29', 8, 'doc_02', 'Dr. Pedro Almeida', 'conv_01', 'Unimed', 'procedure', d(9), '07:00', 90, 'scheduled', 'return', { examId: 'ex_08', examName: 'Artroscopia de Joelho' }),
  makeAppt('apt_30', 10, 'doc_01', 'Dr. Henrique Lima', 'conv_02', 'Hapvida', 'consultation', d(10), '08:00', 30, 'scheduled', 'first_visit'),

  // Historical - last 4 weeks
  makeAppt('apt_31', 0, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(-3), '08:00', 30, 'completed', 'return'),
  makeAppt('apt_32', 0, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(-10), '08:00', 30, 'completed', 'return'),
  makeAppt('apt_33', 0, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'exam', d(-17), '09:00', 20, 'completed', 'return', { examId: 'ex_03', examName: 'Eletrocardiograma' }),
  makeAppt('apt_34', 0, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(-24), '08:00', 30, 'completed', 'first_visit'),
  makeAppt('apt_35', 0, 'doc_03', 'Dr. Roberto Santos', 'conv_01', 'Unimed', 'consultation', d(-7), '09:00', 45, 'completed', 'first_visit'),
  makeAppt('apt_36', 1, 'doc_04', 'Dra. Mariana Lopes', 'conv_02', 'Hapvida', 'consultation', d(-5), '08:00', 30, 'completed', 'return'),
  makeAppt('apt_37', 1, 'doc_04', 'Dra. Mariana Lopes', 'conv_02', 'Hapvida', 'consultation', d(-19), '08:00', 30, 'completed', 'first_visit'),
  makeAppt('apt_38', 2, 'doc_01', 'Dr. Henrique Lima', 'conv_04', 'Particular', 'consultation', d(-14), '09:20', 30, 'completed', 'first_visit'),
  makeAppt('apt_39', 3, 'doc_03', 'Dr. Roberto Santos', 'conv_01', 'Unimed', 'consultation', d(-8), '10:00', 45, 'absent', 'first_visit', { absentRegisteredAt: d(-8) }),
  makeAppt('apt_40', 5, 'doc_01', 'Dr. Henrique Lima', 'conv_06', 'Amil', 'consultation', d(-6), '08:40', 30, 'absent', 'first_visit', { absentRegisteredAt: d(-6) }),
  makeAppt('apt_41', 7, 'doc_04', 'Dra. Mariana Lopes', 'conv_06', 'Amil', 'exam', d(-4), '14:00', 30, 'completed', 'return', { examId: 'ex_10', examName: 'Ultrassonografia Obstétrica' }),
  makeAppt('apt_42', 9, 'doc_02', 'Dr. Pedro Almeida', 'conv_04', 'Particular', 'consultation', d(-11), '07:25', 20, 'absent', 'first_visit', { absentRegisteredAt: d(-11) }),
  makeAppt('apt_43', 11, 'doc_05', 'Dra. Camila Souza', 'conv_01', 'Unimed', 'consultation', d(-9), '08:00', 20, 'absent', 'first_visit', { absentRegisteredAt: d(-9) }),
  makeAppt('apt_44', 13, 'doc_03', 'Dr. Roberto Santos', 'conv_06', 'Amil', 'consultation', d(-13), '11:00', 45, 'cancelled', 'first_visit', { cancelledReason: 'Paciente solicitou cancelamento' }),
  makeAppt('apt_45', 14, 'doc_01', 'Dr. Henrique Lima', 'conv_02', 'Hapvida', 'consultation', d(-2), '14:00', 30, 'completed', 'return'),
  makeAppt('apt_46', 15, 'doc_01', 'Dr. Henrique Lima', 'conv_01', 'Unimed', 'consultation', d(-15), '08:00', 30, 'completed', 'first_visit'),
  makeAppt('apt_47', 16, 'doc_04', 'Dra. Mariana Lopes', 'conv_04', 'Particular', 'exam', d(-12), '08:00', 30, 'absent', 'first_visit', { examId: 'ex_10', examName: 'Ultrassonografia Obstétrica', absentRegisteredAt: d(-12) }),
  makeAppt('apt_48', 17, 'doc_05', 'Dra. Camila Souza', 'conv_04', 'Particular', 'consultation', d(-20), '14:00', 20, 'completed', 'first_visit'),
  makeAppt('apt_49', 18, 'doc_03', 'Dr. Roberto Santos', 'conv_05', 'SUS', 'consultation', d(-18), '09:00', 45, 'absent', 'first_visit', { absentRegisteredAt: d(-18) }),
  makeAppt('apt_50', 19, 'doc_04', 'Dra. Mariana Lopes', 'conv_06', 'Amil', 'consultation', d(-7), '14:00', 30, 'completed', 'return'),
]

export const MOCK_CONFIRMATIONS: ConfirmationDispatch[] = [
  { id: 'conf_01', appointmentId: 'apt_02', patientName: 'Ana Beatriz Oliveira', patientPhone1: '(84) 99902-2002', appointmentDate: today, appointmentTime: '08:40', doctorName: 'Dr. Henrique Lima', method: '24h', status: 'pending' },
  { id: 'conf_02', appointmentId: 'apt_05', patientName: 'Pedro Henrique Alves', patientPhone1: '(84) 99905-5005', appointmentDate: today, appointmentTime: '10:00', doctorName: 'Dr. Roberto Santos', method: '24h', status: 'pending' },
  { id: 'conf_03', appointmentId: 'apt_08', patientName: 'Isabela Cristina Freitas', patientPhone1: '(84) 99908-8008', appointmentDate: today, appointmentTime: '10:00', doctorName: 'Dr. Henrique Lima', method: '24h', status: 'sent', sentAt: d(-1) },
  { id: 'conf_04', appointmentId: 'apt_11', patientName: 'Antônio Carlos Ribeiro', patientPhone1: '(84) 99911-1011', patientPhone2: '(84) 3211-1011', appointmentDate: d(1), appointmentTime: '09:00', doctorName: 'Dr. Roberto Santos', method: '48h', status: 'pending' },
  { id: 'conf_05', appointmentId: 'apt_13', patientName: 'José Francisco Moreira', patientPhone1: '(84) 99913-3013', appointmentDate: d(1), appointmentTime: '08:00', doctorName: 'Dra. Mariana Lopes', method: '48h', status: 'sent', sentAt: d(-1) },
  { id: 'conf_06', appointmentId: 'apt_14', patientName: 'Camila Andrade Torres', patientPhone1: '(84) 99914-4014', appointmentDate: d(1), appointmentTime: '08:40', doctorName: 'Dr. Henrique Lima', method: '48h', status: 'pending' },
  { id: 'conf_07', appointmentId: 'apt_15', patientName: 'Thiago Nascimento Ramos', patientPhone1: '(84) 99915-5015', patientPhone2: '(84) 3215-5015', appointmentDate: d(1), appointmentTime: '10:00', doctorName: 'Dr. Roberto Santos', method: '48h', status: 'failed' },
  { id: 'conf_08', appointmentId: 'apt_01', patientName: 'João da Silva Santos', patientPhone1: '(84) 99901-1001', appointmentDate: today, appointmentTime: '08:00', doctorName: 'Dr. Henrique Lima', method: '24h', status: 'confirmed', sentAt: d(-1), confirmedAt: d(-1) },
  { id: 'conf_09', appointmentId: 'apt_04', patientName: 'Mariana Costa Lima', patientPhone1: '(84) 99904-4004', appointmentDate: today, appointmentTime: '09:00', doctorName: 'Dr. Roberto Santos', method: '24h', status: 'confirmed', sentAt: d(-1), confirmedAt: d(-1) },
  { id: 'conf_10', appointmentId: 'apt_12', patientName: 'Letícia Amaral Dias', patientPhone1: '(84) 99912-2012', appointmentDate: d(1), appointmentTime: '08:00', doctorName: 'Dr. Henrique Lima', method: '48h', status: 'confirmed', sentAt: d(-2), confirmedAt: d(-1) },
]

// Helper: check if patient is first visit with a doctor
export function isFirstVisit(patientId: string, doctorId: string): boolean {
  return !MOCK_APPOINTMENTS.some(a =>
    a.patientId === patientId && a.doctorId === doctorId &&
    (a.status === 'completed' || a.status === 'in_progress')
  )
}

// Helper: get last visit date with a doctor
export function getLastVisitDate(patientId: string, doctorId: string): string | null {
  const visits = MOCK_APPOINTMENTS
    .filter(a => a.patientId === patientId && a.doctorId === doctorId && (a.status === 'completed' || a.status === 'in_progress'))
    .sort((a, b) => b.date.localeCompare(a.date))
  return visits[0]?.date || null
}

// Helper: get patient history
export function getPatientHistory(patientId: string): SchedulingAppointment[] {
  return MOCK_APPOINTMENTS
    .filter(a => a.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
}

// Helper: get absentees for period
export function getAbsentees(startDate: string, endDate: string): SchedulingAppointment[] {
  return MOCK_APPOINTMENTS.filter(a =>
    a.status === 'absent' && a.date >= startDate && a.date <= endDate
  )
}
