export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'bank_transfer' | 'check'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded'

export interface PaymentRecord {
  id: string
  orderId: string
  patientId: string
  patientName: string
  companyId: string
  grossValue: number
  discountType: 'percent' | 'fixed' | 'none'
  discountValue: number
  discountReason?: string
  netValue: number
  paidValue?: number
  changeValue?: number
  method: PaymentMethod
  installments?: number
  pixKey?: string
  pixQRCode?: string
  cardLastDigits?: string
  authorizationCode?: string
  bankName?: string
  documentNumber?: string
  status: PaymentStatus
  paidAt?: string
  receivedBy: string
  receivedByName?: string
  receiptNumber: string
  notes?: string
}

export interface PrinterConfig {
  id: string
  companyId: string
  unitId?: string
  printerName: string
  printerType: 'thermal' | 'laser' | 'inkjet' | 'virtual_pdf'
  connectionType: 'usb' | 'network' | 'bluetooth' | 'virtual' | 'label'
  ipAddress?: string
  port?: number
  paperSize: 'a4' | 'a5' | '80mm' | '58mm' | 'label'
  
  // Per-area overrides
  areas?: Array<{
    area: 'laudo' | 'comprovante' | 'controle_interno' | 'termo_consentimento' | 'etiqueta_amostra'
    defaultFormat: 'a4' | 'a5' | '80mm' | '58mm' | 'label'
    autoPrint: boolean
    enabled: boolean
  }>

  orientation: 'portrait' | 'landscape'
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  showLogo: boolean
  showCompanyName: boolean
  showUnitName: boolean
  showAddress: boolean
  showPhone: boolean
  showCNPJ: boolean
  showQRCode: boolean
  showBarcode: boolean
  showDoctorInfo: boolean
  showConvenioInfo: boolean
  showAuthorizationInfo: boolean
  showAttachmentChecklist: boolean
  showObservations: boolean
  footerText?: string
  showSignatureLine: boolean
  showTimestamp: boolean
  defaultCopies: number
  autoPrintOnFinalize: boolean
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AttendanceControlDocument {
  orderNumber: string
  orderDate: string
  orderTime: string
  patientId: string
  patientName: string
  patientBirthDate?: string
  patientAge?: string
  patientGender?: string
  patientCPF?: string
  patientPhone?: string
  motherName?: string
  serviceType: string
  exams: Array<{
    name: string
    code: string
    forecastDate: string
    doctorName?: string
    doctorCRM?: string
  }>
  unitName: string
  guicheName?: string
  ticketCode?: string
  paymentType: string
  convenioName?: string
  cardNumber?: string
  authorizationCode?: string
  authorizationExpiry?: string
  paymentMethod?: string
  paidValue?: number
  receiptNumber?: string
  attachments: { name: string; type: string }[]
  observations?: string
  registeredByName?: string
  companyName: string
  companyAddress?: string
  companyCNPJ?: string
  companyPhone?: string
  companyLogo?: string
  locatorCode?: string
  password?: string
  passwordKind?: 'random' | 'cpf' | 'personal'
  portalUrl?: string
  doctorName?: string
  doctorCRM?: string
  specialty?: string
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência',
  check: 'Cheque',
}
