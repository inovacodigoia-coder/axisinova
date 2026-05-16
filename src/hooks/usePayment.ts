import { useCallback, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { addPayment, nextReceiptNumber } from '@/mocks/payment-print.mock'
import type { PaymentRecord } from '@/types/payment-print.types'

export function usePayment() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const registerPayment = useCallback((data: Omit<PaymentRecord, 'id' | 'receiptNumber' | 'companyId' | 'receivedBy' | 'receivedByName' | 'status' | 'paidAt'>): PaymentRecord => {
    setLoading(true)
    const record: PaymentRecord = {
      ...data,
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyId: user?.companyId || 'comp_001',
      receivedBy: user?.id || 'user_unknown',
      receivedByName: user?.name,
      receiptNumber: nextReceiptNumber(),
      status: 'paid',
      paidAt: new Date().toISOString(),
    }
    addPayment(record)
    setLoading(false)
    return record
  }, [user])

  return { registerPayment, loading }
}
