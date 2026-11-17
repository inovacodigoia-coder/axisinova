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

// Pedido que tinha este número e recebeu outro na correção dos números repetidos. Enquanto ele não
// estiver concluído, a etiqueta antiga dele ainda pode estar num tubo — e ela lê como este número.
const TROCA_CONCLUIDO = ['completed', 'deleted', 'cancelled']

// deno-lint-ignore no-explicit-any
export async function numeroTrocadoPendente(supabase: any, companyId: string, order: { id: string; order_number?: string | null; protocol?: string | null }): Promise<string | null> {
  const numero = String(order.order_number || order.protocol || '').trim()
  if (!numero) return null
  const { data: trocas, error } = await supabase
    .from('attendance_order_renumeracao')
    .select('order_id, numero_novo')
    .eq('company_id', companyId)
    .eq('numero_anterior', numero)
    .neq('order_id', order.id)
    .limit(20)
  if (error || !trocas?.length) return null
  const { data: pedidos } = await supabase
    .from('attendance_orders')
    .select('id, order_number, status')
    .in('id', trocas.map((t: { order_id: string }) => t.order_id))
  const pendente = (pedidos || []).find((p: { status?: string | null }) => !TROCA_CONCLUIDO.includes(String(p.status)))
  return pendente ? String(pendente.order_number || '') : null
}
