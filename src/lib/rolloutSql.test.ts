import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { it, expect } from 'vitest'
it('empresa inativa bloqueia administrador; setor comum inicia desmarcado e TI marcado', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '00000000-0000-0000-0000-000000000099'::uuid$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '7858af33-878e-40c4-9305-e912cc6655c3'::uuid$$;
      CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
      CREATE TABLE companies(id uuid PRIMARY KEY,financeiro_habilitado boolean DEFAULT true);
      CREATE TABLE company_sectors(id text PRIMARY KEY,company_id uuid,is_active boolean,allowed_profile_ids text[],module_overrides jsonb);
      CREATE TABLE sector_users(user_id uuid,company_id uuid,sector_id text);
      CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);`)
    await db.exec(readFileSync('drizzle/migrations/0135_almoxarifado_company_enablement.sql','utf8'))
    await db.exec("INSERT INTO companies(id) VALUES('7858af33-878e-40c4-9305-e912cc6655c3')")
    expect((await db.query('select financeiro_habilitado,almoxarifado_habilitado from companies')).rows[0]).toEqual({financeiro_habilitado:false,almoxarifado_habilitado:false})
    expect((await db.query("select almox_permissao('approve') permitido")).rows[0]).toEqual({permitido:false})
    await db.exec("UPDATE companies SET almoxarifado_habilitado=true; INSERT INTO company_sectors(id,company_id) VALUES('triagem','7858af33-878e-40c4-9305-e912cc6655c3'),('sec_admin_7858af33878e40c49305e912cc6655c3','7858af33-878e-40c4-9305-e912cc6655c3')")
    expect((await db.query("select almox_permissao('approve') permitido")).rows[0]).toEqual({permitido:true})
    expect((await db.query("select id,(module_overrides->>'/app/estoque/solicitacoes')::boolean marcado from company_sectors order by id")).rows).toEqual([{id:'sec_admin_7858af33878e40c49305e912cc6655c3',marcado:true},{id:'triagem',marcado:false}])
  } finally { await db.close() }
},30000)