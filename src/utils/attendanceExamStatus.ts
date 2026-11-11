// Status do exame no modal Detalhes Atendimento.
// L = liberado, D = digitado, 'aguardando' / 'aberto' = sem resultado em andamento.
// Recoleta solicitada: o exame volta a "Aberto" (a amostra volta a não coletada e a
// digitação da amostra antiga não conta mais). Coletado de novo vira "Aguardando";
// digitado depois da solicitação volta a "D". Liberado continua "L".
export type AttendanceExamStatus = 'L' | 'D' | 'aguardando' | 'aberto';

export interface ExamResultInfo {
  status?: string | null;
  values?: { value?: unknown }[];
  typedAt?: string | null;
}

export function attendanceExamStatus(
  exam: { recollection?: { requestedAt?: string | null } | null },
  result: ExamResultInfo | null,
  collected: boolean,
): AttendanceExamStatus {
  if (result?.status === 'released') return 'L';
  const rec = exam?.recollection;
  const fallback: AttendanceExamStatus = collected ? 'aguardando' : 'aberto';
  if (!result) return fallback;
  const hasValue = (result.values || []).some((v) => String(v?.value ?? '').trim() !== '');
  if (!(result.status === 'digitized' || hasValue)) return fallback;
  if (rec) {
    const req = rec.requestedAt ? new Date(rec.requestedAt).getTime() : NaN;
    const typed = result.typedAt ? new Date(result.typedAt).getTime() : NaN;
    // Só volta a "D" se a digitação for posterior à solicitação da recoleta
    if (!(Number.isFinite(req) && Number.isFinite(typed) && typed > req)) return fallback;
  }
  return 'D';
}
