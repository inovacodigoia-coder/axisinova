import { useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { DEMO_PATIENTS } from '@/mocks/registers.mock'
import { getMockOrders } from '@/mocks/attendance-cadastro.mock'
import type { Patient } from '@/types/patient.types'
import type { AttendanceSearchResult } from '@/types/attendance-cadastro.types'

function onlyDigits(s: string) { return s.replace(/\D/g, '') }

export function useAttendanceSearch(query: string): AttendanceSearchResult[] {
  const { user } = useAuth()
  const companyId = user?.companyId || 'comp_001'

  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const qDigits = onlyDigits(q)
    const patients = (DEMO_PATIENTS as Patient[] | undefined) || []
    const orders = getMockOrders(companyId)

    const results: AttendanceSearchResult[] = []

    // Buscar por número de pedido
    if (q.startsWith('atd') || q.match(/^[a-z]{3}-/i)) {
      orders
        .filter(o => o.orderNumber.toLowerCase().includes(q))
        .slice(0, 10)
        .forEach(order => results.push({ type: 'order', order }))
    }

    // Buscar pacientes
    patients
      .filter(p => {
        const cpfDigits = onlyDigits(p.cpf || '')
        return (
          p.fullName.toLowerCase().includes(q) ||
          (qDigits && cpfDigits.includes(qDigits)) ||
          (p.motherName || '').toLowerCase().includes(q) ||
          (p.phone1 && onlyDigits(p.phone1).includes(qDigits))
        )
      })
      .slice(0, 10)
      .forEach(patient => results.push({ type: 'patient', patient }))

    return results
  }, [query, companyId])
}
