export type InventoryCategory = 'material' | 'equipamento' | 'acessorio' | 'medicamento'
export interface StockItem { id: string; nome: string; categoria: InventoryCategory; unidade: string; medicamento_id?: string | null }
export interface StockSector { id: string; nome: string }
export interface StockBalance { item_id: string; local: string; quantidade: number; setor_id?: string | null }
export interface RequestLine { item_id: string; quantidade: number }
export interface StockRequest { id: string; setor_id: string; destino: 'setor' | 'farmacia'; status: 'pendente' | 'aprovada' | 'recusada'; itens: RequestLine[]; observacao?: string; motivo?: string; created_at: string; decidido_em?: string }
export interface StockMovement { id: string; item_id: string; origem: string; destino: string; quantidade: number; created_at: string; solicitacao_id?: string; setor_id?: string }
export interface InventoryState { itens: StockItem[]; setores: StockSector[]; saldos: StockBalance[]; solicitacoes: StockRequest[]; movimentos: StockMovement[] }
export const destinationFor = (request: Pick<StockRequest, 'setor_id' | 'destino'>) => request.destino === 'farmacia' ? 'farmacia' : `setor:${request.setor_id}`
export const quantityAt = (state: InventoryState, itemId: string, local: string) => state.saldos.find(b => b.item_id === itemId && b.local === local)?.quantidade ?? 0
export function decideDemo(state: InventoryState, id: string, approve: boolean, reason = ''): InventoryState {
  const request = state.solicitacoes.find(r => r.id === id)
  if (!request || request.status !== 'pendente') throw new Error('Solicitação não pendente')
  if (!approve && !reason.trim()) throw new Error('Informe o motivo da recusa')
  if (approve) for (const line of request.itens) {
    if (!Number.isFinite(line.quantidade) || line.quantidade <= 0) throw new Error('Quantidade inválida')
    if (quantityAt(state, line.item_id, 'almoxarifado') < line.quantidade) throw new Error(`Saldo insuficiente para ${state.itens.find(i => i.id === line.item_id)?.nome}`)
  }
  const now = new Date().toISOString()
  const next: InventoryState = structuredClone(state)
  const target = next.solicitacoes.find(r => r.id === id)
  if (!target) throw new Error('Solicitação não encontrada')
  target.status = approve ? 'aprovada' : 'recusada'; target.motivo = reason.trim(); target.decidido_em = now
  if (approve) for (const line of target.itens) {
    const source = next.saldos.find(b => b.item_id === line.item_id && b.local === 'almoxarifado')
    if (!source) throw new Error('Saldo inexistente')
    source.quantidade -= line.quantidade
    const local = destinationFor(target)
    const dest = next.saldos.find(b => b.item_id === line.item_id && b.local === local)
    if (dest) dest.quantidade += line.quantidade
    else next.saldos.push({ item_id: line.item_id, local, setor_id: target.setor_id, quantidade: line.quantidade })
    const item = next.itens.find(i => i.id === line.item_id)
    if (item?.categoria === 'medicamento' && target.destino === 'farmacia') item.medicamento_id ||= `demo-med-${item.id}`
    next.movimentos.push({ id: `${id}-${line.item_id}`, item_id: line.item_id, origem: 'almoxarifado', destino: local, setor_id: target.setor_id, quantidade: line.quantidade, created_at: now, solicitacao_id: id })
  }
  return next
}
export function addDemoRequest(state: InventoryState, setor: string, destino: 'setor' | 'farmacia', lines: RequestLine[], observacao: string): InventoryState {
  if (!state.setores.some(s => s.id === setor)) throw new Error('Selecione um setor')
  if (!lines.length) throw new Error('Selecione ao menos um item')
  if (new Set(lines.map(l => l.item_id)).size !== lines.length) throw new Error('Item duplicado')
  for (const l of lines) if (!state.itens.some(i => i.id === l.item_id) || !Number.isFinite(l.quantidade) || l.quantidade <= 0) throw new Error('Quantidade ou item inválido')
  return { ...state, solicitacoes: [{ id: crypto.randomUUID(), setor_id: setor, destino, itens: lines, observacao, status: 'pendente', created_at: new Date().toISOString() }, ...state.solicitacoes] }
}
export function createInventoryDemo(): InventoryState {
  const nomes = ['Internação', 'Postos de Coleta', 'Triagem', 'Nutrição', 'Farmácia', 'Centro Cirúrgico', 'Higienização']
  const comuns: [string, InventoryCategory, string][] = [
    ['Luva de procedimento M', 'material', 'caixa'], ['Máscara cirúrgica', 'material', 'caixa'], ['Gaze estéril', 'material', 'pacote'],
    ['Álcool 70%', 'material', 'frasco'], ['Seringa 5 mL', 'material', 'unidade'], ['Termômetro digital', 'equipamento', 'unidade'],
    ['Oxímetro', 'equipamento', 'unidade'], ['Bandeja inox', 'acessorio', 'unidade'], ['Avental descartável', 'material', 'unidade'], ['Suporte de soro', 'equipamento', 'unidade'],
  ]
  const meds = ['Dipirona 500 mg', 'Paracetamol 500 mg', 'Omeprazol 20 mg', 'Amoxicilina 500 mg', 'Metoclopramida 10 mg', 'Losartana 50 mg', 'Furosemida 40 mg', 'Ondansetrona 4 mg', 'Soro fisiológico 0,9% 500 mL', 'Glicose 5% 500 mL']
  const state: InventoryState = { setores: nomes.map((nome, n) => ({ id: `demo-sector-${n}`, nome })), itens: comuns.map(([nome, categoria, unidade], n) => ({ id: `demo-item-${n}`, nome, categoria, unidade })), saldos: [], solicitacoes: [], movimentos: [] }
  state.itens.push(...meds.map((nome, n) => ({ id: `demo-drug-${n}`, nome, categoria: 'medicamento' as const, unidade: n < 8 ? 'comprimido' : 'frasco' })))
  state.saldos = state.itens.map(i => ({ item_id: i.id, local: 'almoxarifado', quantidade: 500 }))
  let result = state
  for (const [n, setor] of state.setores.entries()) {
    const pharmacy = n === 4
    const items = pharmacy ? state.itens.filter(i => i.categoria === 'medicamento') : state.itens.filter(i => i.categoria !== 'medicamento').slice(0, 5 + (n % 6))
    const approved: StockRequest = { id: `demo-approved-${n}`, setor_id: setor.id, destino: pharmacy ? 'farmacia' : 'setor', status: 'pendente', created_at: '2026-11-02T08:00:00Z', observacao: 'Abastecimento inicial de demonstração', itens: items.map(i => ({ item_id: i.id, quantidade: pharmacy ? 30 : 5 + n })) }
    result = { ...result, solicitacoes: [...result.solicitacoes, approved] }
    result = decideDemo(result, approved.id, true)
    const rejected = { ...approved, id: `demo-rejected-${n}`, observacao: 'Reposição adicional', itens: [{ item_id: items[0].id, quantidade: 10 }] }
    result = { ...result, solicitacoes: [...result.solicitacoes, rejected] }
    result = decideDemo(result, rejected.id, false, 'Pedido duplicado; setor já abastecido')
    result.solicitacoes.push({ ...approved, id: `demo-pending-${n}`, observacao: n === 2 ? 'Quantidade acima do saldo para testar bloqueio' : 'Reposição pendente', itens: [{ item_id: items[0].id, quantidade: n === 2 ? 9999 : 3 }] })
  }
  return result
}