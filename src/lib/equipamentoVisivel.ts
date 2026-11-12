/**
 * Regra da tela Equipamentos da empresa: equipamento compartilhado
 * (cadastrado por outra empresa) só aparece quando está ativo.
 * Os equipamentos próprios da empresa aparecem sempre, inclusive inativos,
 * para que ela acompanhe a liberação e edite os dados.
 */
export function equipamentoVisivelParaEmpresa(e: { source_equipment_id?: string | null; is_active?: boolean | null }): boolean {
  if (!e.source_equipment_id) return true
  return e.is_active === true
}
