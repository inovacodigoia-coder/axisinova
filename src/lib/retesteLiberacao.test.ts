import { describe, it, expect } from 'vitest'
import { acaoLiberacao, acaoRetesteAparelho, acaoRetesteLocal, bloqueioLiberar, motivoDesliberar, AVISO_LIBERAR_COM_RETESTE } from './retesteLiberacao'

describe('Liberar / Desliberar / Reteste', () => {
  it('exame liberado mostra Desliberar no lugar de Liberar', () => {
    expect(acaoLiberacao({ liberado: true })).toBe('desliberar')
    expect(acaoLiberacao({ liberado: false })).toBe('liberar')
  })

  it('reteste do aparelho em exame liberado só avisa, não cria pedido', () => {
    expect(acaoRetesteAparelho({ liberado: true, retesteAparelho: false })).toBe('aviso_desliberar')
  })

  it('reteste do aparelho em exame não liberado cria o pedido', () => {
    expect(acaoRetesteAparelho({ liberado: false, retesteAparelho: false })).toBe('solicitar')
  })

  it('reteste já pedido pode ser cancelado (inclusive em dado antigo liberado + reteste)', () => {
    expect(acaoRetesteAparelho({ liberado: false, retesteAparelho: true })).toBe('cancelar')
    expect(acaoRetesteAparelho({ liberado: true, retesteAparelho: true })).toBe('cancelar')
  })

  it('reteste marcado na tela: liberado avisa; remover continua livre', () => {
    expect(acaoRetesteLocal({ liberado: true, retesteAparelho: false })).toBe('aviso_desliberar')
    expect(acaoRetesteLocal({ liberado: false, retesteAparelho: false })).toBe('marcar')
    expect(acaoRetesteLocal({ liberado: true, retesteAparelho: false, retesteLocal: true })).toBe('remover')
  })

  it('não libera exame com reteste pendente', () => {
    expect(bloqueioLiberar({ liberado: false, retesteAparelho: true })).toBe(AVISO_LIBERAR_COM_RETESTE)
    expect(bloqueioLiberar({ liberado: false, retesteAparelho: false, retesteLocal: true })).toBe(AVISO_LIBERAR_COM_RETESTE)
    expect(bloqueioLiberar({ liberado: false, retesteAparelho: false })).toBeNull()
  })

  it('motivo da desliberação: Outro exige descrição', () => {
    expect(motivoDesliberar('Reteste', '')).toBe('Reteste')
    expect(motivoDesliberar('Correção de resultado', 'valor trocado')).toBe('Correção de resultado — valor trocado')
    expect(motivoDesliberar('Outro', '  ')).toBeNull()
    expect(motivoDesliberar('Outro', 'pedido do médico')).toBe('pedido do médico')
  })
})
