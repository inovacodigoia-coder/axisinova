import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
describe('Cadastro — criação única da origem principal', () => {
  it('cria duas empresas distintas, cada uma com exatamente uma matriz e uma origem', async () => {
    const db = new PGlite()
    try {
      await db.exec(`
        CREATE ROLE anon; CREATE ROLE authenticated;
        CREATE TABLE companies(id uuid PRIMARY KEY);
        CREATE TABLE establishments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,name text,is_main_branch boolean,internal_code text);
        CREATE TABLE origins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,establishment_id uuid,name text,internal_code text);
        CREATE UNIQUE INDEX origins_establishment_id_unique ON origins(establishment_id) WHERE establishment_id IS NOT NULL;
        CREATE TABLE initialized(company_id uuid);
        CREATE FUNCTION initialize_company_access_defaults(_company_id uuid) RETURNS void LANGUAGE sql AS $$ INSERT INTO initialized VALUES (_company_id); $$;
        CREATE FUNCTION auto_create_origin_for_establishment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
          INSERT INTO origins(company_id,establishment_id,name,internal_code) VALUES (NEW.company_id,NEW.id,NEW.name,NEW.internal_code); RETURN NEW;
        END; $$;
        CREATE TRIGGER auto_origin AFTER INSERT ON establishments FOR EACH ROW EXECUTE FUNCTION auto_create_origin_for_establishment();
      `)
      await db.exec(readFileSync('drizzle/migrations/0107_cadastro_corrigir_origem_matriz_duplicada.sql', 'utf8'))
      await db.exec(`CREATE TRIGGER company_init AFTER INSERT ON companies FOR EACH ROW EXECUTE FUNCTION handle_new_company_initialization(); INSERT INTO companies VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`)
      const { rows } = await db.query(`SELECT c.id,(SELECT count(*)::int FROM establishments e WHERE e.company_id=c.id) AS matrices,(SELECT count(*)::int FROM origins o WHERE o.company_id=c.id) AS origins,(SELECT count(*)::int FROM initialized i WHERE i.company_id=c.id) AS initialized FROM companies c`)
      expect(rows).toHaveLength(2)
      for (const row of rows) expect(row).toMatchObject({ matrices: 1, origins: 1, initialized: 1 })
    } finally { await db.close() }
  })
})