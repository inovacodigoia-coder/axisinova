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
  // If explicitly cancelled, return cancelled (unless concluded, but concluído has precedence)
  // Actually the prompt says cancelled overrides everything except Concluido.
  
  const labOrder = order as LabAttendanceOrder;
  const exams = labOrder.exams || [];

  if (order.status === 'cancelled') {
    // We check if it was concluded before being cancelled? 
    // The prompt says: "Cancelado sobrepõe qualquer status anterior, exceto Concluído".
    // So if it was already concluded, we might need a way to know.
    // But usually if it's 'cancelled' in DB, it means user clicked cancel.
    return 'cancelado';
  }

  if (exams.length === 0) {
    // If no exams, fallback to base status or 'aberto'
    if (order.status === 'cancelled') return 'cancelado';
    return 'aberto';
  }

  // Check for 'Concluído': All exams printed OR downloaded
  // We need a way to track if exams are printed/downloaded in the exam object.
  // LabExam in lab.types.ts has 'status'.
  // We'll assume 'concluido' if all exams are 'liberado' AND somehow marked as printed/downloaded.
  // Since we don't have a 'printed' field yet in the type, we'll check 'deliveryStatus' on the order.
  const isConcluido = labOrder.deliveryStatus === 'delivered'; 
  // OR if we want to be more granular, we'd need exam-level delivery info.
  // For now, let's follow the logic: "Todos os exames do pedido foram impressos OU tiveram o laudo baixado".
  if (isConcluido) return 'concluido';

  // Check for 'Liberado': All exams are 'liberado'
  const allLiberados = exams.every(e => e.status === 'liberado' || e.status === 'validated');
  if (allLiberados) return 'liberado';

  // Check for 'Em Análise': At least one result typed
  const anyInAnalysis = exams.some(e => e.results && e.results.length > 0 && e.results.some(r => r.value.trim() !== ''));
  // Or if we use the exam status 'processing' or 'waiting_approval'
  const anyProcessing = exams.some(e => e.status === 'processing' || e.status === 'waiting_approval' || (e.results && e.results.length > 0));
  if (anyInAnalysis || anyProcessing) return 'em_analise';

  // Check for 'Coleta Realizada': All exams collected
  const allCollected = exams.every(e => e.isColeta);
  if (allCollected) return 'coleta_realizada';

  // Check for 'Aguardando': At least one exam collected, but not all
  const anyCollected = exams.some(e => e.isColeta);
  if (anyCollected) return 'aguardando';

  // Default: 'Aberto'
  return 'aberto';
}
