import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeEach, describe, expect, it } from 'vitest'

// Novo Usuário: o create-user grava empresa/função/ativo por usuario_provisionar (só servidor).
const f = readdirSync('drizzle/migrations').find(n => n.startsWith('0202_') && n.endsWith('.sql'))!
const MIGRACAO = readFileSync(`drizzle/migrations/${f}`, 'utf8')

const EMPRESA = '00000000-0000-4000-8000-000000000001'
const OUTRA = '00000000-0000-4000-8000-000000000002'
const NOVO = '00000000-0000-4000-8000-000000000010'
const COMUM = '00000000-0000-4000-8000-000000000011'

let db: PGlite
const como = async (role: string, claims: Record<string, unknown> | null, sql: string, params: unknown[] = []) => {
  const c = claims ? JSON.stringify(claims).replace(/'/g, "''") : ''
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claims', '${c}', false);`)
  try { return await db.query(sql, params) } finally { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '', false);`) }
}
const erro = async (...a: Parameters<typeof como>) => { try { await como(...a); return null } catch (e) { return (e as Error).message } }

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth, private TO authenticated, anon, service_role;
    CREATE TYPE public.app_role AS ENUM ('company_admin','doctor','biochemist','other');
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, is_admin boolean DEFAULT false,
      is_active boolean, badge_code text, must_change_password boolean DEFAULT false);
    CREATE TABLE user_roles(user_id uuid, role public.app_role, UNIQUE(user_id, role));
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;
    GRANT SELECT, UPDATE ON profiles TO authenticated;
    INSERT INTO companies VALUES ('${EMPRESA}'), ('${OUTRA}');
    -- como o gatilho de cadastro deixa hoje um usuário criado pelo sistema
    INSERT INTO profiles(id, company_id, role, is_active) VALUES ('${NOVO}', NULL, 'other', false), ('${COMUM}', '${EMPRESA}', 'doctor', true);
    INSERT INTO user_roles VALUES ('${NOVO}', 'other');
  `)
  await db.exec(MIGRACAO)
  await db.exec(`CREATE TRIGGER prevent_profile_privilege_escalation BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();`)
})

describe('usuario_provisionar', () => {
  it('o servidor liga o novo usuário à empresa, com a função escolhida e ativo', async () => {
    await como('service_role', { role: 'service_role' }, `SELECT public.usuario_provisionar($1, $2, 'biochemist', 'AB12')`, [NOVO, EMPRESA])
    const p = (await db.query<any>(`SELECT company_id, role, is_active, badge_code, must_change_password FROM profiles WHERE id = $1`, [NOVO])).rows[0]
    expect(p).toEqual({ company_id: EMPRESA, role: 'biochemist', is_active: true, badge_code: 'AB12', must_change_password: true })
    const roles = (await db.query<any>(`SELECT role FROM user_roles WHERE user_id = $1`, [NOVO])).rows.map(r => r.role)
    expect(roles).toEqual(['biochemist'])
  })

  it('usuário logado não consegue chamar a função', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: COMUM }, `SELECT public.usuario_provisionar($1, $2, 'biochemist', NULL)`, [NOVO, OUTRA]))
      .toMatch(/permission denied/)
  })

  it('usuário logado comum continua sem poder trocar a própria empresa', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: COMUM }, `UPDATE profiles SET company_id = $1 WHERE id = $2`, [OUTRA, COMUM]))
      .toMatch(/Only super admins can change company_id/)
  })
})
