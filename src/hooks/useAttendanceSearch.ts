import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMockOrders } from '@/mocks/attendance-cadastro.mock'
import type { Patient } from '@/types/patient.types'
import type { AttendanceSearchResult } from '@/types/attendance-cadastro.types'

function onlyDigits(s: string) { return s.replace(/\D/g, '') }

export function useAttendanceSearch(query: string, patients: Patient[]): AttendanceSearchResult[] {
  const { user } = useAuth()
  const companyId = user?.companyId || 'comp_001'

  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const qDigits = onlyDigits(q)
    const orders = getMockOrders(companyId)
    const results: AttendanceSearchResult[] = []

    // Pedido por número
    if (q.match(/^atd/i) || q.match(/^[a-z]{3}-/i)) {
      orders
        .filter(o => o.orderNumber.toLowerCase().includes(q))
        .slice(0, 10)
        .forEach(order => results.push({ type: 'order', order }))
    }

    // Pacientes
    patients
      .filter(p => {
        const cpfDigits = onlyDigits(p.cpf || '')
        const phoneDigits = onlyDigits(p.phone1 || '')
        return (
          p.fullName.toLowerCase().includes(q) ||
          (qDigits.length >= 3 && (cpfDigits.includes(qDigits) || phoneDigits.includes(qDigits))) ||
          (p.motherName || '').toLowerCase().includes(q)
        )
      })
      .slice(0, 10)
      .forEach(patient => results.push({ type: 'patient', patient }))

    return results
  }, [query, companyId, patients])
}
