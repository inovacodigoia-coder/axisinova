import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'

const SQL = readFileSync('drizzle/migrations/0203_preferencias_formato_impressao.sql', 'utf8')
const UID = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'
const COMPANY = '00000000-0000-4000-8000-000000000003'
const SECOND = '00000000-0000-4000-8000-000000000004'
let db: PGlite
beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.uid')::uuid $$;
    CREATE FUNCTION public.get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${COMPANY}'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE TABLE public.companies (id uuid PRIMARY KEY);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY);
    INSERT INTO companies VALUES ('${COMPANY}'), ('${SECOND}');
    INSERT INTO profiles VALUES ('${UID}'), ('${OTHER}');
    SELECT set_config('test.uid', '${UID}', false);
  `)
  await db.exec(SQL)
})
afterEach(async () => { await db.close() })

it('o usuário salva A4 e só lê a sua própria preferência', async () => {
  await db.exec(`INSERT INTO usuario_formato_impressao VALUES ('${OTHER}', '${COMPANY}', 'comprovante', 'A5'); SET ROLE authenticated;`)
  await db.exec(`INSERT INTO usuario_formato_impressao VALUES ('${UID}', '${COMPANY}', 'comprovante', 'A4')`)
  expect((await db.query('SELECT documento, formato FROM usuario_formato_impressao')).rows).toEqual([{ documento: 'comprovante', formato: 'A4' }])
})

it('não pode salvar a preferência de outra pessoa ou empresa', async () => {
  await db.exec('SET ROLE authenticated')
  await expect(db.exec(`INSERT INTO usuario_formato_impressao VALUES ('${OTHER}', '${COMPANY}', 'comprovante', 'A4')`)).rejects.toThrow()
  await expect(db.exec(`INSERT INTO usuario_formato_impressao VALUES ('${UID}', '${SECOND}', 'comprovante', 'A4')`)).rejects.toThrow()
})

it('visitantes não têm acesso e etiquetas não aceitam formato A4', async () => {
  await db.exec('SET ROLE anon')
  await expect(db.query('SELECT * FROM usuario_formato_impressao')).rejects.toThrow()
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await expect(db.exec(`INSERT INTO usuario_formato_impressao VALUES ('${UID}', '${COMPANY}', 'etiqueta_extra', 'A4')`)).rejects.toThrow()
})