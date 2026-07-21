import type { Doctor, Specialty, Convenio, Exam, Procedure } from '@/types/registers.types'

const DEMO_COMPANY_ID = 'comp_001'

export const DEMO_SPECIALTIES: Specialty[] = [
  { id: 'spec_01', name: 'Cardiologia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_02', name: 'Ortopedia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_03', name: 'Neurologia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_04', name: 'Ginecologia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_05', name: 'Clínica Geral', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_06', name: 'Dermatologia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_07', name: 'Endocrinologia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_08', name: 'Radiologia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
  { id: 'spec_09', name: 'Obstetrícia', companyId: DEMO_COMPANY_ID, isActive: true, createdAt: '2024-01-10' },
]

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: 'doc_01', companyId: DEMO_COMPANY_ID, fullName: 'Dr. Henrique Lima', crm: '654321', crmState: 'SP',
    specialtyIds: ['spec_01', 'spec_05'], phone: '(11) 97654-3210', email: 'henrique@clinicademo.com',
    enabledConvenioIds: ['conv_01', 'conv_02', 'conv_04', 'conv_06'], isActive: true, isBlocked: false,
    scheduleConfig: { consultationDuration: 30, intervalBetween: 10, workDays: [
      { day: 1, isActive: true, startTime: '08:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
      { day: 3, isActive: true, startTime: '08:00', endTime: '12:00' },
      { day: 5, isActive: true, startTime: '08:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    ]},
    createdAt: '2024-02-01', updatedAt: '2025-01-14',
  },
  {
    id: 'doc_02', companyId: DEMO_COMPANY_ID, fullName: 'Dr. Pedro Almeida', crm: '789012', crmState: 'SP',
    specialtyIds: ['spec_02'], phone: '(11) 95432-1098', email: 'pedro@clinicademo.com',
    enabledConvenioIds: ['conv_01', 'conv_03', 'conv_04'], isActive: true, isBlocked: false,
    scheduleConfig: { consultationDuration: 20, intervalBetween: 5, workDays: [
      { day: 2, isActive: true, startTime: '07:00', endTime: '13:00' },
      { day: 4, isActive: true, startTime: '07:00', endTime: '13:00' },
    ]},
    createdAt: '2024-03-01', updatedAt: '2025-01-10',
  },
  {
    id: 'doc_03', companyId: DEMO_COMPANY_ID, fullName: 'Dr. Roberto Santos', crm: '345678', crmState: 'SP',
    specialtyIds: ['spec_03'], phone: '(11) 92109-8765', email: 'roberto@clinicademo.com',
    enabledConvenioIds: ['conv_01', 'conv_02', 'conv_05', 'conv_06'], isActive: true, isBlocked: false,
    scheduleConfig: { consultationDuration: 45, intervalBetween: 15, workDays: [
      { day: 1, isActive: true, startTime: '09:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      { day: 2, isActive: true, startTime: '09:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      { day: 3, isActive: true, startTime: '09:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    ]},
    createdAt: '2024-04-15', updatedAt: '2025-01-10',
  },
  {
    id: 'doc_04', companyId: DEMO_COMPANY_ID, fullName: 'Dra. Mariana Lopes', crm: '111222', crmState: 'SP',
    specialtyIds: ['spec_04', 'spec_09'], phone: '(11) 84321-0987', email: 'mariana@clinicademo.com',
    enabledConvenioIds: ['conv_01', 'conv_02', 'conv_03', 'conv_04', 'conv_05', 'conv_06'], isActive: true, isBlocked: false,
    scheduleConfig: { consultationDuration: 30, intervalBetween: 10, workDays: [
      { day: 1, isActive: true, startTime: '08:00', endTime: '12:00' },
      { day: 2, isActive: true, startTime: '14:00', endTime: '18:00' },
      { day: 4, isActive: true, startTime: '08:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    ]},
    createdAt: '2024-08-15', updatedAt: '2025-01-10',
  },
  {
    id: 'doc_05', companyId: DEMO_COMPANY_ID, fullName: 'Dra. Camila Souza', crm: '123456', crmState: 'SP',
    specialtyIds: ['spec_05', 'spec_06'], phone: '(11) 98765-4321', email: 'camila@clinicademo.com',
    enabledConvenioIds: ['conv_01', 'conv_04'], isActive: true, isBlocked: false,
    scheduleConfig: { consultationDuration: 20, intervalBetween: 5, workDays: [
      { day: 3, isActive: true, startTime: '08:00', endTime: '12:00' },
      { day: 5, isActive: true, startTime: '14:00', endTime: '18:00' },
    ]},
    createdAt: '2024-01-15', updatedAt: '2025-01-10',
  },
]

export const DEMO_CONVENIOS: Convenio[] = [
  {
    id: 'conv_01', companyId: DEMO_COMPANY_ID, name: 'Unimed', ansCode: '302147', type: 'health_plan',
    cnpj: '01.234.567/0001-01', authPhone: '0800 123 4567', email: 'autorizacao@unimed.com.br', isActive: true,
    createdAt: '2024-01-10',
    attachmentRules: [
      { id: 'ar_01', convenioId: 'conv_01', attachmentName: 'Carteirinha do Convênio', isRequired: true, appliesToTypes: ['consulta', 'exame', 'procedimento'], order: 1, observations: 'Solicitar carteirinha física ou digital' },
      { id: 'ar_02', convenioId: 'conv_01', attachmentName: 'RG ou CPF', isRequired: true, appliesToTypes: ['consulta', 'exame', 'procedimento'], order: 2 },
      { id: 'ar_03', convenioId: 'conv_01', attachmentName: 'Pedido Médico', isRequired: true, appliesToTypes: ['exame', 'procedimento'], order: 3 },
      { id: 'ar_04', convenioId: 'conv_01', attachmentName: 'Guia SADT', isRequired: true, appliesToTypes: ['exame'], order: 4 },
      { id: 'ar_05', convenioId: 'conv_01', attachmentName: 'Encaminhamento médico', isRequired: false, appliesToTypes: ['consulta'], order: 5 },
    ],
  },
  { id: 'conv_02', companyId: DEMO_COMPANY_ID, name: 'Hapvida', ansCode: '368253', type: 'health_plan', cnpj: '12.345.678/0001-02', authPhone: '0800 234 5678', isActive: true, createdAt: '2024-01-10', attachmentRules: [] },
  { id: 'conv_03', companyId: DEMO_COMPANY_ID, name: 'Bradesco Saúde', ansCode: '005711', type: 'health_plan', cnpj: '23.456.789/0001-03', authPhone: '0800 345 6789', isActive: true, createdAt: '2024-01-10', attachmentRules: [] },
  { id: 'conv_04', companyId: DEMO_COMPANY_ID, name: 'Particular', type: 'private', isActive: true, createdAt: '2024-01-10', attachmentRules: [], observations: 'Pagamento direto no ato da consulta' },
  { id: 'conv_05', companyId: DEMO_COMPANY_ID, name: 'SUS', ansCode: '000000', type: 'sus', isActive: true, createdAt: '2024-01-10', attachmentRules: [] },
  { id: 'conv_06', companyId: DEMO_COMPANY_ID, name: 'Amil', ansCode: '326305', type: 'health_plan', cnpj: '34.567.890/0001-04', authPhone: '0800 456 7890', isActive: true, createdAt: '2024-01-10', attachmentRules: [] },
]

export const DEMO_EXAMS: Exam[] = [
  { id: 'ex_01', companyId: DEMO_COMPANY_ID, name: 'Hemograma Completo', type: 'lab', tussCode: '40301010', specialtyId: 'spec_05', estimatedDurationMinutes: 15, preparationInstructions: 'Jejum de 8 horas', resultDeadlineDays: 1, requiresAuthorization: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_02', companyId: DEMO_COMPANY_ID, name: 'Glicemia de Jejum', type: 'lab', tussCode: '40302040', specialtyId: 'spec_07', estimatedDurationMinutes: 10, preparationInstructions: 'Jejum de 8 a 12 horas', resultDeadlineDays: 1, requiresAuthorization: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_03', companyId: DEMO_COMPANY_ID, name: 'Eletrocardiograma', type: 'clinical', tussCode: '40808010', specialtyId: 'spec_01', estimatedDurationMinutes: 20, resultDeadlineDays: 0, requiresAuthorization: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_04', companyId: DEMO_COMPANY_ID, name: 'Raio-X de Tórax', type: 'clinical', tussCode: '40901017', specialtyId: 'spec_08', estimatedDurationMinutes: 15, preparationInstructions: 'Remover objetos metálicos', resultDeadlineDays: 2, requiresAuthorization: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_05', companyId: DEMO_COMPANY_ID, name: 'Tomografia Computadorizada', type: 'clinical', tussCode: '40901050', specialtyId: 'spec_08', estimatedDurationMinutes: 45, preparationInstructions: 'Jejum de 4 horas. Informar alergias ao contraste', resultDeadlineDays: 3, requiresAuthorization: true, authorizationInstructions: 'Solicitar autorização prévia ao convênio com laudo médico', attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_06', companyId: DEMO_COMPANY_ID, name: 'Ressonância Magnética', type: 'clinical', tussCode: '40901068', specialtyId: 'spec_03', estimatedDurationMinutes: 60, preparationInstructions: 'Remover objetos metálicos. Informar implantes', resultDeadlineDays: 5, requiresAuthorization: true, authorizationInstructions: 'Necessita autorização prévia com justificativa clínica', attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_07', companyId: DEMO_COMPANY_ID, name: 'TSH e T4 Livre', type: 'lab', tussCode: '40302300', specialtyId: 'spec_07', estimatedDurationMinutes: 10, resultDeadlineDays: 2, requiresAuthorization: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'ex_08', companyId: DEMO_COMPANY_ID, name: 'Ultrassonografia Obstétrica', type: 'clinical', tussCode: '40304361', specialtyId: 'spec_04', estimatedDurationMinutes: 30, preparationInstructions: 'Bexiga cheia', resultDeadlineDays: 1, requiresAuthorization: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
]

export const DEMO_PROCEDURES: Procedure[] = [
  { id: 'proc_01', companyId: DEMO_COMPANY_ID, name: 'Artroscopia de Joelho', tussCode: '31003060', type: 'surgical', specialtyId: 'spec_02', estimatedDurationMinutes: 90, requiresAuthorization: true, authorizationInstructions: 'Solicitar autorização ao convênio com relatório médico e exames de imagem', requiresAnesthesia: true, anesthesiaType: 'Raqui', preOperativeInstructions: 'Jejum de 8 horas. Exames pré-operatórios atualizados', postOperativeInstructions: 'Repouso por 48h, gelo local, elevação do membro', attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'proc_02', companyId: DEMO_COMPANY_ID, name: 'Biópsia de Pele', tussCode: '30901033', type: 'diagnostic', specialtyId: 'spec_06', estimatedDurationMinutes: 30, requiresAuthorization: false, requiresAnesthesia: true, anesthesiaType: 'Local', preOperativeInstructions: 'Suspender anticoagulantes 5 dias antes', attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'proc_03', companyId: DEMO_COMPANY_ID, name: 'Fisioterapia Respiratória', tussCode: '50000470', type: 'therapeutic', specialtyId: undefined, estimatedDurationMinutes: 40, requiresAuthorization: false, requiresAnesthesia: false, attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
  { id: 'proc_04', companyId: DEMO_COMPANY_ID, name: 'Cauterização de Verrugas', tussCode: '30901017', type: 'clinical', specialtyId: 'spec_06', estimatedDurationMinutes: 20, requiresAuthorization: false, requiresAnesthesia: true, anesthesiaType: 'Local', attachmentRules: [], isActive: true, createdAt: '2024-01-10' },
]

// Helper to check if a companyId is the demo company
export function isDemoCompany(companyId?: string | null): boolean {
  return companyId === DEMO_COMPANY_ID || companyId === 'comp_demo'
}
