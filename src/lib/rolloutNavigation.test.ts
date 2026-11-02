import { describe, expect, it } from 'vitest'
import { rolloutNavigationAllowed } from './rolloutNavigation'
describe('Liberação do almoxarifado', () => {
  it('empresa inativa não libera solicitações nem com setor marcado', () => {
    expect(rolloutNavigationAllowed('/app/estoque/solicitacoes', false, {'/app/estoque/solicitacoes':true})).toBe(false)
  })
  it('Labsaude ativa só mostra solicitações quando o setor está marcado', () => {
    expect(rolloutNavigationAllowed('/app/estoque/solicitacoes', true, {'/app/estoque/solicitacoes':true})).toBe(true)
    expect(rolloutNavigationAllowed('/app/estoque/solicitacoes', true, {'/app/estoque/solicitacoes':false})).toBe(false)
    expect(rolloutNavigationAllowed('/app/estoque/solicitacoes', true)).toBe(false)
  })
  it('pedido pela Farmácia respeita a mesma restrição', () => {
    expect(rolloutNavigationAllowed('/app/farmacia/solicitacoes', false, {'/app/farmacia/solicitacoes':true})).toBe(false)
    expect(rolloutNavigationAllowed('/app/farmacia/solicitacoes', true, {'/app/farmacia/solicitacoes':false})).toBe(false)
  })
})