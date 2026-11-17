// Pedidos antigos podem ter o mesmo número em origens diferentes (antes da numeração única por empresa).
// Nesses casos o aparelho não pode escolher um paciente por palpite.
const CANCELADOS = ['deleted', 'cancelled']

// deno-lint-ignore no-explicit-any
export async function outrosPedidosComMesmoNumero(supabase: any, companyId: string, order: { id: string; order_number?: string | null; protocol?: string | null }): Promise<number> {
  const numero = String(order.order_number || order.protocol || '').trim()
  if (!numero) return 0
  const { data, error } = await supabase
    .from('attendance_orders')
    .select('id, status')
    .eq('company_id', companyId)
    .eq('order_number', numero)
    .neq('id', order.id)
    .limit(20)
  if (error) return 0
  return (data || []).filter((o: { status?: string | null }) => !CANCELADOS.includes(String(o.status))).length
}
