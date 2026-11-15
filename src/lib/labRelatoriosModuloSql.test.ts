import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Relatórios Gerenciais — liberação por empresa (PGlite, só dados fictícios).
let db: PGlite
const LABSAUDE = '7858af33-878e-40c4-9305-e912cc6655c3'
const TOUROS = '00000000-0000-4000-8000-000000000002'
const ADM_LAB = '00000000-0000-4000-8000-000000000011'
const BIO_LAB = '00000000-0000-4000-8000-000000000012'
const ADM_OUT = '00000000-0000-4000-8000-000000000021'
const BIO_OUT = '00000000-0000-4000-8000-000000000022'

const como = (uid: string) => db.exec(`SET test.uid = '${uid}';`)
const pode = async () => (await db.query<{ ok: boolean }>(`SELECT lab_relatorios_tem_permissao() ok`)).rows[0].ok

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, full_name text);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE FUNCTION is_company_manager(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND role='company_admin') $$;
    CREATE TABLE access_profiles(id text PRIMARY KEY, company_id uuid, permissions jsonb, is_active boolean DEFAULT true);
    CREATE TABLE company_sectors(id uuid PRIMARY KEY, is_active boolean DEFAULT true, allowed_profile_ids text[]);
    CREATE TABLE sector_users(user_id uuid, sector_id uuid);
    INSERT INTO companies VALUES('${LABSAUDE}'), ('${TOUROS}');
    INSERT INTO profiles VALUES('${ADM_LAB}','${LABSAUDE}','company_admin','Adm'),('${BIO_LAB}','${LABSAUDE}','biochemist','Ana Bio'),
      ('${ADM_OUT}','${TOUROS}','company_admin','Adm2'),('${BIO_OUT}','${TOUROS}','biochemist','Bio2');
    INSERT INTO access_profiles VALUES('p_lab','${LABSAUDE}','{"lab":["lab.relatorios_gerenciais"]}'),('p_out','${TOUROS}','{"lab":["lab.relatorios_gerenciais"]}');
    INSERT INTO company_sectors VALUES('00000000-0000-4000-8000-0000000000f1',true,'{p_lab}'),('00000000-0000-4000-8000-0000000000f2',true,'{p_out}');
    INSERT INTO sector_users VALUES('${BIO_LAB}','00000000-0000-4000-8000-0000000000f1'),('${BIO_OUT}','00000000-0000-4000-8000-0000000000f2');
  `)
  await db.exec(readFileSync('drizzle/migrations/0175_lab_relatorios_modulo.sql', 'utf8'))
  await db.exec(`
    CREATE TABLE patients(id uuid PRIMARY KEY, name text);
    CREATE TABLE exams(id uuid PRIMARY KEY, name text, workbench_id uuid);
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY, company_id uuid, protocol text, patient_id uuid, patient_name text, is_urgent boolean,
      created_at timestamptz, updated_at timestamptz, origin_name text, status text, exam_mode text, lab_guides jsonb);
    CREATE TABLE lab_exam_results(company_id uuid, order_id uuid, exam_ref text, status text, released_at timestamptz, released_by uuid);
    CREATE TABLE lab_critico_notificacao(company_id uuid, notified_at timestamptz);
    CREATE TABLE lab_settings(company_id uuid, responsible_name text, responsible_register text, report_logo_primary_url text);
  `)
})
afterEach(async () => { await db.close() })

describe('Relatórios Gerenciais — liberação por empresa', () => {
  it('na labsaude fica ligado para quem tem a permissão e para o administrador', async () => {
    await como(BIO_LAB)
    expect(await pode()).toBe(true)
    expect((await db.query<{ a: boolean }>(`SELECT lab_relatorios_modulo_ativo() a`)).rows[0].a).toBe(true)
    await como(ADM_LAB)
    expect(await pode()).toBe(true)
  })

  it('nas demais empresas ninguém acessa, nem o administrador, mesmo com a permissão marcada', async () => {
    await como(BIO_OUT)
    expect(await pode()).toBe(false)
    expect((await db.query<{ a: boolean }>(`SELECT lab_relatorios_modulo_ativo() a`)).rows[0].a).toBe(false)
    await como(ADM_OUT)
    expect(await pode()).toBe(false)
    await expect(db.query(`SELECT lab_relatorio_gerencial(now() - interval '1 day', now())`)).rejects.toThrow(/Sem permissão/)
  })

  it('o relatório traz quem liberou, o nome do analista e quem pediu a recoleta', async () => {
    const o = '00000000-0000-4000-8000-0000000000c1'
    await db.exec(`
      INSERT INTO attendance_orders VALUES('${o}','${LABSAUDE}','P1',NULL,'Maria',false,now() - interval '2 hours',now(),'Posto 1','open','lab',
        '[{"exams":[{"examId":"e1","name":"Glicose","collectedAt":"2026-11-14T10:00:00Z"},{"examId":"e2","name":"TGO","recollection":{"reason":"Amostra hemolisada","requestedBy":"Ana Bio","requestedAt":"${new Date().toISOString()}"}}]}]');
      INSERT INTO lab_exam_results VALUES('${LABSAUDE}','${o}','${o}:e1','released',now() - interval '1 hour','${BIO_LAB}');
    `)
    await como(BIO_LAB)
    const v = (await db.query<{ v: any }>(`SELECT lab_relatorio_gerencial(now() - interval '1 day', now()) v`)).rows[0].v
    const e1 = v.exames.find((x: any) => x.e === 'e1')
    const e2 = v.exames.find((x: any) => x.e === 'e2')
    expect(e1.lb).toBe(BIO_LAB)
    expect(e1.p).toBe('P1')
    expect(e1.rb).toBeUndefined()
    expect(e2.rb).toBe('Ana Bio')
    expect(v.analistas).toEqual({ [BIO_LAB]: 'Ana Bio' })
  })
})
