// Cross-module integration functions
// These centralize the logic for events that span multiple modules

import type { SystemEvent } from '@/hooks/useSystemEvents'

/**
 * Creates an event payload when an appointment is confirmed.
 * Usage: publish(onAppointmentConfirmedEvent(patientName, doctorName, date, time))
 */
export function onAppointmentConfirmedEvent(patientName: string, doctorName: string, date: string, time: string): SystemEvent {
  return { type: 'APPOINTMENT_CREATED', patientName, doctorName, date, time }
}

/**
 * Creates an event payload when patient checks in.
 */
export function onCheckinCompletedEvent(patientName: string, ticketCode: string): SystemEvent {
  return { type: 'PATIENT_CHECKED_IN', patientName, ticketCode }
}

/**
 * Creates an event payload when attendance is finished.
 */
export function onAttendanceFinishedEvent(patientName: string, doctorName: string): SystemEvent {
  return { type: 'ATTENDANCE_FINISHED', patientName, doctorName }
}

/**
 * Creates an event payload when a guide is returned to reception.
 */
export function onGuideReturnedEvent(patientName: string, reason: string, guideId: string): SystemEvent {
  return { type: 'GUIDE_RETURNED_TO_RECEPTION', patientName, reason, guideId }
}

/**
 * Creates an event payload when a result is available.
 */
export function onResultAvailableEvent(patientName: string, examName: string, resultId: string): SystemEvent {
  return { type: 'RESULT_AVAILABLE', patientName, examName, resultId }
}

/**
 * Creates an event payload when a guide is corrected.
 */
export function onGuideCorrectedEvent(patientName: string, tissNumber: string, guideId: string): SystemEvent {
  return { type: 'GUIDE_CORRECTED', patientName, tissNumber, guideId }
}

/**
 * Creates an event payload when a glosa is identified.
 */
export function onGlosaIdentifiedEvent(patientName: string, convenioName: string, value: number, glosaId: string): SystemEvent {
  return { type: 'GLOSA_IDENTIFIED', patientName, convenioName, value, glosaId }
}

// Legacy compatibility stubs
export function onAppointmentConfirmed(): void {
  console.log('[Integration] Appointment confirmed → queue updated')
}

export function onCheckinCompleted(): void {
  console.log('[Integration] Check-in completed → doctor notified')
}

export function onAttendanceFinished(): void {
  console.log('[Integration] Attendance finished → draft guide created')
}

export function onGuideReturnedToReception(): void {
  console.log('[Integration] Guide returned → reception notified')
}

export function onResultAvailable(): void {
  console.log('[Integration] Result available → reception notified')
}

export function onAttendanceCompleted(): void {
  console.log('[Integration] Attendance completed → BI updated')
}
