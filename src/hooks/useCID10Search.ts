import { useMemo } from 'react'
import { MOCK_CID10 } from '@/mocks/medical.mock'

const normalizeString = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function useCID10Search(term: string) {
  return useMemo(() => {
    if (!term || term.length < 2) return []
    const normalized = normalizeString(term)
    return MOCK_CID10.filter(cid =>
      cid.code.toLowerCase().startsWith(normalized) ||
      normalizeString(cid.description).includes(normalized)
    ).slice(0, 8)
  }, [term])
}
