import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { beforeEach, describe, expect, it } from 'vitest'

const MIGRACAO = readFileSync('drizzle/migrations/0204_restricao_origens_busca_usuario.sql', 'utf8')
const EMPRESA = '00000000-0000-4000-8000-000000000001'
const OUTRA = '00000000-0000-4000-8000-000000000002'
const ADM = '00000000-0000-4000-8000-000000000010'
const COMUM = '00000000-0000-4000-8000-000000000011'
const ADM_OUTRA = '00000000-0000-4000-8000-000000000012'
const ORIGEM_A = '00000000-0000-4000-8000-000000000020'
const ORIGEM_B = '00000000-0000-4000-8000-000000000021'
const ORIGEM_OUTRA = '00000000-0000-4000-8000-000000000022'

let db: PGlite
const como = async (role: string, claims: Record<string, unknown> | null, sql: string, params: unknown[] = []) => {
  const c = claims ? JSON.stringify(claims).replace(/'/g, "''") : ''
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claims', '${c}', false);`)
  try { return await db.query(sql, params) } finally { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '', false);`) }
}
const admin = (sql: string, params: unknown[] = []) => como('authenticated', { role: 'authenticated', sub: ADM }, sql, params)
const erro = async (...args: Parameters<typeof como>) => {
  try { await como(...args); return null } catch (e) { return (e as Error).message }
}

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, is_active boolean DEFAULT true, is_admin boolean DEFAULT false);
    CREATE TABLE origins(id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id), name text NOT NULL);
    CREATE FUNCTION public.get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE FUNCTION public.is_company_manager(u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND coalesce(is_active,true) AND (is_admin OR role IN ('company_admin','super_admin'))) $$;
    GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid), public.is_company_manager(uuid) TO authenticated, service_role;
    INSERT INTO companies VALUES ('${EMPRESA}'), ('${OUTRA}');
    INSERT INTO profiles VALUES
      ('${ADM}', '${EMPRESA}', 'company_admin', true, false),
      ('${COMUM}', '${EMPRESA}', 'receptionist', true, false),
      ('${ADM_OUTRA}', '${OUTRA}', 'company_admin', true, false);
    INSERT INTO origins VALUES
      ('${ORIGEM_A}', '${EMPRESA}', 'Matriz'),
      ('${ORIGEM_B}', '${EMPRESA}', 'Unidade B'),
      ('${ORIGEM_OUTRA}', '${OUTRA}', 'Outra empresa');
  `)
  await db.exec(MIGRACAO)
})

describe('restrição opcional de origens por usuário', () => {
  it('administrador associa várias origens e ativa somente para o usuário escolhido', async () => {
    await admin(`SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2, $3, $2]::uuid[])`, [COMUM, ORIGEM_A, ORIGEM_B])
    const row = (await db.query<any>(`SELECT enabled, origin_ids, company_id FROM user_attendance_origin_restrictions WHERE user_id=$1`, [COMUM])).rows[0]
    expect(row.enabled).toBe(true)
    expect(row.company_id).toBe(EMPRESA)
    expect(new Set(row.origin_ids)).toEqual(new Set([ORIGEM_A, ORIGEM_B]))
  })

  it('desativada preserva as origens escolhidas para reativação futura', async () => {
    await admin(`SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_A])
    await admin(`SELECT public.usuario_origens_restricao_salvar($1, false, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_A])
    const row = (await db.query<any>(`SELECT enabled, origin_ids FROM user_attendance_origin_restrictions WHERE user_id=$1`, [COMUM])).rows[0]
    expect(row).toEqual({ enabled: false, origin_ids: [ORIGEM_A] })
  })

  it('não permite ativar sem selecionar ao menos uma origem', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: ADM }, `SELECT public.usuario_origens_restricao_salvar($1, true, '{}'::uuid[])`, [COMUM]))
      .toMatch(/Selecione ao menos uma origem/)
  })

  it('recusa origem de outra empresa', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: ADM }, `SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_OUTRA]))
      .toMatch(/não pertencem à empresa/)
  })

  it('administrador de outra empresa não altera o usuário', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: ADM_OUTRA }, `SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_A]))
      .toMatch(/Sem permissão para alterar usuários desta empresa/)
  })

  it('usuário comum não executa a gravação e só lê a própria configuração', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: COMUM }, `SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_A]))
      .toMatch(/Somente administradores podem alterar/)
    await admin(`SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_A])
    await admin(`SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [ADM, ORIGEM_B])
    const own = await como('authenticated', { role: 'authenticated', sub: COMUM }, `SELECT user_id FROM user_attendance_origin_restrictions`)
    expect(own.rows).toEqual([{ user_id: COMUM }])
  })

  it('visitante não lê nem grava configurações', async () => {
    expect(await erro('anon', null, `SELECT * FROM user_attendance_origin_restrictions`)).toMatch(/permission denied/)
    expect(await erro('anon', null, `SELECT public.usuario_origens_restricao_salvar($1, true, ARRAY[$2]::uuid[])`, [COMUM, ORIGEM_A])).toMatch(/permission denied/)
  })
})
