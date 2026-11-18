import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Regenerar/revogar credencial de parceiro (PGlite, dados fictícios).
let db: PGlite
const EMPRESA = '00000000-0000-4000-8000-000000000001'
const PARCEIRO = '00000000-0000-4000-8000-000000000010'
const USUARIO = '00000000-0000-4000-8000-000000000020'

const cliente = async (clientId: string) =>
  (await db.query<{ is_active: boolean; revoked_at: string | null; partner_id: string | null; uso: string }>(
    `SELECT is_active, revoked_at, partner_id, uso FROM integration_oauth_clients WHERE client_id = $1`, [clientId])).rows[0]

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE api_partners(id uuid PRIMARY KEY, company_id uuid REFERENCES companies(id), name text, auth_method text, status text, api_authorized boolean, credentials jsonb);
    CREATE TABLE integration_oauth_clients(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id), name text, client_id text UNIQUE,
      secret_hash text, scopes text[], is_active boolean DEFAULT true, created_by uuid, created_at timestamptz DEFAULT now(),
      last_used_at timestamptz, revoked_at timestamptz);
    INSERT INTO companies VALUES ('${EMPRESA}');
    INSERT INTO integration_oauth_clients(company_id, name, client_id, secret_hash, scopes)
      VALUES ('${EMPRESA}', 'Parceiro — Parceiro API', 'cid-antigo', 'hash-antigo', '{orders:write}'),
             ('${EMPRESA}', 'ServidorAisaxius (OAuth2)', 'cid-equip', 'hash-equip', '{exams:read}');
    INSERT INTO api_partners VALUES ('${PARCEIRO}', '${EMPRESA}', 'Parceiro', 'oauth2', 'active', true,
      '[{"method":"oauth2","clientId":"cid-antigo","masked":"x","createdAt":"2026-11-01","revokedAt":null}]');
  `)
  await db.exec(readFileSync('drizzle/migrations/0183_parceiro_credencial_isolamento.sql', 'utf8'))
})
afterEach(async () => { await db.close() })

describe('credencial de parceiro', () => {
  it('migração vincula a credencial ao parceiro e não mexe na de equipamento', async () => {
    expect(await cliente('cid-antigo')).toMatchObject({ partner_id: PARCEIRO, uso: 'parceiro', is_active: true })
    expect(await cliente('cid-equip')).toMatchObject({ partner_id: null, uso: 'instrumento', is_active: true })
  })

  it('(g) regenerar invalida o segredo antigo na mesma operação', async () => {
    await db.query(`SELECT parceiro_credencial_regenerar($1, $2, 'cid-novo', 'hash-novo', 'Parceiro — Parceiro API', '{orders:write}', $3)`,
      [PARCEIRO, EMPRESA, USUARIO])
    const antigo = await cliente('cid-antigo')
    expect(antigo.is_active).toBe(false)
    expect(antigo.revoked_at).not.toBeNull()
    expect(await cliente('cid-novo')).toMatchObject({ is_active: true, partner_id: PARCEIRO, uso: 'parceiro' })
    const creds = (await db.query<{ c: any[] }>(`SELECT credentials c FROM api_partners WHERE id = $1`, [PARCEIRO])).rows[0].c
    expect(creds[0]).toMatchObject({ clientId: 'cid-novo', revokedAt: null })
    expect(creds[1].clientId).toBe('cid-antigo')
    expect(creds[1].revokedAt).not.toBeNull()
    // nada apagado
    expect((await db.query(`SELECT 1 FROM integration_oauth_clients`)).rows.length).toBe(3)
  })

  it('regenerar recusa parceiro de outra empresa e não cria nada', async () => {
    const outra = '00000000-0000-4000-8000-000000000002'
    await db.exec(`INSERT INTO companies VALUES ('${outra}')`)
    await expect(db.query(`SELECT parceiro_credencial_regenerar($1, $2, 'cid-x', 'h', 'n', '{}', $3)`, [PARCEIRO, outra, USUARIO]))
      .rejects.toThrow(/Parceiro não encontrado/)
    expect(await cliente('cid-x')).toBeUndefined()
    expect((await cliente('cid-antigo')).is_active).toBe(true)
  })

  it('revogar só no cadastro do parceiro inativa a credencial de verdade', async () => {
    await db.exec(`UPDATE api_partners SET credentials = jsonb_set(credentials, '{0,revokedAt}', '"2026-11-18T00:00:00Z"') WHERE id = '${PARCEIRO}'`)
    expect((await cliente('cid-antigo')).is_active).toBe(false)
  })

  it('excluir o parceiro inativa a credencial (não fica como credencial de equipamento)', async () => {
    await db.exec(`DELETE FROM api_partners WHERE id = '${PARCEIRO}'`)
    expect(await cliente('cid-antigo')).toMatchObject({ is_active: false, uso: 'parceiro' })
  })

  it('só o servidor executa a regeneração', async () => {
    const r = await db.query<{ a: boolean }>(`SELECT has_function_privilege('authenticated', 'parceiro_credencial_regenerar(uuid,uuid,text,text,text,text[],uuid,text)', 'EXECUTE') a`)
    expect(r.rows[0].a).toBe(false)
  })
})
