import { useMemo } from 'react'
import { useQueue } from '@/context/QueueContext'

export function useDoctorQueue(doctorId: string | undefined, companyId: string | undefined) {
  const { state } = useQueue()

  const doctorQueue = useMemo(() => {
    if (!doctorId || !companyId) return []
    return state.entries.filter(e =>
      e.doctorId === doctorId &&
      !['completed', 'absent', 'cancelled'].includes(e.status)
    ).sort((a, b) => {
      if (a.isPreferential && !b.isPreferential) return -1
      if (!a.isPreferential && b.isPreferential) return 1
      return b.waitingMinutes - a.waitingMinutes
    })
  }, [state.entries, doctorId, companyId])

  const currentPatient = doctorQueue.find(e => e.status === 'in_progress') ?? null
  const nextPatient = doctorQueue.find(e =>
    ['documents_ok', 'called_doctor', 'waiting', 'in_reception'].includes(e.status)
  ) ?? null
  const waitingCount = doctorQueue.filter(e =>
    ['waiting', 'documents_ok', 'in_reception'].includes(e.status)
  ).length

  return { doctorQueue, currentPatient, nextPatient, waitingCount }
}
