import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import {
  consumirLimites, emSegundoPlano, gravarLog, ipDoChamador, linhaDeLog, novoContexto, protegerListaExames,
  regrasPartnerOrders, registrarOauth, verificarOauth,
} from '../../supabase/functions/_shared/apiProtecao'

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null })

describe('IP do chamador', () => {
  it('usa o cabeçalho gravado pela infraestrutura e ignora os que o cliente controla', () => {
    expect(ipDoChamador(headers({ 'sb-forwarded-for': '34.62.45.189', 'x-forwarded-for': '1.2.3.4', 'true-client-ip': '7.7.7.7' }))).toBe('34.62.45.189')
    expect(ipDoChamador(headers({ 'cf-connecting-ip': '2001:db8::1' }))).toBe('2001:db8::1')
    expect(ipDoChamador(headers({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '9.9.9.9', 'true-client-ip': '7.7.7.7' }))).toBeNull()
    expect(ipDoChamador(headers({ 'sb-forwarded-for': 'abc; DROP' }))).toBeNull()
  })
})

describe('(e) linha de log', () => {
  it('só leva os campos permitidos, sem segredo, token ou corpo', () => {
    const ctx = novoContexto({ method: 'post', headers: headers({ 'sb-forwarded-for': '203.0.113.9', 'user-agent': 'u'.repeat(400), authorization: 'Bearer eyJTOKEN' }) }, 'oauth-token', 1000)
    ctx.clientId = 'axis_cid_abc'
    const linha = linhaDeLog(ctx, 401, 'invalid_client', 1250)
    expect(Object.keys(linha).sort()).toEqual(['client_id', 'company_id', 'duration_ms', 'endpoint', 'error_code', 'ip', 'metodo', 'partner_id', 'request_id', 'status_code', 'user_agent'])
    expect(linha).toMatchObject({ client_id: 'axis_cid_abc', ip: '203.0.113.9', metodo: 'POST', status_code: 401, duration_ms: 250 })
    expect(linha.user_agent?.length).toBe(200)
    expect(JSON.stringify(linha)).not.toMatch(/eyJTOKEN|Bearer/)
    // um segredo colado no lugar do client_id nunca vai para o log
    ctx.clientId = 'axis_sec_SEGREDO'
    expect(linhaDeLog(ctx, 401, null).client_id).toBeNull()
  })
})

describe('(h) falha no limite ou no log não derruba a requisição', () => {
  const quebrado = { rpc: vi.fn(async () => ({ data: null, error: { message: 'connection refused' } })) }
  const explode = { rpc: vi.fn(async () => { throw new Error('timeout') }) }

  it('limite com erro de banco deixa passar (fail-open)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await consumirLimites(quebrado, [{ regra: 'partner_get_parceiro', chave: 'p' }])).permitido).toBe(true)
    expect((await consumirLimites(explode, [{ regra: 'partner_get_parceiro', chave: 'p' }])).permitido).toBe(true)
    expect((await verificarOauth(explode, '1.1.1.1', 'cid', false)).permitido).toBe(true)
    expect((await verificarOauth(explode, '1.1.1.1', 'cid', true)).bloqueioIgnorado).toBe(false)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('log com erro de banco não lança', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ctx = novoContexto({ method: 'GET', headers: headers({}) }, 'partner-orders')
    await expect(gravarLog(explode, linhaDeLog(ctx, 200, null))).resolves.toBeUndefined()
    await expect(registrarOauth(quebrado, ctx, 'falha_credencial', linhaDeLog(ctx, 401, 'invalid_client'))).resolves.toBeUndefined()
    expect(() => emSegundoPlano(Promise.reject(new Error('x')))).not.toThrow()
    await new Promise(r => setTimeout(r, 0))
    spy.mockRestore()
  })

  it('limite excedido volta com tempo de espera', async () => {
    const db = { rpc: async () => ({ data: { permitido: false, retry_after: 17, error_code: 'RATE_LIMITED' }, error: null }) }
    expect(await consumirLimites(db, [{ regra: 'partner_post_parceiro', chave: 'p' }])).toEqual({ permitido: false, retryAfter: 17, errorCode: 'RATE_LIMITED' })
  })
})

describe('Etapa 2A.1 — credencial conferida antes do bloqueio por IP', () => {
  const comResposta = (data: unknown) => {
    const rpc = vi.fn(async (_fn: string, _args: Record<string, unknown>) => ({ data, error: null }))
    return { rpc }
  }

  it('envia ao banco se a credencial é válida e lê o "bloqueio ignorado" só para credencial válida', async () => {
    const db = comResposta({ permitido: true, retry_after: 0, bloqueio_ignorado: true })
    expect(await verificarOauth(db, '203.0.113.9', 'cid', true)).toEqual({ permitido: true, retryAfter: 0, errorCode: null, bloqueioIgnorado: true })
    expect(db.rpc).toHaveBeenCalledWith('api_oauth_pre', { _ip: '203.0.113.9', _client_id: 'cid', _credencial_valida: true })
    expect((await verificarOauth(db, '203.0.113.9', 'cid', false)).bloqueioIgnorado).toBe(false)
  })

  it('o /oauth-token confere o segredo antes de consultar bloqueios e marca BLOCK_BYPASSED_VALID_CREDENTIAL no sucesso', () => {
    const src = readFileSync('supabase/functions/oauth-token/index.ts', 'utf8')
    expect(src.indexOf('iguaisTempoConstante(')).toBeGreaterThan(0)
    expect(src.indexOf('iguaisTempoConstante(')).toBeLessThan(src.indexOf('verificarOauth('))
    expect(src).toMatch(/verificarOauth\(supabase, ctx\.ip, clientId, credencialValida\)/)
    expect(src).toMatch(/'sucesso', limite\.bloqueioIgnorado \? CODIGO_BLOQUEIO_IGNORADO : undefined/)
  })
})

describe('(g) equipamentos ficam de fora', () => {
  it('catálogo de exames só é registrado/limitado com credencial de parceiro', () => {
    expect(protegerListaExames({ ok: true, partnerId: null })).toBe(false)
    expect(protegerListaExames({ ok: true, partnerId: 'p' })).toBe(true)
    expect(protegerListaExames({ ok: false, partnerId: 'p' })).toBe(false)
  })

  it('funções dos servidores de equipamento não usam log nem contador', () => {
    for (const f of ['list-orders-for-integration', 'receive-instrument-result', 'receive-instrument-graphic', 'apoio-impressao-pendentes', 'apoio-impressao-confirmar']) {
      const src = readFileSync(`supabase/functions/${f}/index.ts`, 'utf8')
      expect(src, f).not.toMatch(/apiProtecao|api_limite_consumir|api_log_registrar|api_request_logs/)
    }
    expect(readFileSync('supabase/functions/_shared/integrationAuth.ts', 'utf8')).not.toMatch(/apiProtecao|api_limite|api_log/)
  })

  it('regras do partner-orders: POST por parceiro e empresa; GET por parceiro', () => {
    expect(regrasPartnerOrders('POST', 'p', 'e')).toEqual([{ regra: 'partner_post_parceiro', chave: 'p' }, { regra: 'partner_post_empresa', chave: 'e' }])
    expect(regrasPartnerOrders('GET', 'p', 'e')).toEqual([{ regra: 'partner_get_parceiro', chave: 'p' }])
  })
})
