import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { acaoOptout, AVISO_SAIR, montarMenuSaida, separarAvisoSaida } from '../../supabase/functions/_shared/whatsappCiclo'
import { enviarCiclo } from '../../supabase/functions/_shared/whatsappMenu'

// jsdom não oferece AbortSignal.timeout; transporte usa o recurso nativo no servidor.
beforeEach(() => vi.stubGlobal('AbortSignal', { timeout: () => new AbortController().signal }))
afterEach(() => vi.unstubAllGlobals())
const envio = { base: 'https://provider.invalid', token: 'fixture', numero: '5584999990000', texto: 'Olá, Maria!', trackId: 'fixture', incluirBotao: true }

describe('botão de saída de automações', () => {
  it('substitui apenas o aviso final do snapshot pelo botão', () => {
    const snapshot = separarAvisoSaida('Olá, Maria!' + AVISO_SAIR)
    expect(snapshot).toEqual({ texto: 'Olá, Maria!', incluirBotao: true })
    expect(montarMenuSaida(envio.numero, snapshot.texto, envio.trackId).choices).toEqual(['NÃO QUERO MAIS RECEBER|automacao:sair'])
    expect(separarAvisoSaida('SAIR é uma opção.').incluirBotao).toBe(false)
    expect(separarAvisoSaida('Olá!').texto).toBe('Olá!')
  })
  it('encaminha o botão à mesma ação SAIR, sem confundir confirmação ou cancelamento', () => {
    expect(acaoOptout('automacao:sair', '')).toBe('sair')
    expect(acaoOptout('', 'sair')).toBe('sair')
    expect(acaoOptout('', 'parar mensagens')).toBe('sair')
    expect(acaoOptout('', 'voltar')).toBe('voltar')
    expect(acaoOptout('confirmar:ABC123', 'sair')).toBeNull()
    expect(acaoOptout('cancelar:ABC123', 'cancelar')).toBeNull()
    expect(acaoOptout('', 'quero sair amanhã')).toBeNull()
  })
  it('envia uma única mensagem com menu quando a opção está ligada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"fixture"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await enviarCiclo(envio)).formato).toBe('botoes')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://provider.invalid/send/menu')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe('Olá, Maria!')
  })
  it('mantém texto simples quando a opção está desligada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await enviarCiclo({ ...envio, incluirBotao: false })).formato).toBe('texto')
    expect(fetchMock.mock.calls[0][0]).toBe('https://provider.invalid/send/text')
  })
  it.each([400, 422])('preserva saída por SAIR se o menu for recusado com %s', async status => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await enviarCiclo(envio)
    expect(r.formato).toBe('texto')
    expect(r.motivoPlanoB).toContain(`HTTP ${status}`)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).text).toBe('Olá, Maria!' + AVISO_SAIR)
  })
  it.each([401, 429, 500])('não tenta novamente para HTTP %s', async status => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await enviarCiclo(envio)).status).toBe(status)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('não repete após timeout ou falha de conexão', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('timeout'))
    vi.stubGlobal('fetch', fetchMock)
    expect((await enviarCiclo(envio)).status).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})