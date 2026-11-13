import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { chamarComPrazo, falhaPassageiraAuth, servidorOcupado, LOGIN_PRAZO_MS } from './loginResiliente'

// Regras da Etapa 3: tentativa de login para em 15 s; erro de rede repete sozinho
// no máximo 2 vezes com espera de 2 s; senha errada nunca repete.

describe('chamarComPrazo (login)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('senha errada (400) volta na hora, sem repetir', async () => {
    const fn = vi.fn().mockResolvedValue({ error: { status: 400 } })
    const r = await chamarComPrazo(fn, { prazoFinal: Date.now() + LOGIN_PRAZO_MS, ehFalhaPassageira: falhaPassageiraAuth })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(r.tipo).toBe('ok')
  })

  it('erro de rede repete no máximo 2 vezes, esperando 2 s entre elas', async () => {
    const fn = vi.fn().mockResolvedValue({ error: { status: 0 } })
    const esperas: number[] = []
    const dormir = (ms: number) => { esperas.push(ms); return Promise.resolve() }
    const r = await chamarComPrazo(fn, { prazoFinal: Date.now() + LOGIN_PRAZO_MS, ehFalhaPassageira: falhaPassageiraAuth, dormir })
    expect(fn).toHaveBeenCalledTimes(3)
    expect(esperas).toEqual([2000, 2000])
    expect(r.tipo).toBe('falha_rede')
  })

  it('falha passageira e depois entra: devolve a resposta boa', async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ error: { status: 503 } })
      .mockResolvedValueOnce({ error: null, data: 'ok' })
    const r = await chamarComPrazo(fn, { prazoFinal: Date.now() + LOGIN_PRAZO_MS, ehFalhaPassageira: falhaPassageiraAuth, dormir: () => Promise.resolve() })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ tipo: 'ok', valor: { error: null, data: 'ok' } })
  })

  it('servidor que nunca responde: desiste em 15 s com tempo esgotado', async () => {
    const inicio = Date.now()
    const fn = vi.fn(() => new Promise<{ error: null }>(() => {}))
    const abandonadas: unknown[] = []
    const p = chamarComPrazo(fn, { prazoFinal: inicio + LOGIN_PRAZO_MS, ehFalhaPassageira: falhaPassageiraAuth, aoAbandonar: (x) => abandonadas.push(x) })
    let fim = 0
    void p.then(() => { fim = Date.now() })
    await vi.advanceTimersByTimeAsync(14_999)
    expect(fim).toBe(0)
    await vi.advanceTimersByTimeAsync(1)
    const r = await p
    expect(r.tipo).toBe('tempo_esgotado')
    expect(fim - inicio).toBe(15_000)
    expect(abandonadas.length).toBe(fn.mock.calls.length)
  })

  it('servidor ocupado (429) não é tratado como senha errada nem repetido', async () => {
    const res = { error: { status: 429 } }
    expect(falhaPassageiraAuth(res)).toBe(false)
    expect(servidorOcupado(res)).toBe(true)
    expect(servidorOcupado({ error: { status: 400 } })).toBe(false)
  })
})
