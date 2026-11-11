import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Mudar origem em qualquer status + portal mostra exames Aguardando — PGlite isolado, sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const ADM = '00000000-0000-4000-8000-000000000011'
const O1 = '00000000-0000-4000-8000-0000000000a1'
const O2 = '00000000-0000-4000-8000-0000000000a2'
const MIG = 'drizzle/migrations/0149_portal_origem_qualquer_status.sql'
const uma = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows[0]
const pedido = async (status: string, guides: object[] = []) =>
  (await uma(`INSERT INTO attendance_orders(company_id,origin_id,origin_name,status,lab_guides,patient_name)
    VALUES('${C}','${O1}','UBS A','${status}','${JSON.stringify(guides)}'::jsonb,'MARIA') RETURNING id`)).id as string
const mudar = (id: string) => db.query(`SELECT atendimento_mudar_origem('${id}','${O2}') r`)
const portal = async () => (await uma(`SELECT portal_fetch('P1','1234') r`)).r

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${ADM}'::uuid $$;
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${C}'::uuid $$;
    CREATE FUNCTION atendimento_detalhes_tem_permissao(p text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE origins(id uuid PRIMARY KEY, company_id uuid, name text, internal_code text);
    INSERT INTO origins VALUES('${O1}','${C}','UBS A','01'),('${O2}','${C}','UBS B','02');
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, origin_id uuid, origin_code int,
      origin_name text, status text, lab_guides jsonb, patient_name text, patient_id uuid, doctor_id uuid, protocol text,
      order_number text, delivery_date timestamptz, doctor_name text, convenio_name text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz);
    CREATE TABLE apoio_auditoria(company_id uuid, tabela text, registro_id text, acao text, antes jsonb, depois jsonb, usuario_id uuid);
    CREATE TABLE lab_exam_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, exam_ref text, exam_name text,
      exam_code text, status text, released_at timestamptz, portal_blocked_types text[]);
    CREATE TABLE external_accesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, type text, name text,
      status text DEFAULT 'active', access_code text, access_password text, origin_id uuid, doctor_id uuid, patient_id uuid,
      partner_origin_ids uuid[]);
    CREATE TABLE external_access_logs(access_code text, success boolean, created_at timestamptz DEFAULT now());
    CREATE TABLE company_branding(company_id uuid, brand_name text, logo_url text);
    CREATE TABLE companies(id uuid, name text);
    INSERT INTO external_accesses(company_id,type,name,access_code,access_password,origin_id) VALUES('${C}','local','UBS B','P1','1234','${O2}');
  `)
  await db.exec(readFileSync(MIG, 'utf8'))
})
afterEach(async () => { await db.close() })

describe('Mudar origem e Portal Externo', () => {
  it.each(['collection_done', 'in_analysis', 'released', 'completed'])('muda a origem com status %s e o paciente aparece no portal novo', async (st) => {
    const id = await pedido(st)
    await mudar(id)
    const r = await portal()
    expect(r.orders.map((o: any) => o.id)).toEqual([id])
  })
  it('não muda origem de atendimento excluído ou cancelado', async () => {
    await expect(mudar(await pedido('deleted'))).rejects.toThrow(/excluído ou cancelado/)
    await expect(mudar(await pedido('cancelled'))).rejects.toThrow(/excluído ou cancelado/)
  })
  it('portal mostra exame Aguardando, digitado e liberado sem repetir', async () => {
    const id = await pedido('collection_done', [{ exams: [
      { id: 'e1', name: 'Glicose', internalCode: 'GL' },
      { id: 'e2', name: 'Ureia', internalCode: 'URE' },
      { id: 'e3', name: 'Hemograma', internalCode: 'H' },
    ] }])
    await db.exec(`INSERT INTO lab_exam_results(order_id,exam_ref,exam_name,exam_code,status) VALUES
      ('${id}','${id}:e2','Ureia','URE','digitized'),('${id}','${id}:e3','Hemograma','H','released')`)
    await mudar(id)
    const ex = (await portal()).orders[0].exams.map((e: any) => `${e.name}:${e.status}`)
    expect(ex).toEqual(['Glicose:pending', 'Hemograma:released', 'Ureia:digitized'])
  })
})
