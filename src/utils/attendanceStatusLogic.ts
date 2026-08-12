import type { AttendanceOrder } from '@/types/attendance-cadastro.types'
import type { LabAttendanceOrder } from '@/types/lab.types'


export type DerivedAttendanceStatus = 
  | 'open' 
  | 'waiting' 
  | 'collection_done' 
  | 'in_analysis' 
  | 'released' 
  | 'completed' 
  | 'cancelled'
  | 'validation' // Mantido por retrocompatibilidade
  | 'authorized'; // Mantido por retrocompatibilidade

export const ATTENDANCE_STATUS_CONFIG: Record<DerivedAttendanceStatus, { label: string, color: string, textColor: string }> = {
  open: { 
    label: 'Aberto', 
    color: 'bg-slate-100', 
    textColor: 'text-slate-600' 
  },
  waiting: { 
    label: 'Aguardando', 
    color: 'bg-amber-100', 
    textColor: 'text-amber-700' 
  },
  collection_done: { 
    label: 'Coleta Realizada', 
    color: 'bg-emerald-100', 
    textColor: 'text-emerald-700' 
  },
  in_analysis: { 
    label: 'Em Análise', 
    color: 'bg-violet-100', 
    textColor: 'text-violet-700' 
  },
  released: { 
    label: 'Liberado', 
    color: 'bg-cyan-100', 
    textColor: 'text-cyan-700' 
  },
  completed: { 
    label: 'Concluído', 
    color: 'bg-slate-800', 
    textColor: 'text-white' 
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-100', 
    textColor: 'text-red-700' 
  },
  // Mantidos inalterados conforme solicitado
  validation: { 
    label: 'Validação', 
    color: 'bg-purple-100', 
    textColor: 'text-purple-700' 
  },
  authorized: { 
    label: 'Autorizado', 
    color: 'bg-indigo-100', 
    textColor: 'text-indigo-700' 
  }
}

/**
 * Calcula o status do atendimento com base no estado agregado dos exames.
 */
export function calculateAttendanceStatus(order: AttendanceOrder): DerivedAttendanceStatus {
  const labOrder = order as LabAttendanceOrder;
  
  if (order.status === 'cancelled') return 'cancelled';
  
  // Se não houver exames definidos, assume Aberto
  const exams = labOrder.exams || [];
  if (exams.length === 0) return 'open';

  // 1. Concluído: Todos exames impressos OU baixados (simulado por meta ou status conclusão)
  // No mock/schema atual, vamos considerar se todos estão 'liberado' e existe evidência de entrega
  const isDelivered = labOrder.deliveryStatus === 'delivered';
  const allReleased = exams.every(e => e.status === 'liberado');
  if (allReleased && isDelivered) return 'completed';

  // 2. Liberado: Todos os exames do pedido estão individualmente com status "Liberado"
  if (allReleased) return 'released';

  // 3. Em Análise: O primeiro resultado de qualquer exame do pedido foi digitado
  const anyHasResults = exams.some(e => (e.results && e.results.length > 0) || e.status === 'processing' || e.status === 'waiting_approval');
  if (anyHasResults) return 'in_analysis';

  // 4. Coleta Realizada: Todos os exames do pedido possuem coleta confirmada
  const allCollected = exams.every(e => e.isColeta);
  if (allCollected) return 'collection_done';

  // 5. Aguardando: Pelo menos 1 exame coletado, mas nem todos
  const anyCollected = exams.some(e => e.isColeta);
  if (anyCollected) return 'waiting';

  // 6. Aberto: Cadastro realizado, nenhum exame coletado
  return 'open';
}
