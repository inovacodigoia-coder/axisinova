import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Portal Externo acompanha recoleta/cancelamento do Detalhes Atendimento — PGlite isolado, sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const O1 = '00000000-0000-4000-8000-0000000000a1'
const MIG = process.env.PORTAL_MIG || 'drizzle/migrations/0150_portal_status_recoleta.sql'
const uma = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows[0]
const pedido = async (exams: object[]) =>
  (await uma(`INSERT INTO attendance_orders(company_id,origin_id,origin_name,status,lab_guides,patient_name)
    VALUES('${C}','${O1}','UBS A','collection_done','${JSON.stringify([{ exams }])}'::jsonb,'MARIA') RETURNING id`)).id as string
const status = async () =>
  Object.fromEntries((await uma(`SELECT portal_fetch('P1','1234') r`)).r.orders[0].exams.map((e: any) => [e.name, e.status]))
const resultado = (id: string, ref: string, name: string, st: string, typedAt: string) =>
  db.exec(`INSERT INTO lab_exam_results(order_id,exam_ref,exam_name,exam_code,status,typed_at)
    VALUES('${id}','${id}:${ref}','${name}','X','${st}','${typedAt}')`)

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, origin_id uuid,
      origin_name text, status text, lab_guides jsonb, patient_name text, patient_id uuid, doctor_id uuid, protocol text,
      order_number text, delivery_date timestamptz, doctor_name text, convenio_name text, created_at timestamptz DEFAULT now());
    CREATE TABLE lab_exam_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, exam_ref text, exam_name text,
      exam_code text, status text, typed_at timestamptz, released_at timestamptz, portal_blocked_types text[]);
    CREATE TABLE external_accesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, type text, name text,
      status text DEFAULT 'active', access_code text, access_password text, origin_id uuid, doctor_id uuid, patient_id uuid,
      partner_origin_ids uuid[]);
    CREATE TABLE external_access_logs(access_code text, success boolean, created_at timestamptz DEFAULT now());
    CREATE TABLE company_branding(company_id uuid, brand_name text, logo_url text);
    CREATE TABLE companies(id uuid, name text);
    INSERT INTO external_accesses(company_id,type,name,access_code,access_password,origin_id) VALUES('${C}','local','UBS A','P1','1234','${O1}');
  `)
  await db.exec(readFileSync(MIG, 'utf8'))
})
afterEach(async () => { await db.close() })

const rec = { requestedAt: '2026-11-10T12:00:00Z', reason: 'Outro' }

describe('Portal Externo segue o Detalhes Atendimento', () => {
  it('recoleta solicitada sem resultado aparece como Aberto', async () => {
    await pedido([{ id: 'e1', name: 'Amilase', recollection: rec }, { id: 'e2', name: 'Glicose' }])
    expect(await status()).toEqual({ Amilase: 'open', Glicose: 'pending' })
  })
  it('recoleta depois da digitação antiga aparece como Aberto', async () => {
    const id = await pedido([{ id: 'e1', name: 'Lipase', recollection: rec }])
    await resultado(id, 'e1', 'Lipase', 'digitized', '2026-11-10T10:00:00Z')
    expect(await status()).toEqual({ Lipase: 'open' })
  })
  it('digitado de novo depois da recoleta volta a Em Análise', async () => {
    const id = await pedido([{ id: 'e1', name: 'Lipase', recollection: rec }])
    await resultado(id, 'e1', 'Lipase', 'digitized', '2026-11-10T14:00:00Z')
    expect(await status()).toEqual({ Lipase: 'digitized' })
  })
  it('liberado continua Liberado mesmo com recoleta', async () => {
    const id = await pedido([{ id: 'e1', name: 'Lipase', recollection: rec }])
    await resultado(id, 'e1', 'Lipase', 'released', '2026-11-10T10:00:00Z')
    expect(await status()).toEqual({ Lipase: 'released' })
  })
  it('exame cancelado na guia aparece Cancelado mesmo com digitação', async () => {
    const id = await pedido([{ id: 'e1', name: 'Ureia', status: 'cancelled' }])
    await resultado(id, 'e1', 'Ureia', 'digitized', '2026-11-10T10:00:00Z')
    expect(await status()).toEqual({ Ureia: 'cancelled' })
  })
  it('data de recoleta inválida não quebra o portal', async () => {
    const id = await pedido([{ id: 'e1', name: 'Lipase', recollection: { requestedAt: 'ontem' } }])
    await resultado(id, 'e1', 'Lipase', 'digitized', '2026-11-10T14:00:00Z')
    expect(await status()).toEqual({ Lipase: 'open' })
  })
})
