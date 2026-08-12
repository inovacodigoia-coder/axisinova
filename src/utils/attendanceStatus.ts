import { AttendanceOrder } from '@/types/attendance-cadastro.types';
import { LabAttendanceOrder } from '@/types/lab.types';

export type CalculatedStatus = 
  | 'aberto' 
  | 'aguardando' 
  | 'coleta_realizada' 
  | 'em_analise' 
  | 'liberado' 
  | 'concluido' 
  | 'cancelado';

export interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
}

export const ATTENDANCE_STATUS_CONFIG: Record<CalculatedStatus, StatusConfig> = {
  aberto: { 
    label: 'ABERTO', 
    bgClass: 'bg-slate-100', 
    textClass: 'text-slate-600' 
  },
  aguardando: { 
    label: 'AGUARDANDO', 
    bgClass: 'bg-amber-100', 
    textClass: 'text-amber-700' 
  },
  coleta_realizada: { 
    label: 'COLETA REALIZADA', 
    bgClass: 'bg-emerald-100', 
    textClass: 'text-emerald-700' 
  },
  em_analise: { 
    label: 'EM ANÁLISE', 
    bgClass: 'bg-violet-100', 
    textClass: 'text-violet-700' 
  },
  liberado: { 
    label: 'LIBERADO', 
    bgClass: 'bg-cyan-100', 
    textClass: 'text-cyan-700' 
  },
  concluido: { 
    label: 'CONCLUÍDO', 
    bgClass: 'bg-slate-800', 
    textClass: 'text-white' 
  },
  cancelado: { 
    label: 'CANCELADO', 
    bgClass: 'bg-red-100', 
    textClass: 'text-red-700' 
  },
};

/**
 * Recalculates the attendance status based on the aggregated state of its exams.
 */
export function calculateAttendanceStatus(order: AttendanceOrder | LabAttendanceOrder): CalculatedStatus {
  const labOrder = order as LabAttendanceOrder;
  const exams = labOrder.exams || [];

  // Concluido has highest precedence
  const isConcluido = labOrder.deliveryStatus === 'delivered'; 
  if (isConcluido) return 'concluido';

  // Cancelado overrides everything except Concluido
  if (order.status === 'cancelled' || order.status === 'cancelado') {
    return 'cancelado';
  }

  if (exams.length === 0) {
    return 'aberto';
  }

  // Check for 'Liberado': All exams are 'liberado' or 'validated'
  const allLiberados = exams.length > 0 && exams.every(e => e.status === 'liberado' || e.status === 'validated');
  if (allLiberados) return 'liberado';

  // Check for 'Em Análise': At least one result typed or exam processing
  const anyProcessing = exams.some(e => 
    e.status === 'processing' || 
    e.status === 'waiting_approval' || 
    (e.results && e.results.length > 0 && e.results.some(r => r.value && r.value.trim() !== ''))
  );
  if (anyProcessing) return 'em_analise';

  // Check for 'Coleta Realizada': All exams collected
  const allCollected = exams.length > 0 && exams.every(e => e.isColeta);
  if (allCollected) return 'coleta_realizada';

  // Check for 'Aguardando': At least one exam collected, but not all
  const anyCollected = exams.some(e => e.isColeta);
  if (anyCollected) return 'aguardando';

  // Default: 'Aberto'
  return 'aberto';
}

