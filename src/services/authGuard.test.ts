import { describe, it, expect, vi } from 'vitest'
import { retryTransient, isTransientAuthFailure } from './authGuard'

const noSleep = () => Promise.resolve()

describe('retryTransient (login)', () => {
  it('repete após erro 500 passageiro e entra na segunda tentativa', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ error: { status: 500 } })
      .mockResolvedValueOnce({ error: null, data: 'ok' })
    const r = await retryTransient(fn, { sleep: noSleep })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ error: null, data: 'ok' })
  })

  it('senha errada (400) não é repetida', async () => {
    const fn = vi.fn().mockResolvedValue({ error: { status: 400 } })
    await retryTransient(fn, { sleep: noSleep })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('para depois de 3 tentativas se o servidor continuar falhando', async () => {
    const fn = vi.fn().mockResolvedValue({ error: { status: 503 } })
    const r = await retryTransient(fn, { sleep: noSleep })
    expect(fn).toHaveBeenCalledTimes(3)
    expect(isTransientAuthFailure(r)).toBe(true)
  })

  it('erro sem status (rede) conta como falha passageira', () => {
    expect(isTransientAuthFailure({ error: {} })).toBe(true)
    expect(isTransientAuthFailure(null)).toBe(true)
    expect(isTransientAuthFailure({ error: null })).toBe(false)
  })
})
