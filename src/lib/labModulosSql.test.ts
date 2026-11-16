import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Super Admin liga/desliga Soroteca, Painel Operacional e Relatórios de QUALQUER empresa (PGlite, dados fictícios).
let db: PGlite
const EMPRESA = '00000000-0000-4000-8000-000000000002'
const SUPER = '00000000-0000-4000-8000-000000000099'
const ADMIN = '00000000-0000-4000-8000-000000000021'
const como = (uid: string) => db.exec(`SET test.uid = '${uid}';`)
const erro = async (sql: string) => { try { await db.query(sql); return '' } catch (e) { return (e as Error).message } }
const situacao = async () => (await db.query<{ s: Record<string, boolean> }>(`SELECT lab_modulos_situacao('${EMPRESA}') s`)).rows[0].s

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid() = '${SUPER}'::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    INSERT INTO companies VALUES('${EMPRESA}');
    CREATE FUNCTION soroteca__usuario_nome() RETURNS text LANGUAGE sql AS $$ SELECT 'Super' $$;
    CREATE TABLE soroteca_modulo(company_id uuid PRIMARY KEY, ativo boolean, alterado_por uuid, alterado_por_nome text, alterado_em timestamptz);
    CREATE TABLE lab_painel_modulo(company_id uuid PRIMARY KEY, ativo boolean, alterado_por uuid, alterado_em timestamptz);
    CREATE TABLE lab_relatorios_modulo(company_id uuid PRIMARY KEY, ativo boolean, alterado_por uuid, alterado_em timestamptz);
  `)
  await db.exec(readFileSync('drizzle/migrations/0177_lab_modulos_super_admin.sql', 'utf8'))
})
afterEach(async () => { await db.close() })

describe('módulos do laboratório por empresa', () => {
  it('Super Admin liga e desliga cada módulo de outra empresa', async () => {
    await como(SUPER)
    expect(await situacao()).toEqual({ soroteca: false, painel: false, relatorios: false })
    await db.query(`SELECT lab_modulo_definir('${EMPRESA}','soroteca',true)`)
    await db.query(`SELECT lab_modulo_definir('${EMPRESA}','painel',true)`)
    expect(await situacao()).toEqual({ soroteca: true, painel: true, relatorios: false })
    await db.query(`SELECT lab_modulo_definir('${EMPRESA}','soroteca',false)`)
    expect((await situacao()).soroteca).toBe(false)
  })

  it('administrador da empresa não vê nem altera', async () => {
    await como(ADMIN)
    expect(await erro(`SELECT lab_modulo_definir('${EMPRESA}','soroteca',true)`)).toMatch(/Só o Super Admin/)
    expect(await erro(`SELECT lab_modulos_situacao('${EMPRESA}')`)).toMatch(/Só o Super Admin/)
  })

  it('recusa módulo ou empresa desconhecidos', async () => {
    await como(SUPER)
    expect(await erro(`SELECT lab_modulo_definir('${EMPRESA}','outro',true)`)).toMatch(/desconhecido/)
    expect(await erro(`SELECT lab_modulo_definir('${SUPER}','soroteca',true)`)).toMatch(/não encontrada/)
  })
})
