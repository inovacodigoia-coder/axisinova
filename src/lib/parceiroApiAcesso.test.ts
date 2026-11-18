import { describe, it, expect } from 'vitest'
import {
  avaliarCliente,
  carregarCliente,
  consultarPedidoParceiro,
  iguaisTempoConstante,
} from '../../supabase/functions/_shared/parceiroAcesso'

// Banco em memória com o mínimo do cliente Supabase usado pelas regras.
type Row = Record<string, any>
function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const filters: [string, unknown][] = []
      let lim: number | null = null
      const run = () => {
        let rows = (tables[table] || []).filter(r => filters.every(([k, v]) => r[k] === v))
        if (lim !== null) rows = rows.slice(0, lim)
        return rows
      }
      const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q },
        order: () => q,
        limit: (n: number) => { lim = n; return q },
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ data: run(), error: null }).then(res, rej),
      }
      return q
    },
  }
}

const EMPRESA = 'emp-1'
const PARCEIRO_A = 'parc-a'
const PARCEIRO_B = 'parc-b'

const base = () => ({
  companies: [{ id: EMPRESA, partner_api_enabled: true }],
  api_partners: [
    { id: PARCEIRO_A, company_id: EMPRESA, status: 'active', api_authorized: true },
    { id: PARCEIRO_B, company_id: EMPRESA, status: 'active', api_authorized: true },
    { id: 'parc-pend', company_id: EMPRESA, status: 'pending', api_authorized: true },
  ],
  integration_oauth_clients: [
    { id: 'c1', company_id: EMPRESA, client_id: 'cid-a', secret_hash: 'h', scopes: [], is_active: true, revoked_at: null, partner_id: PARCEIRO_A, uso: 'parceiro' },
    { id: 'c2', company_id: EMPRESA, client_id: 'cid-pend', secret_hash: 'h', scopes: [], is_active: true, revoked_at: null, partner_id: 'parc-pend', uso: 'parceiro' },
    { id: 'c3', company_id: EMPRESA, client_id: 'cid-equip', secret_hash: 'h', scopes: [], is_active: true, revoked_at: null, partner_id: null, uso: 'instrumento' },
  ],
  partner_orders: [
    { id: 'po-b', company_id: EMPRESA, partner_id: PARCEIRO_B, protocolo_parceiro: 'PED-B-1', attendance_order_id: null, status: 'received', created_at: '2026-11-01T10:00:00Z',
      payload: { paciente: { nome: 'Maria B', cpf: '12345678909' }, _resolved: { exams: [{ code: 'GLI', name: 'Glicose' }] } } },
    { id: 'po-a', company_id: EMPRESA, partner_id: PARCEIRO_A, protocolo_parceiro: 'PED-A-1', attendance_order_id: 'ord-1', status: 'processed', created_at: '2026-11-02T10:00:00Z',
      payload: { paciente: { nome: 'João A', cpf: '98765432100' } } },
  ],
  attendance_orders: [
    { id: 'ord-1', company_id: EMPRESA, order_number: '192-00', protocol: '192-00', status: 'in_analysis', updated_at: '2026-11-03T10:00:00Z', patient_name: 'João A',
      lab_guides: [{ exams: [{ internalCode: 'TSH', name: 'TSH' }] }] },
    { id: 'ord-interno', company_id: EMPRESA, order_number: '500-00', protocol: '500-00', status: 'open', patient_name: 'Paciente Interno', lab_guides: [] },
  ],
  lab_exam_results: [{ company_id: EMPRESA, order_id: 'ord-1', exam_code: 'TSH', status: 'released' }],
})

describe('GET /partner-orders/{ref}', () => {
  it('(a) parceiro A não lê pedido do parceiro B: 404 igual ao inexistente', async () => {
    const db = fakeDb(base())
    const deB = await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_A, ref: 'PED-B-1' })
    const inexistente = await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_A, ref: 'NAO-EXISTE' })
    expect(deB.status).toBe(404)
    expect(deB).toEqual(inexistente)
  })

  it('(b) parceiro não lê atendimento interno pelo protocolo interno', async () => {
    const db = fakeDb(base())
    const r = await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_A, ref: '500-00' })
    expect(r.status).toBe(404)
    // nem o próprio pedido pelo número interno: só pelo protocolo_parceiro
    expect((await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_A, ref: '192-00' })).status).toBe(404)
  })

  it('(c) ref com vírgula, parênteses ou operadores retorna 400 INVALID_REFERENCE', async () => {
    const db = fakeDb(base())
    for (const ref of ['a,b', 'x)', 'order_number.eq.1,protocol.eq.2', 'a=b', 'a*', 'a b', 'x'.repeat(65)]) {
      const r = await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_A, ref })
      expect(r.status, ref).toBe(400)
      expect(r.body.error).toBe('INVALID_REFERENCE')
    }
  })

  it('(d) resposta não contém nome, CPF nem payload', async () => {
    const db = fakeDb(base())
    const criado = await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_A, ref: 'PED-A-1' })
    const naFila = await consultarPedidoParceiro(db, { companyId: EMPRESA, partnerId: PARCEIRO_B, ref: 'PED-B-1' })
    expect(criado.status).toBe(200)
    expect(criado.body).toMatchObject({ protocolo: '192-00', status: 'EM_ANALISE', exames: [{ codigo: 'TSH', nome: 'TSH', status: 'LIBERADO' }] })
    expect(naFila.body).toMatchObject({ protocolo: null, status: 'AGUARDANDO_AUTORIZACAO', exames: [{ codigo: 'GLI', nome: 'Glicose', status: 'RECEBIDO' }] })
    for (const r of [criado, naFila]) {
      const txt = JSON.stringify(r.body)
      expect(r.body).not.toHaveProperty('paciente')
      expect(r.body).not.toHaveProperty('payload')
      expect(txt).not.toMatch(/João A|Maria B|12345678909|98765432100|cpf/i)
    }
  })
})

describe('estado da credencial e do parceiro a cada chamada', () => {
  it('(e) parceiro Pendente não é liberado (oauth-token não emite token)', async () => {
    const db = fakeDb(base())
    const r = await avaliarCliente(db, await carregarCliente(db, 'cid-pend'))
    expect(r).toMatchObject({ ok: false, status: 403, code: 'PARTNER_NOT_AUTHORIZED' })
  })

  it('(f) token já emitido para de valer após revogar a credencial ou desativar o parceiro', async () => {
    const t = base()
    const db = fakeDb(t)
    expect((await avaliarCliente(db, await carregarCliente(db, 'cid-a'))).ok).toBe(true)

    t.api_partners[0].status = 'inactive'
    expect(await avaliarCliente(db, await carregarCliente(db, 'cid-a'))).toMatchObject({ ok: false, code: 'PARTNER_NOT_AUTHORIZED' })
    t.api_partners[0].status = 'active'

    t.api_partners[0].api_authorized = false
    expect(await avaliarCliente(db, await carregarCliente(db, 'cid-a'))).toMatchObject({ ok: false, code: 'PARTNER_NOT_AUTHORIZED' })
    t.api_partners[0].api_authorized = true

    t.companies[0].partner_api_enabled = false
    expect(await avaliarCliente(db, await carregarCliente(db, 'cid-a'))).toMatchObject({ ok: false, code: 'PARTNER_NOT_AUTHORIZED' })
    t.companies[0].partner_api_enabled = true

    t.integration_oauth_clients[0].is_active = false
    t.integration_oauth_clients[0].revoked_at = '2026-11-18T00:00:00Z'
    expect(await avaliarCliente(db, await carregarCliente(db, 'cid-a'))).toMatchObject({ ok: false, status: 401, code: 'UNAUTHORIZED' })
  })

  it('credencial de parceiro sem parceiro vinculado não funciona; a de equipamento continua', async () => {
    const t = base()
    t.integration_oauth_clients.push({ id: 'c4', company_id: EMPRESA, client_id: 'cid-orfa', secret_hash: 'h', scopes: [], is_active: true, revoked_at: null, partner_id: null, uso: 'parceiro' })
    const db = fakeDb(t)
    expect(await avaliarCliente(db, await carregarCliente(db, 'cid-orfa'))).toMatchObject({ ok: false, code: 'PARTNER_NOT_AUTHORIZED' })
    expect(await avaliarCliente(db, await carregarCliente(db, 'cid-equip'))).toMatchObject({ ok: true, partnerId: null })
  })

  it('comparação do hash do segredo', () => {
    expect(iguaisTempoConstante('abc123', 'abc123')).toBe(true)
    expect(iguaisTempoConstante('abc123', 'abc124')).toBe(false)
    expect(iguaisTempoConstante('abc', 'abcd')).toBe(false)
  })
})
