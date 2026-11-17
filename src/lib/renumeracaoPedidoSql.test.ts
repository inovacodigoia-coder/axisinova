import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Troca do número de pedidos repetidos — PGlite isolado, sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const CENTRO = '00000000-0000-4000-8000-0000000000a1'
const HOSPITAL = '00000000-0000-4000-8000-0000000000a2'
const migr = (re: RegExp) => `drizzle/migrations/${readdirSync('drizzle/migrations').find(f => re.test(f))}`
const uma = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows[0]
const pedido = async (numero: string, origem: string, status = 'completed') =>
  (await uma(`INSERT INTO attendance_orders(company_id,origin_id,order_number,protocol,status) VALUES('${C}','${origem}','${numero}','${numero}','${status}') RETURNING id`)).id as string
const trocar = (id: string, motivo = 'Número repetido em outra origem') =>
  db.query(`INSERT INTO attendance_order_renumeracao(order_id,motivo,company_id,numero_anterior,numero_novo) VALUES('${id}','${motivo}','${C}','x','x')`)

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, origin_id uuid,
      order_number text, protocol text, status text DEFAULT 'open', patient_name text);
    CREATE TABLE lab_exam_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, protocol text, status text);
    CREATE TABLE lab_result_graphics(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, protocol text, sample_barcode text);
    CREATE TABLE triage_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, protocol text);
    CREATE TABLE support_cards(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_order_id uuid, source_protocol text, source_order_number text);
    CREATE TABLE apoio_pedido_exame(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pedido_id uuid);
    CREATE TABLE soroteca_amostra(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid);
  `)
  await db.exec(readFileSync(migr(/numero_pedido_unico/), 'utf8'))
  await db.exec(readFileSync(migr(/renumeracao_pedidos_repetidos/), 'utf8'))
})
afterEach(async () => { await db.close() })

async function repetido(numero: string) {
  await db.exec(`ALTER TABLE attendance_orders DISABLE TRIGGER trg_attendance_orders_numero_unico`)
  const a = await pedido(numero, HOSPITAL)
  const b = await pedido(numero, CENTRO, 'released')
  await db.exec(`ALTER TABLE attendance_orders ENABLE TRIGGER trg_attendance_orders_numero_unico`)
  return { a, b }
}

describe('Troca do número de pedido repetido', () => {
  it('dá o próximo número livre da mesma origem e registra o anterior (caso 3-01)', async () => {
    await pedido('4-01', CENTRO)
    const { a, b } = await repetido('3-01')
    await trocar(b)
    expect((await uma(`SELECT order_number, protocol FROM attendance_orders WHERE id='${b}'`))).toEqual({ order_number: '5-01', protocol: '5-01' })
    expect((await uma(`SELECT order_number FROM attendance_orders WHERE id='${a}'`)).order_number).toBe('3-01')
    expect(await uma(`SELECT numero_anterior, numero_novo FROM attendance_order_renumeracao`)).toEqual({ numero_anterior: '3-01', numero_novo: '5-01' })
  })

  it('leva junto resultados, gráficos e triagem, mesmo liberados, e não mexe no outro paciente', async () => {
    const { a, b } = await repetido('3-01')
    await db.exec(`INSERT INTO lab_exam_results(order_id,protocol,status) VALUES('${b}','3-01','released'),('${a}','3-01','typed');
      INSERT INTO lab_result_graphics(order_id,protocol,sample_barcode) VALUES('${b}','3-01','B4ICI4R12');
      INSERT INTO triage_entries(order_id,protocol) VALUES('${b}','3-01');`)
    await trocar(b)
    expect((await uma(`SELECT protocol, status FROM lab_exam_results WHERE order_id='${b}'`))).toEqual({ protocol: '4-01', status: 'released' })
    expect((await uma(`SELECT protocol FROM lab_exam_results WHERE order_id='${a}'`)).protocol).toBe('3-01')
    expect((await uma(`SELECT protocol, sample_barcode FROM lab_result_graphics WHERE order_id='${b}'`))).toEqual({ protocol: '4-01', sample_barcode: 'B4ICI4R12' })
    expect((await uma(`SELECT protocol FROM triage_entries WHERE order_id='${b}'`)).protocol).toBe('4-01')
  })

  it('o número anterior nunca volta a ser entregue', async () => {
    const { b } = await repetido('3-01')
    await trocar(b)
    expect((await uma(`SELECT next_attendance_order_number('${C}','${CENTRO}','01') n`)).n).toBe('5-01')
  })

  it('recusa sem motivo, com amostra na Soroteca ou exame no apoio', async () => {
    const { b } = await repetido('3-01')
    await expect(trocar(b, 'curto')).rejects.toThrow(/motivo/)
    await db.exec(`INSERT INTO soroteca_amostra(order_id) VALUES('${b}')`)
    await expect(trocar(b)).rejects.toThrow(/Soroteca/)
    await db.exec(`DELETE FROM soroteca_amostra; INSERT INTO apoio_pedido_exame(pedido_id) VALUES('${b}')`)
    await expect(trocar(b)).rejects.toThrow(/apoio/)
    expect((await uma(`SELECT order_number FROM attendance_orders WHERE id='${b}'`)).order_number).toBe('3-01')
  })

  it('o registro da troca não pode ser alterado nem apagado', async () => {
    const { b } = await repetido('3-01')
    await trocar(b)
    await expect(db.query(`UPDATE attendance_order_renumeracao SET numero_novo='9-01'`)).rejects.toThrow(/não pode ser alterado/)
    await expect(db.query(`DELETE FROM attendance_order_renumeracao`)).rejects.toThrow(/não pode ser alterado/)
  })
})
