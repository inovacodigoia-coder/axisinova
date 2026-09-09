// Controla regressões indevidas de status do pedido.
// Depois que o laboratório inicia/conclui a fase analítica, ações de coleta
// ou reimpressão não podem voltar o pedido para "Coleta Realizada".
export const ANALYTICAL_STATUSES = [
  'in_analysis',
  'validation',
  'released',
  'completed',
  'cancelled',
  'deleted',
] as const

export function canSetCollectionDone(currentStatus?: string | null): boolean {
  if (!currentStatus) return true
  return !(ANALYTICAL_STATUSES as readonly string[]).includes(currentStatus)
}
