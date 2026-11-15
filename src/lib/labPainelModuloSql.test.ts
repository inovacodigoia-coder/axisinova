import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Painel Operacional — liberação por empresa (PGlite, só dados fictícios).
let db: PGlite
const LABSAUDE = '7858af33-878e-40c4-9305-e912cc6655c3'
const TOUROS = '00000000-0000-4000-8000-000000000002'
const ADM_LAB = '00000000-0000-4000-8000-000000000011'
const BIO_LAB = '00000000-0000-4000-8000-000000000012'
const ADM_OUT = '00000000-0000-4000-8000-000000000021'
const BIO_OUT = '00000000-0000-4000-8000-000000000022'

const como = (uid: string) => db.exec(`SET test.uid = '${uid}';`)
const pode = async () => (await db.query<{ ok: boolean }>(`SELECT lab_painel_tem_permissao() ok`)).rows[0].ok

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE FUNCTION is_company_manager(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND role='company_admin') $$;
    CREATE TABLE access_profiles(id text PRIMARY KEY, company_id uuid, permissions jsonb, is_active boolean DEFAULT true);
    CREATE TABLE company_sectors(id uuid PRIMARY KEY, is_active boolean DEFAULT true, allowed_profile_ids text[]);
    CREATE TABLE sector_users(user_id uuid, sector_id uuid);
    INSERT INTO companies VALUES('${LABSAUDE}'), ('${TOUROS}');
    INSERT INTO profiles VALUES('${ADM_LAB}','${LABSAUDE}','company_admin'),('${BIO_LAB}','${LABSAUDE}','biochemist'),
      ('${ADM_OUT}','${TOUROS}','company_admin'),('${BIO_OUT}','${TOUROS}','biochemist');
    INSERT INTO access_profiles VALUES('p_lab','${LABSAUDE}','{"lab":["lab.painel_operacional"]}'),('p_out','${TOUROS}','{"lab":["lab.painel_operacional"]}');
    INSERT INTO company_sectors VALUES('00000000-0000-4000-8000-0000000000f1',true,'{p_lab}'),('00000000-0000-4000-8000-0000000000f2',true,'{p_out}');
    INSERT INTO sector_users VALUES('${BIO_LAB}','00000000-0000-4000-8000-0000000000f1'),('${BIO_OUT}','00000000-0000-4000-8000-0000000000f2');
  `)
  await db.exec(readFileSync('drizzle/migrations/0168_lab_painel_modulo.sql', 'utf8'))
})
afterEach(async () => { await db.close() })

describe('Painel Operacional — liberação por empresa', () => {
  it('na labsaude o painel fica ligado para quem tem a permissão e para o administrador', async () => {
    await como(BIO_LAB)
    expect(await pode()).toBe(true)
    expect((await db.query<{ a: boolean }>(`SELECT lab_painel_modulo_ativo() a`)).rows[0].a).toBe(true)
    await como(ADM_LAB)
    expect(await pode()).toBe(true)
  })

  it('nas demais empresas ninguém acessa, nem o administrador, mesmo com a permissão marcada', async () => {
    await como(BIO_OUT)
    expect(await pode()).toBe(false)
    expect((await db.query<{ a: boolean }>(`SELECT lab_painel_modulo_ativo() a`)).rows[0].a).toBe(false)
    await como(ADM_OUT)
    expect(await pode()).toBe(false)
  })
})
