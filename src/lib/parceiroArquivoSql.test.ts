import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Arquivar / restaurar parceiro da API e bloqueio de DELETE físico (PGlite, dados fictícios).
const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}

let db: PGlite
const EMPRESA = '00000000-0000-4000-8000-000000000001'
const OUTRA = '00000000-0000-4000-8000-000000000002'
const PARCEIRO = '00000000-0000-4000-8000-000000000010'
const GESTOR = '00000000-0000-4000-8000-000000000020'
const SUPER = '00000000-0000-4000-8000-000000000021'
const GESTOR_OUTRA = '00000000-0000-4000-8000-000000000022'

const comoUsuario = async <T,>(uid: string, sql: string, params: unknown[] = []) => {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${uid}', false);`)
  try {
    return await db.query<T>(sql, params)
  } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '', false);`)
  }
}
const cliente = async (clientId: string) =>
  (await db.query<{ is_active: boolean; revoked_at: string | null }>(
    `SELECT is_active, revoked_at FROM integration_oauth_clients WHERE client_id = $1`, [clientId])).rows[0]
const parceiro = async () =>
  (await db.query<{ archived_at: string | null; api_authorized: boolean; status: string; credentials: any[] }>(
    `SELECT archived_at, api_authorized, status, credentials FROM api_partners WHERE id = $1`, [PARCEIRO])).rows[0]

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text);
    CREATE FUNCTION public.get_user_company_id(_uid uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT company_id FROM public.profiles WHERE id = _uid $$;
    CREATE FUNCTION public.is_company_manager(_uid uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'company_admin') $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;
    GRANT USAGE ON SCHEMA auth, private TO authenticated;
    CREATE TABLE api_partners(id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE, name text,
      auth_method text, status text, api_authorized boolean, credentials jsonb, updated_at timestamptz DEFAULT now());
    CREATE TABLE integration_oauth_clients(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id) ON DELETE CASCADE, name text, client_id text UNIQUE,
      secret_hash text, scopes text[], is_active boolean DEFAULT true, created_by uuid, created_at timestamptz DEFAULT now(),
      last_used_at timestamptz, revoked_at timestamptz);
    CREATE TABLE partner_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      partner_id uuid, protocolo_parceiro text, status text);
    ALTER TABLE partner_orders ADD CONSTRAINT partner_orders_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES api_partners(id) ON DELETE SET NULL;
    GRANT SELECT, INSERT, UPDATE, DELETE ON api_partners, partner_orders, integration_oauth_clients TO authenticated;
    INSERT INTO companies VALUES ('${EMPRESA}'), ('${OUTRA}');
    INSERT INTO profiles VALUES ('${GESTOR}', '${EMPRESA}', 'company_admin'), ('${SUPER}', NULL, 'super_admin'), ('${GESTOR_OUTRA}', '${OUTRA}', 'company_admin');
    INSERT INTO integration_oauth_clients(company_id, name, client_id, secret_hash, scopes)
      VALUES ('${EMPRESA}', 'Parceiro — Parceiro API', 'cid-parceiro', 'h1', '{orders:write}'),
             ('${EMPRESA}', 'ServidorAisaxius (OAuth2)', 'cid-equip', 'h2', '{exams:read}');
    INSERT INTO api_partners(id, company_id, name, auth_method, status, api_authorized, credentials) VALUES ('${PARCEIRO}', '${EMPRESA}', 'Parceiro', 'oauth2', 'active', true,
      '[{"method":"oauth2","clientId":"cid-parceiro","masked":"x","createdAt":"2026-11-01","revokedAt":null}]');
    INSERT INTO partner_orders(company_id, partner_id, protocolo_parceiro, status) VALUES ('${EMPRESA}', '${PARCEIRO}', 'PED-1', 'received');
  `)
  await db.exec(readFileSync('drizzle/migrations/0183_parceiro_credencial_isolamento.sql', 'utf8'))
  await db.exec(migracao('parceiro_arquivar'))
})
afterEach(async () => { await db.close() })

describe('arquivar parceiro da API', () => {
  it('arquivar desliga as credenciais e a autorização, sem apagar pedidos nem credenciais', async () => {
    await comoUsuario(GESTOR, `SELECT parceiro_arquivar($1)`, [PARCEIRO])
    const p = await parceiro()
    expect(p.archived_at).not.toBeNull()
    expect(p.api_authorized).toBe(false)
    expect(p.credentials[0].revokedAt).not.toBeNull()
    const c = await cliente('cid-parceiro')
    expect(c.is_active).toBe(false)
    expect(c.revoked_at).not.toBeNull()
    expect((await cliente('cid-equip')).is_active).toBe(true)
    expect((await db.query(`SELECT 1 FROM partner_orders WHERE partner_id = $1`, [PARCEIRO])).rows.length).toBe(1)
    expect((await db.query(`SELECT 1 FROM integration_oauth_clients`)).rows.length).toBe(2)
  })

  it('gestor de outra empresa não arquiva', async () => {
    await expect(comoUsuario(GESTOR_OUTRA, `SELECT parceiro_arquivar($1)`, [PARCEIRO])).rejects.toThrow(/não encontrado/)
    expect((await parceiro()).archived_at).toBeNull()
  })

  it('DELETE físico de parceiro e de pedido é negado para usuário logado', async () => {
    await expect(comoUsuario(GESTOR, `DELETE FROM api_partners WHERE id = $1`, [PARCEIRO])).rejects.toThrow(/permission denied/)
    await expect(comoUsuario(GESTOR, `DELETE FROM partner_orders WHERE partner_id = $1`, [PARCEIRO])).rejects.toThrow(/permission denied/)
    expect(await parceiro()).toBeDefined()
  })

  it('parceiro com pedidos não perde o vínculo: a exclusão é recusada (sem SET NULL)', async () => {
    await expect(db.exec(`DELETE FROM api_partners WHERE id = '${PARCEIRO}'`)).rejects.toThrow(/foreign key/)
    expect((await db.query<{ partner_id: string }>(`SELECT partner_id FROM partner_orders`)).rows[0].partner_id).toBe(PARCEIRO)
  })

  it('arquivado não é reativado por edição direta (autorizar/desarquivar)', async () => {
    await comoUsuario(GESTOR, `SELECT parceiro_arquivar($1)`, [PARCEIRO])
    await expect(comoUsuario(GESTOR, `UPDATE api_partners SET api_authorized = true WHERE id = $1`, [PARCEIRO])).rejects.toThrow(/restaure/)
    await expect(comoUsuario(GESTOR, `UPDATE api_partners SET archived_at = NULL WHERE id = $1`, [PARCEIRO])).rejects.toThrow(/Arquivar\/Restaurar/)
    expect((await parceiro()).archived_at).not.toBeNull()
  })

  it('regenerar credencial de parceiro arquivado é recusado', async () => {
    await comoUsuario(GESTOR, `SELECT parceiro_arquivar($1)`, [PARCEIRO])
    await expect(db.query(`SELECT parceiro_credencial_regenerar($1, $2, 'cid-novo', 'h', 'n', '{}', $3)`, [PARCEIRO, EMPRESA, GESTOR]))
      .rejects.toThrow(/arquivado/)
    expect(await cliente('cid-novo')).toBeUndefined()
  })

  it('só o Super Admin restaura', async () => {
    await comoUsuario(GESTOR, `SELECT parceiro_arquivar($1)`, [PARCEIRO])
    await expect(comoUsuario(GESTOR, `SELECT parceiro_restaurar($1)`, [PARCEIRO])).rejects.toThrow(/Super Admin/)
    expect((await parceiro()).archived_at).not.toBeNull()
  })

  it('restaurar volta Pendente e sem credencial ativa (a antiga não volta)', async () => {
    await comoUsuario(GESTOR, `SELECT parceiro_arquivar($1)`, [PARCEIRO])
    await comoUsuario(SUPER, `SELECT parceiro_restaurar($1)`, [PARCEIRO])
    const p = await parceiro()
    expect(p.archived_at).toBeNull()
    expect(p.api_authorized).toBe(false)
    expect(p.status).toBe('active')
    expect(p.credentials.every(c => c.revokedAt)).toBe(true)
    expect((await cliente('cid-parceiro')).is_active).toBe(false)
  })

  it('excluir a empresa inteira continua possível (pedidos e parceiro saem juntos)', async () => {
    await db.exec(`DELETE FROM companies WHERE id = '${EMPRESA}'`)
    expect((await db.query(`SELECT 1 FROM api_partners`)).rows.length).toBe(0)
  })
})
