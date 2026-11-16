// Estado do exame que vai ao servidor do laboratório (list-orders-for-integration).
// "released" só enquanto liberado; desliberado volta a "resulted" (não liberado);
// "retest_requested" só em exame NÃO liberado (liberado prevalece em dado antigo).
export type ExamIntegrationStatus = 'released' | 'retest_requested' | 'resulted' | 'pending'

export function examIntegrationStatus(r: { status: string | null; retest_requested?: boolean | null }): ExamIntegrationStatus {
  const released = String(r.status) === 'released'
  if (released) return 'released'
  if (r.retest_requested === true) return 'retest_requested'
  return String(r.status) === 'cancelled' ? 'pending' : 'resulted'
}
