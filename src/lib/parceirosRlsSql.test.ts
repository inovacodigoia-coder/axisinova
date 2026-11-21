import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Etapa 4 — RLS de parceiros: pedidos imutáveis, segredo oculto, edição só com permissão.
// Duas empresas fictícias e vários perfis; PGlite, nada toca o banco real.
const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}
const PROTECOES_API = readFileSync('supabase/migrations/20260906045729_d9acd3f7-aa5c-40ec-90dd-7d246d12adcc.sql', 'utf8')
// ETAPA_4_SQL permite conferir o texto antes de aplicar a migração.
const SQL_4 = process.env.ETAPA_4_SQL ? readFileSync(process.env.ETAPA_4_SQL, 'utf8') : migracao('parceiros_rls_etapa4')

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const GESTOR_A = '00000000-0000-4000-8000-0000000000a1'
const TI_A = '00000000-0000-4000-8000-0000000000a2' // perfil com Portais Externos, sem ser administrador
const COMUM_A = '00000000-0000-4000-8000-0000000000a3'
const LAB_A = '00000000-0000-4000-8000-0000000000a4' // só Cadastros do Lab (tela de integração de equipamentos)
const GESTOR_B = '00000000-0000-4000-8000-0000000000b1'
const SUPER = '00000000-0000-4000-8000-0000000000f1'
const PARCEIRO = '00000000-0000-4000-8000-0000000001a1'
const PEDIDO = '00000000-0000-4000-8000-0000000002a1'
const PEDIDO_ERRO = '00000000-0000-4000-8000-0000000002a2'
const PEDIDO_OK = '00000000-0000-4000-8000-0000000002a3'
const ATEND_A = '00000000-0000-4000-8000-0000000003a1'
const ATEND_B = '00000000-0000-4000-8000-0000000003b1'

let db: PGlite
type Claims = Record<string, unknown> | null
const logado = (sub: string): Claims => ({ sub, role: 'authenticated' })

const como = async <T,>(role: string, claims: Claims, sql: string, params: unknown[] = []) => {
  const c = claims ? JSON.stringify(claims).replace(/'/g, "''") : ''
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claims', '${c}', false);`)
  try { return await db.query<T>(sql, params) } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '', false);`)
  }
}
const usuario = <T,>(uid: string, sql: string, params: unknown[] = []) => como<T>('authenticated', logado(uid), sql, params)
const erro = async (role: string, claims: Claims, sql: string, params: unknown[] = []) => {
  try { await como(role, claims, sql, params); return null } catch (e) { return (e as Error).message }
}
const erroDe = (uid: string, sql: string, params: unknown[] = []) => erro('authenticated', logado(uid), sql, params)
const pedido = async (id: string) => (await db.query<Record<string, any>>(`SELECT * FROM partner_orders WHERE id = $1`, [id])).rows[0]
const parceiro = async () => (await db.query<Record<string, any>>(`SELECT * FROM api_partners WHERE id = $1`, [PARCEIRO])).rows[0]

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(auth.jwt()->>'sub', '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, private TO anon, authenticated, service_role;

    CREATE TABLE companies(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, is_admin boolean DEFAULT false, is_active boolean DEFAULT true);
    CREATE TABLE company_sectors(id text PRIMARY KEY, company_id uuid, is_active boolean DEFAULT true, allowed_profile_ids text[]);
    CREATE TABLE sector_users(sector_id text, user_id uuid, company_id uuid);
    CREATE TABLE access_profiles(id text PRIMARY KEY, company_id uuid, is_active boolean DEFAULT true, permissions jsonb);
    CREATE FUNCTION public.get_user_company_id(_user_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT company_id FROM public.profiles WHERE id = _user_id $$;
    CREATE FUNCTION public.is_company_manager(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND coalesce(p.is_active, true)
        AND (p.is_admin = true OR p.role IN ('company_admin','super_admin'))) $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;
    -- Mesmo texto da função em produção.
    CREATE FUNCTION public.perm_modulo(_mod text, _acao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
      SELECT auth.uid() IS NOT NULL AND (
        public.is_company_manager(auth.uid()) OR EXISTS (
          SELECT 1 FROM public.sector_users su
          JOIN public.company_sectors cs ON cs.id = su.sector_id AND coalesce(cs.is_active, true)
          JOIN public.access_profiles ap ON ap.id = ANY(cs.allowed_profile_ids::text[]) AND coalesce(ap.is_active, true)
          WHERE su.user_id = auth.uid() AND ap.company_id = public.get_user_company_id(auth.uid())
            AND coalesce(ap.permissions->_mod,'[]'::jsonb) ? _acao)) $$;
    GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid), public.is_company_manager(uuid), private.is_super_admin(), public.perm_modulo(text, text) TO authenticated;

    CREATE TABLE attendance_orders(id uuid PRIMARY KEY, company_id uuid);
    GRANT SELECT, INSERT ON attendance_orders TO authenticated;

    -- Colunas como estavam antes das migrações 0183/0184 (que acrescentam o resto).
    CREATE TABLE api_partners(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id), type text, name text, document text,
      contact_name text, contact_email text, contact_phone text, notes text, auth_method text DEFAULT 'oauth2', api_authorized boolean DEFAULT false,
      status text DEFAULT 'active', credentials jsonb DEFAULT '[]', last_sync_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE integration_oauth_clients(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES companies(id), name text, client_id text UNIQUE,
      secret_hash text, scopes text[], is_active boolean DEFAULT true, created_by uuid, created_at timestamptz DEFAULT now(), last_used_at timestamptz, revoked_at timestamptz);
    CREATE TABLE partner_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id), partner_id uuid, client_id text,
      protocolo_parceiro text, attendance_order_id uuid, status text DEFAULT 'received', payload jsonb, error text, created_at timestamptz DEFAULT now());
    -- Permissões de tabela como em produção antes da Etapa 4.
    GRANT SELECT, INSERT, UPDATE, REFERENCES, TRIGGER ON api_partners, partner_orders TO anon, authenticated;
    GRANT ALL ON integration_oauth_clients TO anon, authenticated;
    GRANT ALL ON api_partners, partner_orders, integration_oauth_clients TO service_role;
    ALTER TABLE api_partners ENABLE ROW LEVEL SECURITY;
    ALTER TABLE partner_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE integration_oauth_clients ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Company members read their partner orders" ON partner_orders FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
    CREATE POLICY "Company members update their partner orders" ON partner_orders FOR UPDATE TO authenticated
      USING (company_id = get_user_company_id(auth.uid())) WITH CHECK (company_id = get_user_company_id(auth.uid()));
    CREATE POLICY "oauth_clients_select_own_company" ON integration_oauth_clients FOR SELECT TO authenticated USING (company_id = get_user_company_id(auth.uid()));
    CREATE POLICY "oauth_clients_update_managers" ON integration_oauth_clients FOR UPDATE TO authenticated
      USING (company_id = get_user_company_id(auth.uid()) AND is_company_manager(auth.uid()))
      WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_company_manager(auth.uid()));
    CREATE POLICY p_srv1 ON api_partners TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY p_srv2 ON partner_orders TO service_role USING (true) WITH CHECK (true);
    CREATE POLICY p_srv3 ON integration_oauth_clients TO service_role USING (true) WITH CHECK (true);

    INSERT INTO companies VALUES ('${A}'), ('${B}');
    INSERT INTO profiles(id, company_id, role, is_admin) VALUES
      ('${GESTOR_A}', '${A}', 'company_admin', true), ('${TI_A}', '${A}', 'receptionist', false), ('${COMUM_A}', '${A}', 'receptionist', false),
      ('${LAB_A}', '${A}', 'biochemist', false), ('${GESTOR_B}', '${B}', 'company_admin', true), ('${SUPER}', '${A}', 'super_admin', false);
    INSERT INTO access_profiles VALUES
      ('perfil-ti', '${A}', true, '{"portals":["view","create","edit","delete","export","approve"]}'),
      ('perfil-lab', '${A}', true, '{"lab_registers":["view"]}'),
      ('perfil-recepcao', '${A}', true, '{"reception":["view","create","edit"]}');
    INSERT INTO company_sectors VALUES ('setor-ti', '${A}', true, '{perfil-ti}'), ('setor-lab', '${A}', true, '{perfil-lab}'), ('setor-rec', '${A}', true, '{perfil-recepcao}');
    INSERT INTO sector_users VALUES ('setor-ti', '${TI_A}', '${A}'), ('setor-lab', '${LAB_A}', '${A}'), ('setor-rec', '${COMUM_A}', '${A}');
  `)
  await db.exec(migracao('0183_parceiro_credencial_isolamento'))
  await db.exec(migracao('0184_parceiro_arquivar'))
  await db.exec(PROTECOES_API)
  await db.exec(`
    INSERT INTO integration_oauth_clients(company_id, name, client_id, secret_hash, scopes, uso, created_by) VALUES
      ('${A}', 'Parceiro — Parceiro API', 'cid-parceiro', 'hash-secreto-1', '{orders:write}', 'parceiro', '${GESTOR_A}'),
      ('${A}', 'ServidorAisaxius (OAuth2)', 'cid-equip', 'hash-secreto-2', '{exams:read}', 'instrumento', '${GESTOR_A}'),
      ('${B}', 'Parceiro B', 'cid-b', 'hash-secreto-3', '{orders:write}', 'parceiro', '${GESTOR_B}');
    INSERT INTO api_partners(id, company_id, name, document, auth_method, status, api_authorized, credentials) VALUES
      ('${PARCEIRO}', '${A}', 'Clínica Fictícia', '00000000000191', 'oauth2', 'active', false,
       '[{"method":"oauth2","clientId":"cid-parceiro","masked":"cid-parc••••••eiro","createdAt":"2026-11-01","revokedAt":null}]');
    INSERT INTO attendance_orders VALUES ('${ATEND_A}', '${A}'), ('${ATEND_B}', '${B}');
    INSERT INTO partner_orders(id, company_id, partner_id, client_id, protocolo_parceiro, status, payload, error) VALUES
      ('${PEDIDO}', '${A}', '${PARCEIRO}', 'cid-parceiro', 'PED-1', 'received', '{"paciente":{"nome":"FICTICIO"}}', NULL),
      ('${PEDIDO_ERRO}', '${A}', '${PARCEIRO}', 'cid-parceiro', 'PED-2', 'error', '{"paciente":{"nome":"FICTICIO 2"}}', 'falha anterior'),
      ('${PEDIDO_OK}', '${A}', '${PARCEIRO}', 'cid-parceiro', 'PED-3', 'processed', '{"paciente":{"nome":"FICTICIO 3"}}', NULL);
    UPDATE partner_orders SET attendance_order_id = '${ATEND_A}' WHERE id = '${PEDIDO_OK}';
  `)
  await db.exec(SQL_4)
})
afterEach(async () => { await db.close() })

describe('(a) membro comum não altera pedidos recebidos', () => {
  it('UPDATE de usuário comum não atinge nenhuma linha e nada muda', async () => {
    const r = await usuario(COMUM_A, `UPDATE partner_orders SET status = 'processed', attendance_order_id = $2 WHERE id = $1 RETURNING id`, [PEDIDO, ATEND_A])
    expect(r.rows).toHaveLength(0)
    expect((await pedido(PEDIDO)).status).toBe('received')
  })
  it('usuário comum continua lendo os pedidos da empresa', async () => {
    const r = await usuario<{ n: number }>(COMUM_A, `SELECT count(*)::int n FROM partner_orders`)
    expect(r.rows[0].n).toBe(3)
  })
  it('gestor de outra empresa não altera pedido da empresa A', async () => {
    const r = await usuario(GESTOR_B, `UPDATE partner_orders SET status = 'error' WHERE id = $1 RETURNING id`, [PEDIDO])
    expect(r.rows).toHaveLength(0)
  })
})

describe('(b) quem tem a permissão processa normalmente', () => {
  it('autorização do parceiro (Super Admin) e importação do pedido pelo perfil de Portais', async () => {
    await usuario(SUPER, `UPDATE api_partners SET api_authorized = true WHERE id = $1`, [PARCEIRO])
    expect((await parceiro()).api_authorized).toBe(true)
    await usuario(TI_A, `INSERT INTO attendance_orders VALUES ('00000000-0000-4000-8000-0000000003a9', $1)`, [A])
    const r = await usuario(TI_A, `UPDATE partner_orders SET status = 'processed', error = NULL, attendance_order_id = '00000000-0000-4000-8000-0000000003a9' WHERE id = $1 RETURNING id`, [PEDIDO])
    expect(r.rows).toHaveLength(1)
    const p = await pedido(PEDIDO)
    expect([p.status, p.attendance_order_id, p.processado_por, p.situacao_alterada_por]).toEqual(['processed', '00000000-0000-4000-8000-0000000003a9', TI_A, TI_A])
    expect(p.processado_em).not.toBeNull()
  })
  it('falha na importação marca erro e "Reprocessar" volta para recebido', async () => {
    await usuario(GESTOR_A, `UPDATE partner_orders SET status = 'error', error = 'exame não encontrado' WHERE id = $1`, [PEDIDO])
    expect((await pedido(PEDIDO)).status).toBe('error')
    await usuario(GESTOR_A, `UPDATE partner_orders SET status = 'received', error = NULL WHERE id = $1`, [PEDIDO])
    const p = await pedido(PEDIDO)
    expect([p.status, p.error, p.processado_por]).toEqual(['received', null, null])
  })
  it('não vincula atendimento de outra empresa', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET status = 'processed', attendance_order_id = $2 WHERE id = $1`, [PEDIDO, ATEND_B]))
      .toMatch(/Atendimento não encontrado/)
  })
})

describe('(c) os dados recebidos nunca mudam', () => {
  it('payload: recusado pelo navegador, mesmo para o gestor', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET payload = '{}' WHERE id = $1`, [PEDIDO])).toMatch(/permission denied/)
  })
  it('payload, empresa, parceiro, protocolo e data: recusados também pelo servidor', async () => {
    for (const set of [`payload = '{}'`, `company_id = '${B}'`, `partner_id = NULL`, `protocolo_parceiro = 'X'`, `created_at = now() - interval '1 day'`]) {
      expect(await erro('service_role', { role: 'service_role' }, `UPDATE partner_orders SET ${set} WHERE id = $1`, [PEDIDO])).toMatch(/não podem ser alterados/)
    }
    expect((await pedido(PEDIDO)).payload).toEqual({ paciente: { nome: 'FICTICIO' } })
  })
})

describe('(d) mudança de situação fora do fluxo é recusada', () => {
  it('processado não volta para recebido nem vai para erro', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET status = 'received' WHERE id = $1`, [PEDIDO_OK])).toMatch(/não permitida: de processed para received/)
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET status = 'error' WHERE id = $1`, [PEDIDO_OK])).toMatch(/não permitida/)
  })
  it('erro não pula direto para processado', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET status = 'processed', attendance_order_id = $2 WHERE id = $1`, [PEDIDO_ERRO, ATEND_A])).toMatch(/não permitida: de error para processed/)
  })
  it('situação desconhecida é recusada', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET status = 'apagado' WHERE id = $1`, [PEDIDO])).toMatch(/não permitida|inválida/)
  })
  it('atendimento não é trocado nem vinculado fora do processamento', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET attendance_order_id = NULL WHERE id = $1`, [PEDIDO_OK])).toMatch(/só é vinculado ao processar/)
    expect(await erroDe(GESTOR_A, `UPDATE partner_orders SET attendance_order_id = $2 WHERE id = $1`, [PEDIDO, ATEND_A])).toMatch(/só é vinculado ao processar/)
  })
  it('servidor continua inserindo pedidos novos', async () => {
    await como('service_role', { role: 'service_role' }, `INSERT INTO partner_orders(company_id, partner_id, protocolo_parceiro, status, payload) VALUES ($1, $2, 'PED-9', 'received', '{}')`, [A, PARCEIRO])
    expect((await db.query<{ n: number }>(`SELECT count(*)::int n FROM partner_orders`)).rows[0].n).toBe(4)
  })
})

describe('(e) secret_hash nunca chega ao navegador', () => {
  it('membro comum: select de todas as colunas e de secret_hash recusados', async () => {
    expect(await erroDe(COMUM_A, `SELECT * FROM integration_oauth_clients`)).toMatch(/permission denied/)
    expect(await erroDe(COMUM_A, `SELECT secret_hash FROM integration_oauth_clients`)).toMatch(/permission denied/)
  })
  it('com permissão de Portais e como gestor: secret_hash também recusado', async () => {
    expect(await erroDe(TI_A, `SELECT secret_hash FROM integration_oauth_clients`)).toMatch(/permission denied/)
    expect(await erroDe(GESTOR_A, `SELECT * FROM integration_oauth_clients`)).toMatch(/permission denied/)
  })
  it('membro comum não vê nenhuma credencial; quem tem só Cadastros do Lab vê apenas as de equipamento', async () => {
    const sql = `SELECT client_id FROM integration_oauth_clients ORDER BY client_id`
    expect((await usuario(COMUM_A, sql)).rows).toEqual([])
    expect((await usuario<{ client_id: string }>(LAB_A, sql)).rows.map(r => r.client_id)).toEqual(['cid-equip'])
  })
  it('visitante sem login: nada', async () => {
    expect(await erro('anon', { role: 'anon' }, `SELECT client_id FROM integration_oauth_clients`)).toMatch(/permission denied/)
    expect(await erro('anon', { role: 'anon' }, `SELECT id FROM partner_orders`)).toMatch(/permission denied/)
    expect(await erro('anon', { role: 'anon' }, `SELECT id FROM api_partners`)).toMatch(/permission denied/)
  })
})

describe('(f) membro comum não cadastra nem edita parceiro', () => {
  it('INSERT de usuário comum recusado', async () => {
    expect(await erroDe(COMUM_A, `INSERT INTO api_partners(company_id, name, credentials) VALUES ($1, 'Novo', '[]')`, [A])).toMatch(/row-level security/)
  })
  it('UPDATE de usuário comum não atinge nenhuma linha', async () => {
    const r = await usuario(COMUM_A, `UPDATE api_partners SET name = 'Trocado' WHERE id = $1 RETURNING id`, [PARCEIRO])
    expect(r.rows).toHaveLength(0)
    expect((await parceiro()).name).toBe('Clínica Fictícia')
  })
  it('ninguém altera credenciais nem arquivamento pelo navegador, nem o gestor', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE api_partners SET credentials = '[]' WHERE id = $1`, [PARCEIRO])).toMatch(/permission denied/)
    expect(await erroDe(GESTOR_A, `UPDATE api_partners SET archived_at = now() WHERE id = $1`, [PARCEIRO])).toMatch(/permission denied/)
  })
  it('perfil de Portais edita os dados do parceiro; autorização continua só do Super Admin', async () => {
    await usuario(TI_A, `UPDATE api_partners SET name = 'Clínica Renomeada', api_authorized = true WHERE id = $1`, [PARCEIRO])
    const p = await parceiro()
    expect([p.name, p.api_authorized]).toEqual(['Clínica Renomeada', false])
  })
  it('cadastro novo: só com credencial recém-gerada pelo servidor para o próprio usuário', async () => {
    await db.exec(`INSERT INTO integration_oauth_clients(company_id, name, client_id, secret_hash, uso, created_by) VALUES
      ('${A}', 'nova', 'axis_cid_novaCredencial', 'h', 'parceiro', '${TI_A}'), ('${A}', 'de outro', 'axis_cid_deOutroUsuario', 'h', 'parceiro', '${GESTOR_A}')`)
    expect(await erroDe(TI_A, `INSERT INTO api_partners(company_id, name, credentials) VALUES ($1, 'Roubo', '[{"clientId":"cid-parceiro"}]')`, [A])).toMatch(/Credencial inválida/)
    expect(await erroDe(TI_A, `INSERT INTO api_partners(company_id, name, credentials) VALUES ($1, 'Outro', '[{"clientId":"axis_cid_deOutroUsuario"}]')`, [A])).toMatch(/Credencial inválida/)
    await usuario(TI_A, `INSERT INTO api_partners(company_id, name, document, credentials, api_authorized) VALUES ($1, 'Lab Novo', '11222333000181',
      '[{"method":"oauth2","masked":"qualquer","clientId":"axis_cid_novaCredencial","revokedAt":"2020-01-01"}]', true)`, [A])
    const n = (await db.query<Record<string, any>>(`SELECT * FROM api_partners WHERE name = 'Lab Novo'`)).rows[0]
    expect([n.api_authorized, n.credentials[0].masked, n.credentials[0].revokedAt]).toEqual([false, 'axis_cid••••••cial', null])
    const c = (await db.query<{ partner_id: string }>(`SELECT partner_id FROM integration_oauth_clients WHERE client_id = 'axis_cid_novaCredencial'`)).rows[0]
    expect(c.partner_id).toBe(n.id)
  })
})

describe('(g) arquivar, restaurar, regenerar e revogar continuam funcionando', () => {
  it('gestor arquiva e o Super Admin restaura', async () => {
    await usuario(GESTOR_A, `SELECT parceiro_arquivar($1)`, [PARCEIRO])
    expect((await parceiro()).archived_at).not.toBeNull()
    await usuario(SUPER, `SELECT parceiro_restaurar($1)`, [PARCEIRO])
    expect((await parceiro()).archived_at).toBeNull()
  })
  it('servidor regenera a credencial (anterior desligada)', async () => {
    await como('service_role', { role: 'service_role' },
      `SELECT parceiro_credencial_regenerar($1, $2, 'axis_cid_regenerada', 'h-nova', 'Parceiro API', '{orders:write}', $3)`, [PARCEIRO, A, GESTOR_A])
    const ativos = (await db.query<{ client_id: string }>(`SELECT client_id FROM integration_oauth_clients WHERE partner_id = $1 AND is_active ORDER BY 1`, [PARCEIRO])).rows
    expect(ativos.map(r => r.client_id)).toEqual(['axis_cid_regenerada'])
  })
  it('gestor revoga credencial na tela de Chaves de API', async () => {
    const r = await usuario(GESTOR_A, `UPDATE integration_oauth_clients SET is_active = false, revoked_at = now() WHERE client_id = 'cid-equip' RETURNING id`)
    expect(r.rows).toHaveLength(1)
  })
  it('gestor não troca o segredo pela tela', async () => {
    expect(await erroDe(GESTOR_A, `UPDATE integration_oauth_clients SET secret_hash = 'meu' WHERE client_id = 'cid-equip'`)).toMatch(/permission denied/)
  })
})

describe('(h) as telas carregam para quem tem permissão', () => {
  it('Pedidos Recebidos (mesmas colunas da tela)', async () => {
    const r = await usuario(TI_A, `SELECT id, company_id, partner_id, protocolo_parceiro, attendance_order_id, status, error, payload, created_at FROM partner_orders`)
    expect(r.rows).toHaveLength(3)
  })
  it('lista de Parceiros (select de todas as colunas)', async () => {
    expect((await usuario(TI_A, `SELECT * FROM api_partners WHERE company_id = $1`, [A])).rows).toHaveLength(1)
  })
  it('Chaves de API (mesmas colunas da tela)', async () => {
    const sql = `SELECT id, name, client_id, scopes, is_active, created_at, last_used_at, revoked_at FROM integration_oauth_clients WHERE company_id = $1`
    expect((await usuario(GESTOR_A, sql, [A])).rows).toHaveLength(2)
    expect((await usuario(TI_A, sql, [A])).rows).toHaveLength(2)
  })
})
