/** Erro da trava do banco quando outro atendimento ficou com o mesmo número ao mesmo tempo. */
export function numeroPedidoRepetido(error: unknown): boolean {
  const e = error as { code?: string; hint?: string; message?: string } | null
  if (!e) return false
  return e.hint === 'numero_pedido_repetido'
    || (e.code === '23505' && /n[úu]mero de pedido|attendance_orders_unique_number/i.test(String(e.message || '')))
}
