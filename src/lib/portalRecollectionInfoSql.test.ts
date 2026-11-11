import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Portal Externo: marca "Recoleta solicitada" só para Parceiros, Locais e Médicos —
// PGlite isolado, sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const O1 = '00000000-0000-4000-8000-0000000000a1'
const DR = '00000000-0000-4000-8000-0000000000d1'
const PT = '00000000-0000-4000-8000-0000000000f1'
const MIG = process.env.PORTAL_MIG || 'drizzle/migrations/0151_portal_recoleta_info.sql'
const uma = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows[0]
const pedido = async (exams: object[]) =>
  (await uma(`INSERT INTO attendance_orders(company_id,origin_id,origin_name,status,lab_guides,patient_name,patient_id,doctor_id)
    VALUES('${C}','${O1}','UBS A','collection_done','${JSON.stringify([{ exams }])}'::jsonb,'MARIA','${PT}','${DR}') RETURNING id`)).id as string
const exames = async (code: string) =>
  (await uma(`SELECT portal_fetch('${code}','1234') r`)).r.orders[0].exams as any[]
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
    INSERT INTO external_accesses(company_id,type,name,access_code,access_password,origin_id) VALUES('${C}','local','UBS A','L1','1234','${O1}');
    INSERT INTO external_accesses(company_id,type,name,access_code,access_password,doctor_id) VALUES('${C}','medico','DR A','M1','1234','${DR}');
    INSERT INTO external_accesses(company_id,type,name,access_code,access_password,partner_origin_ids) VALUES('${C}','parceiro','PAR A','PA1','1234',ARRAY['${O1}']::uuid[]);
    INSERT INTO external_accesses(company_id,type,name,access_code,access_password,patient_id) VALUES('${C}','paciente','MARIA','PC1','1234','${PT}');
  `)
  await db.exec(readFileSync(MIG, 'utf8'))
})
afterEach(async () => { await db.close() })

const rec = { requestedAt: '2026-11-10T12:00:00Z', reason: 'Amostra insuficiente' }

describe('Portal Externo mostra Recoleta solicitada para Parceiro/Local/Médico', () => {
  it('local: exame sem resultado com recoleta traz a marca com a data', async () => {
    await pedido([{ id: 'e1', name: 'Amilase', recollection: rec }, { id: 'e2', name: 'Glicose' }])
    const [amilase, glicose] = await exames('L1')
    expect(amilase.status).toBe('open')
    expect(amilase.recollection).toEqual({ requestedAt: '2026-11-10T12:00:00Z' })
    expect(glicose.status).toBe('pending')
    expect(glicose.recollection).toBeNull()
  })

  it('local: exame digitado antes da recoleta traz a marca', async () => {
    const id = await pedido([{ id: 'e1', name: 'Lipase', recollection: rec }])
    await resultado(id, 'e1', 'Lipase', 'digitized', '2026-11-10T10:00:00Z')
    const [lipase] = await exames('L1')
    expect(lipase.status).toBe('open')
    expect(lipase.recollection).toEqual({ requestedAt: '2026-11-10T12:00:00Z' })
  })

  it('médico e parceiro também recebem a marca', async () => {
    await pedido([{ id: 'e1', name: 'Cálcio', recollection: rec }])
    expect((await exames('M1'))[0].recollection).toEqual({ requestedAt: '2026-11-10T12:00:00Z' })
    expect((await exames('PA1'))[0].recollection).toEqual({ requestedAt: '2026-11-10T12:00:00Z' })
  })

  it('paciente não recebe a marca, mas o status continua Aberto', async () => {
    await pedido([{ id: 'e1', name: 'Cálcio', recollection: rec }])
    const [calcio] = await exames('PC1')
    expect(calcio.status).toBe('open')
    expect(calcio.recollection).toBeNull()
  })

  it('data de recoleta inválida não quebra o portal e a marca continua', async () => {
    const id = await pedido([{ id: 'e1', name: 'Lipase', recollection: { requestedAt: 'ontem' } }])
    await resultado(id, 'e1', 'Lipase', 'digitized', '2026-11-10T14:00:00Z')
    const [lipase] = await exames('L1')
    expect(lipase.status).toBe('open')
    expect(lipase.recollection).toEqual({ requestedAt: 'ontem' })
  })

  it('exame cancelado não ganha marca', async () => {
    await pedido([{ id: 'e1', name: 'Ureia', status: 'cancelled', recollection: rec }])
    const [ureia] = await exames('L1')
    expect(ureia.status).toBe('cancelled')
    expect(ureia.recollection).toEqual({ requestedAt: '2026-11-10T12:00:00Z' })
  })
})
