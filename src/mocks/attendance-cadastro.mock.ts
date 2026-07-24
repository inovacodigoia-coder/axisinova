import type { AttendanceOrder } from '@/types/attendance-cadastro.types'

const DEMO_COMPANY_ID = 'comp_001'

// Catálogo de procedimentos/exames/consultas — vinculados aos médicos cadastrados
export interface CatalogProcedure {
  id: string
  type: 'consultation' | 'exam' | 'procedure'
  name: string
  tussCode: string
  price?: number
  specialtyId?: string
  doctorIds: string[]
  durationMinutes?: number
  prepInstructions?: string
  resultDays?: number
  requiresAuthorization: boolean
}

export const DEMO_CATALOG: CatalogProcedure[] = [
  // Consultas
  { id: 'cat_c1', type: 'consultation', name: 'Consulta Cardiológica', tussCode: '10101012', price: 250, specialtyId: 'spec_01', doctorIds: ['doc_01'], durationMinutes: 30, requiresAuthorization: false },
  { id: 'cat_c2', type: 'consultation', name: 'Consulta Clínica Geral', tussCode: '10101039', price: 180, specialtyId: 'spec_05', doctorIds: ['doc_01', 'doc_05'], durationMinutes: 20, requiresAuthorization: false },
  { id: 'cat_c3', type: 'consultation', name: 'Consulta Dermatológica', tussCode: '10101020', price: 220, specialtyId: 'spec_06', doctorIds: ['doc_05'], durationMinutes: 20, requiresAuthorization: false },
  { id: 'cat_c4', type: 'consultation', name: 'Consulta Ortopédica', tussCode: '10101055', price: 250, specialtyId: 'spec_02', doctorIds: ['doc_02'], durationMinutes: 20, requiresAuthorization: false },
  { id: 'cat_c5', type: 'consultation', name: 'Consulta Ginecológica', tussCode: '10101047', price: 240, specialtyId: 'spec_04', doctorIds: ['doc_04'], durationMinutes: 30, requiresAuthorization: false },
  // Exames
  { id: 'cat_e1', type: 'exam', name: 'Hemograma Completo', tussCode: '40301329', price: 35, specialtyId: 'spec_05', doctorIds: ['doc_01', 'doc_05'], durationMinutes: 10, prepInstructions: 'Jejum de 8 horas', resultDays: 1, requiresAuthorization: true },
  { id: 'cat_e2', type: 'exam', name: 'Glicemia em Jejum', tussCode: '40301257', price: 20, doctorIds: ['doc_01', 'doc_05'], durationMinutes: 10, prepInstructions: 'Jejum de 8 horas', resultDays: 1, requiresAuthorization: true },
  { id: 'cat_e3', type: 'exam', name: 'Eletrocardiograma (ECG)', tussCode: '40901408', price: 120, specialtyId: 'spec_01', doctorIds: ['doc_01'], durationMinutes: 20, resultDays: 1, requiresAuthorization: true },
  { id: 'cat_e4', type: 'exam', name: 'Raio-X de Tórax', tussCode: '40803033', price: 90, specialtyId: 'spec_08', doctorIds: [], durationMinutes: 15, resultDays: 2, requiresAuthorization: true },
  { id: 'cat_e5', type: 'exam', name: 'Ultrassonografia Abdominal', tussCode: '40901041', price: 180, specialtyId: 'spec_08', doctorIds: [], durationMinutes: 30, prepInstructions: 'Jejum de 6 horas', resultDays: 2, requiresAuthorization: true },
  { id: 'cat_e6', type: 'exam', name: 'Tomografia Computadorizada', tussCode: '40901505', price: 850, specialtyId: 'spec_08', doctorIds: [], durationMinutes: 45, resultDays: 3, requiresAuthorization: true },
  { id: 'cat_e7', type: 'exam', name: 'Ressonância Magnética', tussCode: '40901602', price: 1200, specialtyId: 'spec_08', doctorIds: [], durationMinutes: 60, resultDays: 5, requiresAuthorization: true },
  { id: 'cat_e8', type: 'exam', name: 'Ecocardiograma', tussCode: '40901300', price: 350, specialtyId: 'spec_01', doctorIds: ['doc_01'], durationMinutes: 40, resultDays: 2, requiresAuthorization: true },
  // Procedimentos
  { id: 'cat_p1', type: 'procedure', name: 'Curativo Simples', tussCode: '40201058', price: 50, doctorIds: ['doc_01', 'doc_05'], durationMinutes: 15, requiresAuthorization: false },
  { id: 'cat_p2', type: 'procedure', name: 'Aplicação de Injeção IM', tussCode: '40201090', price: 35, doctorIds: ['doc_01', 'doc_05'], durationMinutes: 10, requiresAuthorization: false },
  { id: 'cat_p3', type: 'procedure', name: 'Coleta de Material', tussCode: '40201112', price: 25, doctorIds: ['doc_01', 'doc_05'], durationMinutes: 10, requiresAuthorization: true },
  { id: 'cat_p4', type: 'procedure', name: 'Infiltração Articular', tussCode: '30714119', price: 280, specialtyId: 'spec_02', doctorIds: ['doc_02'], durationMinutes: 30, requiresAuthorization: true },
]

// Estado mutável em memória
let _orderSequence = 5
let _mockOrders: AttendanceOrder[] = []

export function getMockOrders(companyId: string): AttendanceOrder[] {
  return _mockOrders.filter(o => o.companyId === companyId)
}

export function addMockOrder(order: AttendanceOrder) {
  _mockOrders = [..._mockOrders, order]
}

export function updateMockOrder(orderId: string, patch: Partial<AttendanceOrder>) {
  _mockOrders = _mockOrders.map(o => o.id === orderId ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o)
}

export function nextOrderNumber(companyId: string): string {
  _orderSequence += 1
  const year = new Date().getFullYear()
  return `ATD-${year}-${String(_orderSequence).padStart(6, '0')}`
}

export const DOCUMENT_TYPES = [
  'Carteirinha do Convênio',
  'RG ou CPF',
  'Pedido Médico',
  'Guia de Autorização',
  'Guia SADT',
  'Laudo Médico',
  'Receita Médica',
  'Outros',
] as const
