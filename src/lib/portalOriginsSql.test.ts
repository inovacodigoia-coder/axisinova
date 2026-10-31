import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

describe('Edição administrativa das origens dos portais', () => {
  let db: PGlite;
  const company = '00000000-0000-0000-0000-000000000001';
  const origin = '00000000-0000-0000-0000-000000000010';
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
      CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION public.get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${company}'::uuid $$;
      CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'false')='true' $$;
      CREATE TABLE public.establishments(id uuid PRIMARY KEY, company_id uuid, name text, internal_code text);
      CREATE TABLE public.origins(id uuid PRIMARY KEY, company_id uuid, establishment_id uuid, name text, internal_code text);
      INSERT INTO establishments VALUES ('00000000-0000-0000-0000-000000000020','${company}','Original','01');
      INSERT INTO origins VALUES ('${origin}','${company}','00000000-0000-0000-0000-000000000020','Original','01'),
      ('00000000-0000-0000-0000-000000000011','${company}',NULL,'Segunda','02'),
      ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000002',NULL,'Outra empresa','03');
    `);
    await db.exec(readFileSync('drizzle/migrations/0120_portais_editar_nome_codigo_origem.sql','utf8'));
  });
  afterAll(async () => { await db.close(); });
  const login = async (admin: boolean) => db.exec(`SET test.uid='00000000-0000-0000-0000-000000000099'; SET test.admin='${admin}';`);
  it('usuário comum não edita nome/código nem diretamente nem pela função', async () => {
    await login(false);
    await expect(db.query(`SELECT portal_origem_editar('${origin}','Não permitido','05')`)).rejects.toThrow(/permissão/);
    await expect(db.query(`UPDATE origins SET name='Não permitido' WHERE id='${origin}'`)).rejects.toThrow(/administradores/);
    await expect(db.query(`UPDATE origins SET internal_code='05' WHERE id='${origin}'`)).rejects.toThrow(/administradores/);
  });
  it('administrador edita origem e unidade vinculada mantendo o mesmo identificador', async () => {
    await login(true);
    await db.query(`SELECT portal_origem_editar('${origin}',' UBS Zabelê ',' 07 ')`);
    expect((await db.query(`SELECT name,internal_code FROM origins WHERE id='${origin}'`)).rows).toEqual([{ name:'UBS ZABELÊ', internal_code:'07' }]);
    expect((await db.query(`SELECT name,internal_code FROM establishments`)).rows).toEqual([{ name:'UBS ZABELÊ', internal_code:'07' }]);
  });
  it('administrador não edita uma origem de outra empresa', async () => {
    await login(true);
    await expect(db.query(`SELECT portal_origem_editar('00000000-0000-0000-0000-000000000012','Inválido','08')`)).rejects.toThrow(/permissão/);
  });
  it('rejeita código duplicado na mesma empresa', async () => {
    await login(true);
    await expect(db.query(`SELECT portal_origem_editar('${origin}','Teste','02')`)).rejects.toThrow(/já pertence/);
    expect((await db.query(`SELECT internal_code FROM origins WHERE id='${origin}'`)).rows).toEqual([{internal_code:'07'}]);
  });
  it('não permite edição sem login', async () => {
    await db.exec(`SET test.uid='';`);
    await expect(db.query(`SELECT portal_origem_editar('${origin}','Teste','08')`)).rejects.toThrow(/Login obrigatório/);
  });
});