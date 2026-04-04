import type { MonthlyData, DoctorProductionData, ConvenioData, AlertData, HeatmapCell } from '@/types/bi.types'

export const MONTHLY_DATA: MonthlyData[] = [
  { month: 'Abr/24', attendances: 312, revenue: 42800, received: 38200, glosa: 4600, absentees: 38 },
  { month: 'Mai/24', attendances: 298, revenue: 41200, received: 37900, glosa: 3300, absentees: 31 },
  { month: 'Jun/24', attendances: 325, revenue: 44100, received: 40800, glosa: 3300, absentees: 35 },
  { month: 'Jul/24', attendances: 341, revenue: 46500, received: 42100, glosa: 4400, absentees: 40 },
  { month: 'Ago/24', attendances: 356, revenue: 48200, received: 44300, glosa: 3900, absentees: 37 },
  { month: 'Set/24', attendances: 330, revenue: 45800, received: 41200, glosa: 4600, absentees: 44 },
  { month: 'Out/24', attendances: 368, revenue: 50100, received: 46800, glosa: 3300, absentees: 33 },
  { month: 'Nov/24', attendances: 345, revenue: 47600, received: 43900, glosa: 3700, absentees: 39 },
  { month: 'Dez/24', attendances: 290, revenue: 39800, received: 36500, glosa: 3300, absentees: 28 },
  { month: 'Jan/25', attendances: 358, revenue: 49200, received: 45100, glosa: 4100, absentees: 41 },
  { month: 'Fev/25', attendances: 372, revenue: 51800, received: 47600, glosa: 4200, absentees: 38 },
  { month: 'Mar/25', attendances: 387, revenue: 54600, received: 49800, glosa: 4800, absentees: 42 },
]

export const DOCTOR_PRODUCTION: DoctorProductionData[] = [
  { doctorId: 'doc_01', doctorName: 'Dr. Carlos Lima', specialty: 'Cardiologia', consultations: 142, exams: 38, procedures: 12, totalAttendances: 192, revenue: 28400, avgAttendanceTime: 25, absenteeRate: 11.5, rating: 4.7 },
  { doctorId: 'doc_02', doctorName: 'Dra. Paula Mendes', specialty: 'Clínica Geral', consultations: 185, exams: 22, procedures: 5, totalAttendances: 212, revenue: 19800, avgAttendanceTime: 18, absenteeRate: 4.2, rating: 4.9 },
  { doctorId: 'doc_03', doctorName: 'Dr. Roberto Melo', specialty: 'Ortopedia', consultations: 68, exams: 15, procedures: 45, totalAttendances: 128, revenue: 35200, avgAttendanceTime: 35, absenteeRate: 8.3, rating: 4.5 },
  { doctorId: 'doc_04', doctorName: 'Dra. Ana Rocha', specialty: 'Pediatria', consultations: 210, exams: 45, procedures: 8, totalAttendances: 263, revenue: 22100, avgAttendanceTime: 15, absenteeRate: 16.8, rating: 4.8 },
  { doctorId: 'doc_05', doctorName: 'Dr. Fábio Santos', specialty: 'Dermatologia', consultations: 95, exams: 30, procedures: 22, totalAttendances: 147, revenue: 24600, avgAttendanceTime: 22, absenteeRate: 7.1, rating: 4.3 },
]

export const CONVENIO_DATA: ConvenioData[] = [
  { convenioId: 'conv_01', convenioName: 'Unimed', attendances: 320, revenue: 44800, glosaRate: 4.2, avgTicket: 140, percentage: 34 },
  { convenioId: 'conv_02', convenioName: 'Hapvida', attendances: 245, revenue: 27400, glosaRate: 9.1, avgTicket: 112, percentage: 26 },
  { convenioId: 'conv_03', convenioName: 'Bradesco Saúde', attendances: 85, revenue: 18700, glosaRate: 2.8, avgTicket: 220, percentage: 9 },
  { convenioId: 'conv_04', convenioName: 'Particular', attendances: 62, revenue: 21700, glosaRate: 0, avgTicket: 350, percentage: 7 },
  { convenioId: 'conv_05', convenioName: 'SUS', attendances: 180, revenue: 8100, glosaRate: 1.5, avgTicket: 45, percentage: 19 },
  { convenioId: 'conv_06', convenioName: 'Amil', attendances: 50, revenue: 9400, glosaRate: 2.1, avgTicket: 188, percentage: 5 },
]

export const BI_ALERTS: AlertData[] = [
  { id: 'alert_01', type: 'critical', category: 'financial', title: 'Taxa de glosa elevada — Hapvida', description: 'Taxa de glosa da Hapvida atingiu 9,1% em março (meta: 5%). Risco de R$ 2.490 não recuperados.', value: 'R$ 2.490', action: 'Ver glosas Hapvida', actionRoute: '/app/faturamento/glosas', detectedAt: new Date().toISOString() },
  { id: 'alert_02', type: 'critical', category: 'compliance', title: 'Guias com prazo vencendo', description: '3 guias TISS com prazo de autorização vencendo em menos de 48 horas.', action: 'Ver guias', actionRoute: '/app/faturamento/guias', detectedAt: new Date().toISOString() },
  { id: 'alert_03', type: 'warning', category: 'operational', title: 'Alto índice de faltosos — Dra. Ana Rocha', description: 'Dra. Ana Rocha tem 16,8% de faltosos esta semana, acima da média da clínica (10,8%).', action: 'Ver agenda', actionRoute: '/app/agendamento', detectedAt: new Date().toISOString() },
  { id: 'alert_04', type: 'warning', category: 'quality', title: 'Tempo médio crescendo — Ortopedia', description: 'Tempo médio de atendimento na ortopedia subiu 15% no último mês (35 min vs 30 min).', detectedAt: new Date().toISOString() },
  { id: 'alert_05', type: 'success', category: 'financial', title: 'Receita em alta', description: 'Receita de março superou fevereiro em 5,4%. Projeção anual: +12% sobre o ano anterior.', value: '+5,4%', detectedAt: new Date().toISOString() },
  { id: 'alert_06', type: 'success', category: 'operational', title: 'Menor fila de espera do trimestre', description: 'Tempo médio de espera na recepção caiu para 12 min (era 19 min em janeiro).', detectedAt: new Date().toISOString() },
]

export const QUICK_INSIGHTS: string[] = [
  '📈 Atendimentos cresceram 18% vs mês anterior, puxados por consultas de cardiologia e pediatria.',
  '⚠️ Hapvida representa 26% dos atendimentos mas apenas 21% da receita — ticket médio abaixo da média.',
  '🏆 Dra. Paula Mendes tem o menor índice de faltosos da clínica (4,2%) e a maior satisfação (4,9).',
  '💡 Terças-feiras às 14h são o horário com maior taxa de falta (23%) — considere confirmações mais próximas.',
  '⚡ Tempo médio de atendimento reduziu 8% após implementação do totem de autoatendimento.',
]

export const ABSENTEE_HEATMAP: HeatmapCell[] = (() => {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
  const hours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
  const rates: number[][] = [
    [5, 8, 7, 6, 4, 10, 8, 6],
    [7, 12, 9, 8, 6, 23, 18, 11],
    [4, 6, 5, 7, 5, 9, 7, 5],
    [8, 11, 10, 9, 7, 19, 15, 10],
    [6, 9, 8, 5, 8, 12, 9, 7],
  ]
  const cells: HeatmapCell[] = []
  days.forEach((day, di) => {
    hours.forEach((hour, hi) => {
      cells.push({ day, hour, rate: rates[di][hi] })
    })
  })
  return cells
})()
