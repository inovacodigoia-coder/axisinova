import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Número do pedido único na empresa, mesmo depois de "Mudar origem" — PGlite isolado, sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'
const CENTRO = '00000000-0000-4000-8000-0000000000a1'
const HOSPITAL = '00000000-0000-4000-8000-0000000000a2'
const MIG = process.env.NUMERO_PEDIDO_MIG
  || `drizzle/migrations/${readdirSync('drizzle/migrations').find(f => /numero_pedido_unico/.test(f))}`
const uma = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows[0]
const proximo = async (origem: string, codigo: string, empresa = C) =>
  (await uma(`SELECT next_attendance_order_number('${empresa}','${origem}','${codigo}') n`)).n as string
const inserir = (numero: string, origem: string, empresa = C) =>
  db.query(`INSERT INTO attendance_orders(company_id,origin_id,order_number,protocol) VALUES('${empresa}','${origem}','${numero}','${numero}')`)
const criar = async (origem: string, codigo: string) => { const n = await proximo(origem, codigo); await inserir(n, origem); return n }
const mudarOrigem = (numero: string, origem: string) =>
  db.query(`UPDATE attendance_orders SET origin_id='${origem}' WHERE order_number='${numero}' AND company_id='${C}'`)

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, origin_id uuid,
      order_number text, protocol text, status text DEFAULT 'open', patient_name text);
  `)
  await db.exec(readFileSync(MIG, 'utf8'))
})
afterEach(async () => { await db.close() })

describe('Número do pedido único na empresa', () => {
  it('depois de mudar a origem, a origem antiga não repete o número (caso 3-01)', async () => {
    expect(await criar(CENTRO, '01')).toBe('1-01')
    expect(await criar(CENTRO, '01')).toBe('2-01')
    expect(await criar(CENTRO, '01')).toBe('3-01')
    await mudarOrigem('3-01', HOSPITAL)
    expect(await proximo(CENTRO, '01')).toBe('4-01')
  })

  it('a origem nova continua a própria sequência e o pedido movido mantém o número', async () => {
    await criar(CENTRO, '01')
    expect(await criar(HOSPITAL, '02')).toBe('1-02')
    await mudarOrigem('1-01', HOSPITAL)
    expect(await proximo(HOSPITAL, '02')).toBe('2-02')
    expect((await uma(`SELECT order_number FROM attendance_orders WHERE origin_id='${HOSPITAL}' ORDER BY order_number`)).order_number).toBe('1-01')
  })

  it('bloqueia gravar um número que já existe na empresa, mesmo em outra origem', async () => {
    await criar(CENTRO, '01')
    await mudarOrigem('1-01', HOSPITAL)
    await expect(inserir('1-01', CENTRO)).rejects.toThrow(/já existe nesta empresa/)
  })

  it('outra empresa pode ter o mesmo número', async () => {
    await criar(CENTRO, '01')
    await expect(inserir('1-01', CENTRO, C2)).resolves.toBeTruthy()
  })

  it('pedido antigo já repetido continua editável', async () => {
    await db.exec(`ALTER TABLE attendance_orders DISABLE TRIGGER trg_attendance_orders_numero_unico`)
    await inserir('5-01', CENTRO); await inserir('5-01', HOSPITAL)
    await db.exec(`ALTER TABLE attendance_orders ENABLE TRIGGER trg_attendance_orders_numero_unico`)
    await expect(db.query(`UPDATE attendance_orders SET status='released', order_number=order_number WHERE order_number='5-01'`)).resolves.toBeTruthy()
    expect(await proximo(CENTRO, '01')).toBe('6-01')
  })
})
