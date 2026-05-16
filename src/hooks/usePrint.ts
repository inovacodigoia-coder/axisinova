import { useCallback } from 'react'
import { usePrinterConfig } from './usePrinterConfig'

export function usePrint() {
  const { getDefault } = usePrinterConfig()

  const printNow = useCallback(() => {
    // Triggers the browser print dialog. @media print CSS handles layout.
    window.print()
  }, [])

  return { printNow, getPrinterConfig: getDefault }
}
