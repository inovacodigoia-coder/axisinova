import { afterEach, describe, expect, it, vi } from 'vitest'
import { imprimirDireto, servidorImpressaoAtivo } from './impressaoLocal'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('conexão da impressão local', () => {
  it('falha no ping não envia documentos e libera o temporizador', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    expect(await servidorImpressaoAtivo()).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:8089/api/ping')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('envio sem resposta não indica sucesso nem repete o documento', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    await expect(imprimirDireto('etiqueta_acompanhante', new Blob(['teste']))).rejects.toThrow('não foi possível confirmar se o documento chegou')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})