import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarPausaRealtime } from './realtimePausa'

describe('tempo real em aba oculta', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('aba oculta por mais de 2 min pausa; ao voltar retoma uma vez', () => {
    const p = criarPausaRealtime(2 * 60_000)
    const retomou = vi.fn()
    p.aoRetomar(retomou)
    p.visibilidade(false)
    vi.advanceTimersByTime(2 * 60_000 - 1)
    expect(p.pausado()).toBe(false)
    vi.advanceTimersByTime(1)
    expect(p.pausado()).toBe(true)
    p.visibilidade(true)
    expect(p.pausado()).toBe(false)
    expect(retomou).toHaveBeenCalledTimes(1)
    p.visibilidade(true)
    expect(retomou).toHaveBeenCalledTimes(1)
  })

  it('oculta por menos de 2 min não pausa nem recarrega', () => {
    const p = criarPausaRealtime(2 * 60_000)
    const retomou = vi.fn()
    p.aoRetomar(retomou)
    p.visibilidade(false)
    vi.advanceTimersByTime(60_000)
    p.visibilidade(true)
    vi.advanceTimersByTime(5 * 60_000)
    expect(p.pausado()).toBe(false)
    expect(retomou).not.toHaveBeenCalled()
  })
})
