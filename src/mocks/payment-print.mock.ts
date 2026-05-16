import type { PaymentRecord, PrinterConfig } from '@/types/payment-print.types'

const STORAGE_KEY_PAYMENTS = 'mock_payments_v1'
const STORAGE_KEY_PRINTERS = 'mock_printers_v1'
const STORAGE_KEY_RECEIPT_SEQ = 'mock_receipt_seq_v1'

export const defaultPrinterConfig: PrinterConfig = {
  id: 'printer_001',
  companyId: 'comp_001',
  printerName: 'Impressora Padrão',
  printerType: 'laser',
  connectionType: 'virtual',
  paperSize: 'a5',
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
}

function loadJSON<T>(key: string, fallback: T): T {
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
}
function saveJSON(key: string, data: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export function getPrinters(companyId: string): PrinterConfig[] {
  const all = loadJSON<PrinterConfig[]>(STORAGE_KEY_PRINTERS, [defaultPrinterConfig])
  return all.filter(p => p.companyId === companyId)
}
export function savePrinter(p: PrinterConfig) {
  const all = loadJSON<PrinterConfig[]>(STORAGE_KEY_PRINTERS, [defaultPrinterConfig])
  const idx = all.findIndex(x => x.id === p.id)
  if (p.isDefault) all.forEach(x => { if (x.companyId === p.companyId) x.isDefault = false })
  if (idx >= 0) all[idx] = p; else all.push(p)
  saveJSON(STORAGE_KEY_PRINTERS, all)
}
export function removePrinter(id: string) {
  const all = loadJSON<PrinterConfig[]>(STORAGE_KEY_PRINTERS, [defaultPrinterConfig])
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
