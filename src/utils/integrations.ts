// Cross-module integration functions
// These centralize the logic for events that span multiple modules

export function onAppointmentConfirmed(): void {
  // In a real app: add QueueEntry to useQueue + notify reception
  console.log('[Integration] Appointment confirmed → queue updated')
}

export function onCheckinCompleted(): void {
  // In a real app: update queue status + notify doctor
  console.log('[Integration] Check-in completed → doctor notified')
}

export function onAttendanceFinished(): void {
  // In a real app: create draft Guide in billing + notify billing
  console.log('[Integration] Attendance finished → draft guide created')
}

export function onGuideReturnedToReception(): void {
  // In a real app: create correction item + notify reception
  console.log('[Integration] Guide returned → reception notified')
}

export function onResultAvailable(): void {
  // In a real app: notify reception for delivery
  console.log('[Integration] Result available → reception notified')
}

export function onAttendanceCompleted(): void {
  // In a real app: update BI aggregates
  console.log('[Integration] Attendance completed → BI updated')
}
