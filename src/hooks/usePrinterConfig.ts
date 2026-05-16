import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { defaultPrinterConfig, getDefaultPrinter, getPrinters, removePrinter, savePrinter } from '@/mocks/payment-print.mock'
import type { PrinterConfig } from '@/types/payment-print.types'

export function usePrinterConfig() {
  const { user } = useAuth()
  const companyId = user?.companyId || 'comp_001'
  const [printers, setPrinters] = useState<PrinterConfig[]>([])

  const refresh = useCallback(() => setPrinters(getPrinters(companyId)), [companyId])
  useEffect(() => { refresh() }, [refresh])

  const save = useCallback((p: PrinterConfig) => { savePrinter({ ...p, companyId, updatedAt: new Date().toISOString() }); refresh() }, [companyId, refresh])
  const remove = useCallback((id: string) => { removePrinter(id); refresh() }, [refresh])
  const getDefault = useCallback(() => getDefaultPrinter(companyId), [companyId])

  const blank = useCallback((): PrinterConfig => ({
    ...defaultPrinterConfig,
    id: `printer_${Date.now()}`,
    companyId,
    printerName: '',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }), [companyId])

  return { printers, save, remove, refresh, getDefault, blank }
}
