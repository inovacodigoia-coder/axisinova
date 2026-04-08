import type { Unit, QueueLine, Guiche, Totem, TV, Ticket, QueueBIData } from '@/types/queue-system.types'

const today = new Date().toISOString().slice(0, 10)
const ts = (h: number, m: number) => `${today}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`

export const MOCK_UNITS: Unit[] = [
  { id: 'unit_1', name: 'Alecrim', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_2', name: 'Ayrton Senna', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_3', name: 'Caicó2', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_4', name: 'Canguaretama', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_5', name: 'Cecan', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_6', name: 'Esperança', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_7', name: 'FAMED', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_8', name: 'Lagoa Nova', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_9', name: 'Macaíba', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_10', name: 'Major Laurentino', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_11', name: 'Matriz', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
  { id: 'unit_12', name: 'Neópolis', companyId: 'comp_001', isActive: true, createdAt: '2024-01-01T00:00:00' },
]

export const MOCK_QUEUE_LINES: QueueLine[] = [
  // Major Laurentino - External
  { id: 'ql_1', unitId: 'unit_10', name: 'Atendimento Laboratório (A) - Externo', prefix: 'A', type: 'external', category: 'attendance', isActive: true, order: 1 },
  { id: 'ql_2', unitId: 'unit_10', name: 'Retorno/Entrega/Pré-Cadastro (R) - Externo', prefix: 'R', type: 'external', category: 'attendance', isActive: true, order: 2 },
  { id: 'ql_3', unitId: 'unit_10', name: 'Exame Agendado (E) - Externo', prefix: 'E', type: 'external', category: 'attendance', isActive: true, order: 3 },
  { id: 'ql_4', unitId: 'unit_10', name: 'Kids (K) - Externo', prefix: 'K', type: 'external', category: 'attendance', isActive: true, order: 4 },
  { id: 'ql_5', unitId: 'unit_10', name: 'Resultado de Exame (R) - Externo', prefix: 'R', type: 'external', category: 'attendance', isActive: true, order: 5 },
  { id: 'ql_6', unitId: 'unit_10', name: 'Dr. Aurelio Braulio (1º Andar)', prefix: 'D', type: 'external', category: 'attendance', isActive: true, order: 6 },
  { id: 'ql_7', unitId: 'unit_10', name: 'DNA Care', prefix: 'N', type: 'external', category: 'attendance', isActive: true, order: 7 },
  { id: 'ql_8', unitId: 'unit_10', name: 'InovaGastro (1º Andar)', prefix: 'I', type: 'external', category: 'attendance', isActive: true, order: 8 },
  { id: 'ql_9', unitId: 'unit_10', name: 'Normal (N) - Externo', prefix: 'N', type: 'external', category: 'attendance', isActive: true, order: 9 },
  { id: 'ql_10', unitId: 'unit_10', name: 'Preferencial (P) - Externo', prefix: 'P', type: 'external', category: 'attendance', isActive: true, order: 10 },
  // Major Laurentino - Internal
  { id: 'ql_11', unitId: 'unit_10', name: 'Consultório Médico - Interno', prefix: 'CM', type: 'internal', category: 'attendance', isActive: true, order: 11 },
  { id: 'ql_12', unitId: 'unit_10', name: 'Coleta - Interno', prefix: 'CL', type: 'internal', category: 'collect', isActive: true, order: 12 },
  { id: 'ql_13', unitId: 'unit_10', name: 'Carro - Interno', prefix: 'CR', type: 'internal', category: 'collect', isActive: true, order: 13 },
  { id: 'ql_14', unitId: 'unit_10', name: 'DNA Care - Interno', prefix: 'DC', type: 'internal', category: 'attendance', isActive: true, order: 14 },
  { id: 'ql_15', unitId: 'unit_10', name: 'Repouso - Interno', prefix: 'RP', type: 'internal', category: 'collect', isActive: true, order: 15 },
  // Alecrim
  { id: 'ql_20', unitId: 'unit_1', name: 'Atendimento (A) - Externo', prefix: 'A', type: 'external', category: 'attendance', isActive: true, order: 1 },
  { id: 'ql_21', unitId: 'unit_1', name: 'Preferencial +80 (F) - Externo', prefix: 'F', type: 'external', category: 'attendance', isActive: true, order: 2 },
  { id: 'ql_22', unitId: 'unit_1', name: 'Preferencial (P) - Externo', prefix: 'P', type: 'external', category: 'attendance', isActive: true, order: 3 },
  { id: 'ql_23', unitId: 'unit_1', name: 'Normal (N) - Externo', prefix: 'N', type: 'external', category: 'attendance', isActive: true, order: 4 },
  { id: 'ql_24', unitId: 'unit_1', name: 'Liga (L) - Externo', prefix: 'L', type: 'external', category: 'attendance', isActive: true, order: 5 },
  { id: 'ql_25', unitId: 'unit_1', name: 'Kids (K) - Externo', prefix: 'K', type: 'external', category: 'attendance', isActive: true, order: 6 },
  { id: 'ql_26', unitId: 'unit_1', name: 'Retorno-Entrega Material (R) - Externo', prefix: 'R', type: 'external', category: 'attendance', isActive: true, order: 7 },
  { id: 'ql_27', unitId: 'unit_1', name: 'Coleta (C) - Externo', prefix: 'C', type: 'external', category: 'collect', isActive: true, order: 8 },
  { id: 'ql_28', unitId: 'unit_1', name: 'Consultório Médico - Interno', prefix: 'CM', type: 'internal', category: 'attendance', isActive: true, order: 9 },
  { id: 'ql_29', unitId: 'unit_1', name: 'Coleta - Interno', prefix: 'CL', type: 'internal', category: 'collect', isActive: true, order: 10 },
]

export const MOCK_GUICHES: Guiche[] = [
  // Major Laurentino
  { id: 'g_1', unitId: 'unit_10', name: 'Guichê 01 Preferencial - Externo', type: 'external', isActive: true },
  { id: 'g_2', unitId: 'unit_10', name: 'Guichê 02 - Externo', type: 'external', isActive: true },
  { id: 'g_3', unitId: 'unit_10', name: 'Guichê 03 - Externo', type: 'external', isActive: true },
  { id: 'g_4', unitId: 'unit_10', name: 'Coleta - Interno', type: 'internal', isActive: true },
  { id: 'g_5', unitId: 'unit_10', name: 'Repouso - Interno', type: 'internal', isActive: true },
  { id: 'g_6', unitId: 'unit_10', name: 'Guichê 06 - Externo', type: 'external', isActive: true },
  // Alecrim
  { id: 'g_10', unitId: 'unit_1', name: 'Guichê 01 Preferencial - Externo', type: 'external', isActive: true },
  { id: 'g_11', unitId: 'unit_1', name: 'Guichê 02 - Externo', type: 'external', isActive: true },
  { id: 'g_12', unitId: 'unit_1', name: 'Guichê 03 - Externo', type: 'external', isActive: true },
  { id: 'g_13', unitId: 'unit_1', name: 'Coleta - Interno', type: 'internal', isActive: true },
  { id: 'g_14', unitId: 'unit_1', name: 'Repouso - Interno', type: 'internal', isActive: true },
]

export const MOCK_TOTEMS: Totem[] = [
  { id: 'tot_1', unitId: 'unit_10', name: 'Totem Major Laurentino', isActive: true },
  { id: 'tot_2', unitId: 'unit_1', name: 'Totem Alecrim', isActive: true },
]

export const MOCK_TVS: TV[] = [
  { id: 'tv_1', unitId: 'unit_10', name: 'TV Principal', voiceType: 'feminine', screenSize: 'large', deviceCount: 1, mediaMode: 'without_media', mediaAttachments: [], isActive: true },
  { id: 'tv_2', unitId: 'unit_10', name: 'TV Kids', voiceType: 'feminine', screenSize: 'medium', deviceCount: 1, mediaMode: 'without_media', mediaAttachments: [], isActive: true },
  {
    id: 'tv_3', unitId: 'unit_1', name: 'TV Principal Alecrim', voiceType: 'feminine', screenSize: 'large', deviceCount: 2, mediaMode: 'with_media',
    mediaAttachments: [
      { id: 'ma_1', tvId: 'tv_3', name: 'APLICATIVO DNA CENTER.mp4', type: 'video', durationSeconds: 40, fileUrl: '#', createdAt: '2024-06-01T00:00:00' },
      { id: 'ma_2', tvId: 'tv_3', name: 'Banner Promocional.jpg', type: 'image', durationSeconds: 10, fileUrl: '#', createdAt: '2024-06-01T00:00:00' },
    ],
    isActive: true,
  },
]

function mkTimeline(id: string, gen: string, called?: string, attended?: string, guiche?: string, attendant?: string) {
  const tl = [{ id: `tl_${id}_1`, action: 'created' as const, description: 'Ficha gerada no totem', timestamp: gen }]
  if (called) tl.push({ id: `tl_${id}_2`, action: 'called' as const, description: `Chamado por ${attendant || 'Atendente'} (${guiche || 'Guichê'})`, performedBy: attendant, guicheName: guiche, timestamp: called })
  if (attended) tl.push({ id: `tl_${id}_3`, action: 'attended' as const, description: `Atendido por ${attendant || 'Atendente'} (${guiche || 'Guichê'})`, performedBy: attendant, guicheName: guiche, timestamp: attended })
  return tl
}

export const MOCK_TICKETS: Ticket[] = [
  // Waiting
  { id: 'tk_1', unitId: 'unit_10', queueLineId: 'ql_5', queueLineName: 'Resultado de Exame', prefix: 'R', number: 23, displayCode: 'R23', status: 'called', guicheId: 'g_6', guicheName: 'Guichê 06', callCount: 1, generatedAt: ts(15, 25), calledAt: ts(15, 27), attendanceStartedAt: ts(15, 27), timeline: mkTimeline('1', ts(15, 25), ts(15, 27), ts(15, 27), 'Guichê 06', 'Marianna Beatriz') },
  { id: 'tk_2', unitId: 'unit_10', queueLineId: 'ql_5', queueLineName: 'Resultado de Exame', prefix: 'R', number: 24, displayCode: 'R24', status: 'waiting', callCount: 0, generatedAt: ts(15, 28), timeline: mkTimeline('2', ts(15, 28)) },
  { id: 'tk_3', unitId: 'unit_10', queueLineId: 'ql_5', queueLineName: 'Resultado de Exame', prefix: 'R', number: 25, displayCode: 'R25', status: 'waiting', callCount: 0, generatedAt: ts(15, 30), timeline: mkTimeline('3', ts(15, 30)) },
  { id: 'tk_4', unitId: 'unit_10', queueLineId: 'ql_5', queueLineName: 'Resultado de Exame', prefix: 'R', number: 26, displayCode: 'R26', status: 'waiting', callCount: 0, generatedAt: ts(15, 32), timeline: mkTimeline('4', ts(15, 32)) },
  { id: 'tk_5', unitId: 'unit_10', queueLineId: 'ql_5', queueLineName: 'Resultado de Exame', prefix: 'R', number: 27, displayCode: 'R27', status: 'waiting', callCount: 0, generatedAt: ts(15, 34), timeline: mkTimeline('5', ts(15, 34)) },
  { id: 'tk_6', unitId: 'unit_10', queueLineId: 'ql_1', queueLineName: 'Atendimento Laboratório', prefix: 'A', number: 12, displayCode: 'A12', status: 'waiting', callCount: 0, generatedAt: ts(14, 50), timeline: mkTimeline('6', ts(14, 50)) },
  { id: 'tk_7', unitId: 'unit_10', queueLineId: 'ql_1', queueLineName: 'Atendimento Laboratório', prefix: 'A', number: 13, displayCode: 'A13', status: 'called', guicheId: 'g_1', guicheName: 'Guichê 01 Preferencial', callCount: 2, generatedAt: ts(14, 55), calledAt: ts(15, 10), timeline: mkTimeline('7', ts(14, 55), ts(15, 10), undefined, 'Guichê 01 Preferencial', 'Carlos Silva') },
  { id: 'tk_8', unitId: 'unit_10', queueLineId: 'ql_4', queueLineName: 'Kids', prefix: 'K', number: 5, displayCode: 'K5', status: 'in_attendance', guicheId: 'g_2', guicheName: 'Guichê 02', callCount: 1, generatedAt: ts(14, 40), calledAt: ts(14, 50), attendanceStartedAt: ts(14, 52), timeline: mkTimeline('8', ts(14, 40), ts(14, 50), ts(14, 52), 'Guichê 02', 'Ana Paula') },
  { id: 'tk_9', unitId: 'unit_10', queueLineId: 'ql_3', queueLineName: 'Exame Agendado', prefix: 'E', number: 8, displayCode: 'E8', status: 'waiting', callCount: 0, generatedAt: ts(15, 0), timeline: mkTimeline('9', ts(15, 0)) },
  { id: 'tk_10', unitId: 'unit_10', queueLineId: 'ql_10', queueLineName: 'Preferencial', prefix: 'P', number: 3, displayCode: 'P3', status: 'called', guicheId: 'g_1', guicheName: 'Guichê 01 Preferencial', callCount: 3, generatedAt: ts(14, 30), calledAt: ts(14, 45), timeline: mkTimeline('10', ts(14, 30), ts(14, 45), undefined, 'Guichê 01 Preferencial', 'Marianna Beatriz') },
  { id: 'tk_11', unitId: 'unit_10', queueLineId: 'ql_9', queueLineName: 'Normal', prefix: 'N', number: 15, displayCode: 'N15', status: 'waiting', callCount: 0, generatedAt: ts(15, 36), timeline: mkTimeline('11', ts(15, 36)) },
  { id: 'tk_12', unitId: 'unit_10', queueLineId: 'ql_2', queueLineName: 'Retorno/Entrega/Pré-Cadastro', prefix: 'R', number: 10, displayCode: 'R10', status: 'in_attendance', guicheId: 'g_3', guicheName: 'Guichê 03', callCount: 1, generatedAt: ts(14, 20), calledAt: ts(14, 35), attendanceStartedAt: ts(14, 37), timeline: mkTimeline('12', ts(14, 20), ts(14, 35), ts(14, 37), 'Guichê 03', 'Maria Santos') },
  // Finalized
  { id: 'tk_f1', unitId: 'unit_10', queueLineId: 'ql_1', queueLineName: 'Atendimento Laboratório', prefix: 'A', number: 10, displayCode: 'A10', status: 'finalized', guicheId: 'g_1', guicheName: 'Guichê 01 Preferencial', callCount: 2, generatedAt: ts(13, 0), calledAt: ts(13, 10), attendanceStartedAt: ts(13, 12), finalizedAt: ts(13, 30), timeline: [...mkTimeline('f1', ts(13, 0), ts(13, 10), ts(13, 12), 'Guichê 01 Preferencial', 'Marianna Beatriz'), { id: 'tl_f1_4', action: 'finalized' as const, description: 'Finalizado por Marianna Beatriz', performedBy: 'Marianna Beatriz', timestamp: ts(13, 30) }] },
  { id: 'tk_f2', unitId: 'unit_10', queueLineId: 'ql_5', queueLineName: 'Resultado de Exame', prefix: 'R', number: 20, displayCode: 'R20', status: 'finalized', callCount: 1, generatedAt: ts(13, 20), calledAt: ts(13, 30), finalizedAt: ts(13, 45), timeline: [...mkTimeline('f2', ts(13, 20), ts(13, 30), undefined, 'Guichê 06', 'Carlos Silva'), { id: 'tl_f2_3', action: 'finalized' as const, description: 'Finalizado por Carlos Silva', timestamp: ts(13, 45) }] },
  { id: 'tk_f3', unitId: 'unit_10', queueLineId: 'ql_4', queueLineName: 'Kids', prefix: 'K', number: 3, displayCode: 'K3', status: 'finalized', callCount: 1, generatedAt: ts(12, 0), finalizedAt: ts(12, 40), timeline: [...mkTimeline('f3', ts(12, 0)), { id: 'tl_f3_2', action: 'finalized' as const, description: 'Finalizado', timestamp: ts(12, 40) }] },
  // Reallocated
  { id: 'tk_r1', unitId: 'unit_10', queueLineId: 'ql_1', queueLineName: 'Atendimento Laboratório', prefix: 'A', number: 11, displayCode: 'A11', status: 'reallocated', callCount: 1, patientName: 'João Silva', reallocatedToQueueId: 'ql_12', reallocatedToQueueName: 'Coleta - Interno', generatedAt: ts(14, 0), calledAt: ts(14, 10), reallocatedAt: ts(14, 15), timeline: [...mkTimeline('r1', ts(14, 0), ts(14, 10), undefined, 'Guichê 02', 'Ana Paula'), { id: 'tl_r1_3', action: 'reallocated' as const, description: 'Realocado para Coleta - Interno — João Silva', performedBy: 'Ana Paula', timestamp: ts(14, 15) }] },
  { id: 'tk_r2', unitId: 'unit_10', queueLineId: 'ql_3', queueLineName: 'Exame Agendado', prefix: 'E', number: 7, displayCode: 'E7', status: 'reallocated', callCount: 1, patientName: 'Maria Oliveira', reallocatedToQueueId: 'ql_11', reallocatedToQueueName: 'Consultório Médico - Interno', generatedAt: ts(13, 50), reallocatedAt: ts(14, 5), timeline: [...mkTimeline('r2', ts(13, 50)), { id: 'tl_r2_2', action: 'reallocated' as const, description: 'Realocado para Consultório Médico - Interno — Maria Oliveira', timestamp: ts(14, 5) }] },
  { id: 'tk_r3', unitId: 'unit_10', queueLineId: 'ql_10', queueLineName: 'Preferencial', prefix: 'P', number: 2, displayCode: 'P2', status: 'reallocated', callCount: 2, reallocatedToQueueId: 'ql_15', reallocatedToQueueName: 'Repouso - Interno', generatedAt: ts(13, 30), reallocatedAt: ts(14, 0), timeline: [...mkTimeline('r3', ts(13, 30)), { id: 'tl_r3_2', action: 'reallocated' as const, description: 'Realocado para Repouso - Interno', timestamp: ts(14, 0) }] },
  // More finalized
  { id: 'tk_f4', unitId: 'unit_10', queueLineId: 'ql_9', queueLineName: 'Normal', prefix: 'N', number: 12, displayCode: 'N12', status: 'finalized', callCount: 1, generatedAt: ts(11, 0), finalizedAt: ts(11, 30), timeline: [...mkTimeline('f4', ts(11, 0)), { id: 'tl_f4_2', action: 'finalized' as const, description: 'Finalizado', timestamp: ts(11, 30) }] },
  { id: 'tk_f5', unitId: 'unit_10', queueLineId: 'ql_10', queueLineName: 'Preferencial', prefix: 'P', number: 1, displayCode: 'P1', status: 'finalized', callCount: 1, generatedAt: ts(10, 0), finalizedAt: ts(10, 25), timeline: [...mkTimeline('f5', ts(10, 0)), { id: 'tl_f5_2', action: 'finalized' as const, description: 'Finalizado', timestamp: ts(10, 25) }] },
]

// BI Data
function genDailyStats() {
  const stats = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const gen = 80 + Math.floor(Math.random() * 70)
    const att = Math.min(gen, 70 + Math.floor(Math.random() * 65))
    stats.push({
      date: d.toISOString().slice(0, 10),
      generated: gen,
      attended: att,
      abandoned: gen - att,
      avgWaitMinutes: 8 + Math.floor(Math.random() * 27),
    })
  }
  return stats
}

export const MOCK_QUEUE_BI: QueueBIData = {
  dailyStats: genDailyStats(),
  attendants: [
    { id: 'att_1', name: 'Marianna Beatriz', unitName: 'Major Laurentino', ticketsAttended: 245, avgTimeMinutes: 12, ticketsFinalized: 240 },
    { id: 'att_2', name: 'Carlos Silva', unitName: 'Major Laurentino', ticketsAttended: 198, avgTimeMinutes: 15, ticketsFinalized: 190 },
    { id: 'att_3', name: 'Ana Paula', unitName: 'Alecrim', ticketsAttended: 176, avgTimeMinutes: 10, ticketsFinalized: 170 },
    { id: 'att_4', name: 'Maria Santos', unitName: 'Alecrim', ticketsAttended: 152, avgTimeMinutes: 18, ticketsFinalized: 145 },
    { id: 'att_5', name: 'Roberto Lima', unitName: 'Lagoa Nova', ticketsAttended: 134, avgTimeMinutes: 14, ticketsFinalized: 130 },
  ],
  unitMetrics: [
    { unitId: 'unit_10', unitName: 'Major Laurentino', generated: 1450, attended: 1280, abandoned: 170, avgWaitMinutes: 14, efficiency: 88 },
    { unitId: 'unit_1', unitName: 'Alecrim', generated: 1200, attended: 1100, abandoned: 100, avgWaitMinutes: 11, efficiency: 92 },
    { unitId: 'unit_8', unitName: 'Lagoa Nova', generated: 890, attended: 750, abandoned: 140, avgWaitMinutes: 19, efficiency: 84 },
    { unitId: 'unit_11', unitName: 'Matriz', generated: 650, attended: 610, abandoned: 40, avgWaitMinutes: 9, efficiency: 94 },
    { unitId: 'unit_2', unitName: 'Ayrton Senna', generated: 420, attended: 280, abandoned: 140, avgWaitMinutes: 28, efficiency: 67 },
  ],
  totals: { generated: 4610, attended: 4020, abandoned: 590, avgWaitMinutes: 15 },
}
