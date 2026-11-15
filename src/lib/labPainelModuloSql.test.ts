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
  await db.exec(`
    CREATE TABLE lab_equipments(id uuid PRIMARY KEY, company_id uuid, name text, connection_type text, serial_number text, is_active boolean);
    CREATE TABLE instrument_events(id serial PRIMARY KEY, company_id uuid, equipment_id text, status text, error_message text,
      sample_barcode text, exam_name text, test_code text, received_value text, protocol text, created_at timestamptz DEFAULT now());
    INSERT INTO lab_equipments VALUES
      ('00000000-0000-4000-8000-0000000000a1','${LABSAUDE}','VIDA S2800','Bioquímico','VIDAS2800',true),
      ('00000000-0000-4000-8000-0000000000a2','${LABSAUDE}','Antigo','Bioquímico','OLD',false),
      ('00000000-0000-4000-8000-0000000000a3','${TOUROS}','Count 860','Hematológico','C860',true);
  `)
  await db.exec(readFileSync('drizzle/migrations/0174_lab_painel_aparelhos.sql', 'utf8').replace(/--> statement-breakpoint/g, ''))
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

  it('status dos aparelhos: última mensagem de cada aparelho ativo e as 10 últimas do log', async () => {
    for (let i = 0; i < 12; i++) {
      await db.exec(`INSERT INTO instrument_events(company_id, equipment_id, status, sample_barcode, created_at)
        VALUES('${LABSAUDE}',' vidas2800 ','processed','A${i}', now() - interval '${60 - i} minutes')`)
    }
    await db.exec(`INSERT INTO instrument_events(company_id, equipment_id, status, error_message, created_at)
      VALUES('${LABSAUDE}','VIDAS2800','error','Amostra não encontrada', now() - interval '2 minutes'),
            ('${TOUROS}','VIDAS2800','processed',null, now())`)
    await como(BIO_LAB)
    const ap = (await db.query<any>(`SELECT * FROM lab_painel_aparelhos()`)).rows
    expect(ap.map(a => a.nome)).toEqual(['VIDA S2800'])
    expect(ap[0].ultimo_status).toBe('error')
    expect(ap[0].ultimo_erro).toBe('Amostra não encontrada')
    const log = (await db.query<any>(`SELECT * FROM lab_painel_aparelho_log('00000000-0000-4000-8000-0000000000a1')`)).rows
    expect(log).toHaveLength(10)
    expect(log[0].status).toBe('error')
    await expect(db.query(`SELECT * FROM lab_painel_aparelho_log('00000000-0000-4000-8000-0000000000a3')`)).rejects.toThrow(/não encontrado/)
  })

  it('status dos aparelhos fica fechado nas empresas com o painel desligado', async () => {
    await como(ADM_OUT)
    await expect(db.query(`SELECT * FROM lab_painel_aparelhos()`)).rejects.toThrow(/Sem permissão/)
  })
})
