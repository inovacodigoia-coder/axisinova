import { describe, it, expect } from 'vitest'
import { intervaloDoPeriodo } from './filaPeriodo'

const agora = new Date(2026, 10, 12, 15, 30) // 12/11/2026 15:30 local

describe('período da fila para os concluídos', () => {
  it('hoje: do início ao fim do dia local', () => {
    expect(intervaloDoPeriodo('hoje', null, null, agora)).toEqual({
      from: new Date(2026, 10, 12, 0, 0, 0, 0).toISOString(),
      to: new Date(2026, 10, 12, 23, 59, 59, 999).toISOString(),
    })
  })
  it('7 dias inclui hoje e os 6 anteriores', () => {
    expect(intervaloDoPeriodo('7d', null, null, agora)!.from).toBe(new Date(2026, 10, 6).toISOString())
  })
  it('mês passado: 01/10 a 31/10', () => {
    expect(intervaloDoPeriodo('mes-passado', null, null, agora)).toEqual({
      from: new Date(2026, 9, 1).toISOString(),
      to: new Date(2026, 9, 31, 23, 59, 59, 999).toISOString(),
    })
  })
  it('todos e personalizado sem datas não limitam', () => {
    expect(intervaloDoPeriodo('todos', null, null, agora)).toBeNull()
    expect(intervaloDoPeriodo('custom', null, null, agora)).toBeNull()
  })
  it('personalizado só com data inicial não tem fim', () => {
    const r = intervaloDoPeriodo('custom', new Date(2021, 0, 5), null, agora)!
    expect(r.from).toBe(new Date(2021, 0, 5).toISOString())
    expect(r.to).toBe('9999-12-31T23:59:59.999Z')
  })
})
