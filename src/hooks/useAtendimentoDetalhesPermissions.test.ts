import { describe, it, expect } from 'vitest'
import { atendimentoDetalhesPode } from './useAtendimentoDetalhesPermissions'
describe('permissões Detalhes Atendimento', () => {
  it('admin tem todas', () => expect(atendimentoDetalhesPode(true, undefined, 'atendimento.excluir')).toBe(true))
  it('perfil sem marcação é bloqueado', () => expect(atendimentoDetalhesPode(false, undefined, 'atendimento.editar')).toBe(false))
  it('perfil com marcação libera só a marcada', () => {
    expect(atendimentoDetalhesPode(false, ['atendimento.auditoria'], 'atendimento.auditoria')).toBe(true)
    expect(atendimentoDetalhesPode(false, ['atendimento.auditoria'], 'atendimento.excluir')).toBe(false)
  })
})
