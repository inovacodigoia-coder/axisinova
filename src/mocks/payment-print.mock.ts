import type { PaymentRecord, PrinterConfig } from '@/types/payment-print.types'

const STORAGE_KEY_PAYMENTS = 'mock_payments_v1'
const STORAGE_KEY_PRINTERS = 'mock_printers_v1'
const STORAGE_KEY_RECEIPT_SEQ = 'mock_receipt_seq_v1'

export const defaultPrinterConfig: PrinterConfig = {
  id: 'printer_001',
  companyId: 'comp_001',
  printerName: 'Impressora Padrão (Multifuncional)',
  printerType: 'laser',
  connectionType: 'virtual',
  paperSize: 'a4',
  orientation: 'portrait',
  marginTop: 10, marginBottom: 10, marginLeft: 10, marginRight: 10,
  showLogo: true, showCompanyName: true, showUnitName: true,
  showAddress: true, showPhone: true, showCNPJ: true,
  showQRCode: true, showBarcode: false,
  showDoctorInfo: true, showConvenioInfo: true, showAuthorizationInfo: true,
  showAttachmentChecklist: true, showObservations: true,
  footerText: 'Guarde este comprovante. Ele é necessário para retirada de resultados.',
  showSignatureLine: true, showTimestamp: true,
  defaultCopies: 2, autoPrintOnFinalize: false,
  isDefault: true, isActive: true,
  createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00',
  areas: [
    { area: 'comprovante', defaultFormat: 'a4', autoPrint: true, enabled: true },
    { area: 'controle_interno', defaultFormat: 'a4', autoPrint: true, enabled: true },
    { area: 'termo_consentimento', defaultFormat: 'a4', autoPrint: true, enabled: true },
    { area: 'laudo', defaultFormat: 'a4', autoPrint: false, enabled: true },
    { area: 'etiqueta_amostra', defaultFormat: 'label', autoPrint: true, enabled: true }
  ]
}

export const thermalPrinterConfig: PrinterConfig = {
  id: 'printer_002',
  companyId: 'comp_001',
  printerName: 'Impressora Térmica 80mm',
  printerType: 'thermal',
  connectionType: 'usb',
  paperSize: '80mm',
  orientation: 'portrait',
  marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  showLogo: true, showCompanyName: true, showUnitName: true,
  showAddress: false, showPhone: true, showCNPJ: true,
  showQRCode: true, showBarcode: true,
  showDoctorInfo: true, showConvenioInfo: true, showAuthorizationInfo: true,
  showAttachmentChecklist: false, showObservations: true,
  footerText: 'Comprovante não fiscal.',
  showSignatureLine: false, showTimestamp: true,
  defaultCopies: 1, autoPrintOnFinalize: true,
  isDefault: false, isActive: true,
  createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00',
  areas: [
    { area: 'comprovante', defaultFormat: '80mm', autoPrint: true, enabled: true },
    { area: 'controle_interno', defaultFormat: '80mm', autoPrint: true, enabled: true }
  ]
}

export const labelPrinterConfig: PrinterConfig = {
  id: 'printer_003',
  companyId: 'comp_001',
  printerName: 'Impressora de Etiquetas',
  printerType: 'thermal',
  connectionType: 'label',
  paperSize: 'label',
  orientation: 'portrait',
  marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  showLogo: false, showCompanyName: false, showUnitName: false,
  showAddress: false, showPhone: false, showCNPJ: false,
  showQRCode: false, showBarcode: true,
  showDoctorInfo: false, showConvenioInfo: false, showAuthorizationInfo: false,
  showAttachmentChecklist: false, showObservations: false,
  footerText: '',
  showSignatureLine: false, showTimestamp: true,
  defaultCopies: 1, autoPrintOnFinalize: true,
  isDefault: false, isActive: true,
  createdAt: '2025-01-01T00:00:00', updatedAt: '2025-01-01T00:00:00',
  areas: [
    { area: 'etiqueta_amostra', defaultFormat: 'label', autoPrint: true, enabled: true }
  ]
}

const DEFAULT_PRINTERS_LIST = [defaultPrinterConfig, thermalPrinterConfig, labelPrinterConfig]

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) {
      // Seed on first read if it's the printers key
      if (key === STORAGE_KEY_PRINTERS) {
        sessionStorage.setItem(key, JSON.stringify(fallback))
      }
      return fallback
    }
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function saveJSON(key: string, data: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

export function getPrinters(companyId: string): PrinterConfig[] {
  // Map companyId to defaults if we need to
  const defaults = DEFAULT_PRINTERS_LIST.map(p => ({ ...p, companyId }))
  const all = loadJSON<PrinterConfig[]>(STORAGE_KEY_PRINTERS, defaults)
  
  const companyPrinters = all.filter(p => p.companyId === companyId)
  if (companyPrinters.length === 0) {
    // If we have nothing for this company specifically, add defaults for it
    const updated = [...all, ...defaults]
    saveJSON(STORAGE_KEY_PRINTERS, updated)
    return defaults
  }
  return companyPrinters
}

export function savePrinter(p: PrinterConfig) {
  const all = loadJSON<PrinterConfig[]>(STORAGE_KEY_PRINTERS, DEFAULT_PRINTERS_LIST)
  const idx = all.findIndex(x => x.id === p.id)
  if (p.isDefault) {
    all.forEach(x => {
      if (x.companyId === p.companyId) x.isDefault = false
    })
  }
  if (idx >= 0) {
    all[idx] = p
  } else {
    all.push(p)
  }
  saveJSON(STORAGE_KEY_PRINTERS, all)
}

export function removePrinter(id: string) {
  const all = loadJSON<PrinterConfig[]>(STORAGE_KEY_PRINTERS, DEFAULT_PRINTERS_LIST)
  saveJSON(STORAGE_KEY_PRINTERS, all.filter(x => x.id !== id))
}

export function getDefaultPrinter(companyId: string): PrinterConfig {
  const list = getPrinters(companyId)
  return list.find(p => p.isDefault && p.isActive) || list[0] || defaultPrinterConfig
}

export function getPayments(companyId: string): PaymentRecord[] {
  return loadJSON<PaymentRecord[]>(STORAGE_KEY_PAYMENTS, []).filter(p => p.companyId === companyId)
}

export function addPayment(p: PaymentRecord) {
  const all = loadJSON<PaymentRecord[]>(STORAGE_KEY_PAYMENTS, [])
  all.push(p)
  saveJSON(STORAGE_KEY_PAYMENTS, all)
}

export function getPaymentByOrder(orderId: string): PaymentRecord | undefined {
  return loadJSON<PaymentRecord[]>(STORAGE_KEY_PAYMENTS, []).find(p => p.orderId === orderId)
}

export function nextReceiptNumber(): string {
  const seq = (parseInt(sessionStorage.getItem(STORAGE_KEY_RECEIPT_SEQ) || '88', 10)) + 1
  sessionStorage.setItem(STORAGE_KEY_RECEIPT_SEQ, String(seq))
  return `REC-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`
}
