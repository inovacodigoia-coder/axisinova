import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Etapa 3B — só estas funções do schema public podem ser chamadas por visitante (sem login).
// Liberar outra exige justificativa e inclusão aqui (regra em drizzle/AGENTS.md).
export const FUNCOES_PUBLICAS = [
  'company_cnpj_exists', 'device_public_info', 'device_verify_access', 'empresa_cadastro_publico',
  'panel_tickets', 'portal_chat_abrir', 'portal_chat_enviar', 'portal_fetch', 'portal_fetch_laudo',
  'portal_log_attempt', 'totem_create_ticket', 'totem_queue_lines',
].sort()

const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}

describe('recaída: funções abertas para visitante', () => {
  it('nenhuma migração nova concede EXECUTE a anon/PUBLIC fora da lista', () => {
    const novas = readdirSync('drizzle/migrations').filter(n => /^\d{4}_.*\.sql$/.test(n) && Number(n.slice(0, 4)) > 195)
    const fora: string[] = []
    for (const f of novas) {
      const sql = readFileSync(`drizzle/migrations/${f}`, 'utf8').split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
      for (const m of sql.matchAll(/GRANT\s+(?:EXECUTE|ALL)[^;]*?ON\s+FUNCTION\s+(?:public\.)?"?(\w+)"?[^;]*?TO\s+([^;]+);/gi)) {
        if (/\b(anon|PUBLIC)\b/i.test(m[2]) && !FUNCOES_PUBLICAS.includes(m[1].toLowerCase())) fora.push(`${f}: ${m[1]}`)
      }
      if (/ALTER\s+DEFAULT\s+PRIVILEGES[^;]*GRANT[^;]*FUNCTIONS[^;]*TO[^;]*\b(anon|PUBLIC)\b/i.test(sql)) fora.push(`${f}: ALTER DEFAULT PRIVILEGES devolvendo acesso`)
    }
    expect(fora).toEqual([])
  })

  // Confere o banco de verdade quando há acesso (sandbox/servidor com PGHOST); sem acesso, fica de fora.
  it.skipIf(!process.env.PGHOST)('no banco, só as 12 públicas são executáveis por visitante (fora gatilhos)', () => {
    const sql = `select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
      and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'EXECUTE') order by 1`
    const nomes = execFileSync('psql', ['-At', '-c', sql], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    expect([...new Set(nomes)].sort()).toEqual(FUNCOES_PUBLICAS)
  })

  it.skipIf(!process.env.PGHOST)('no banco, funções novas não nascem com EXECUTE para PUBLIC nem anon', () => {
    const sql = `select coalesce(defaclnamespace::regnamespace::text, '-') || ':' || array_to_string(defaclacl, ',')
      from pg_default_acl where defaclrole = 'postgres'::regrole and defaclobjtype = 'f' and defaclnamespace in (0, 'public'::regnamespace)`
    const linhas = execFileSync('psql', ['-At', '-c', sql], { encoding: 'utf8' }).trim().split('\n')
    const global = linhas.find(l => l.startsWith('-:'))
    const publico = linhas.find(l => l.startsWith('public:'))
    expect(global, 'padrão global precisa existir sem PUBLIC').toBeDefined()
    expect(global).not.toMatch(/(^|[:,])=X/)
    expect(publico).not.toMatch(/anon=/)
    expect(publico).toMatch(/authenticated=X/)
  })
})

describe('lab_materiais_seed e apoio_seed_company (PGlite, dados fictícios)', () => {
  let db: PGlite
  const EMPRESA = '00000000-0000-4000-8000-000000000001'
  const OUTRA = '00000000-0000-4000-8000-000000000002'
  const USUARIO = '00000000-0000-4000-8000-000000000020'

  const como = async (role: string, claims: Record<string, unknown> | null, sql: string, params: unknown[] = []) => {
    const c = claims ? JSON.stringify(claims).replace(/'/g, "''") : ''
    await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claims', '${c}', false);`)
    try { return await db.query(sql, params) } finally {
      await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '', false);`)
    }
  }
  const erro = async (role: string, claims: Record<string, unknown> | null, sql: string, params: unknown[] = []) => {
    try { await como(role, claims, sql, params); return null } catch (e) { return (e as Error).message }
  }

  beforeEach(async () => {
    db = new PGlite()
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(auth.jwt()->>'sub', '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
      CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid);
      CREATE FUNCTION public.get_user_company_id(_uid uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT company_id FROM public.profiles WHERE id = _uid $$;
      CREATE FUNCTION public.lab_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT lower(btrim(coalesce(t,''))) $$;
      CREATE TABLE lab_recipiente(company_id uuid, nome text, sigla text, cor_tampa text, cor_hex text, ordem int, UNIQUE(company_id, sigla));
      CREATE TABLE lab_material(company_id uuid, nome text, legado boolean, ordem int, UNIQUE(company_id, nome));
      CREATE TABLE exams(company_id uuid, selected_materials jsonb);
      CREATE TABLE exam_laudos(company_id uuid, selected_materials jsonb);
      CREATE FUNCTION public.apoio_seed_company(_company_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ SELECT $$;
      CREATE FUNCTION public.lab_materiais_seed(_company uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;
      INSERT INTO profiles VALUES ('${USUARIO}', '${EMPRESA}');
    `)
    await db.exec(migracao('funcoes_seed_e_privilegios_padrao'))
  })
  afterEach(async () => { await db.close() })

  const recipientes = async (cid: string) =>
    Number((await db.query<{ n: number }>(`SELECT count(*)::int n FROM lab_recipiente WHERE company_id = $1`, [cid])).rows[0].n)

  it('visitante sem login: permissão negada', async () => {
    expect(await erro('anon', { role: 'anon' }, `SELECT lab_materiais_seed($1)`, [EMPRESA])).toMatch(/permission denied/)
    expect(await recipientes(EMPRESA)).toBe(0)
  })
  it('logado em outra empresa: "Sem permissão" e nada é criado', async () => {
    expect(await erro('authenticated', { role: 'authenticated', sub: USUARIO }, `SELECT lab_materiais_seed($1)`, [OUTRA])).toMatch(/Sem permissão/)
    expect(await recipientes(OUTRA)).toBe(0)
  })
  it('logado sem login de usuário (token sem sub): "Sem permissão"', async () => {
    expect(await erro('authenticated', { role: 'authenticated' }, `SELECT lab_materiais_seed($1)`, [EMPRESA])).toMatch(/Sem permissão/)
  })
  it('logado na própria empresa: cria os 9 tubos padrão (tela de Materiais)', async () => {
    await como('authenticated', { role: 'authenticated', sub: USUARIO }, `SELECT lab_materiais_seed($1)`, [EMPRESA])
    expect(await recipientes(EMPRESA)).toBe(9)
  })
  it('servidor (service_role) continua permitido', async () => {
    await como('service_role', { role: 'service_role' }, `SELECT lab_materiais_seed($1)`, [OUTRA])
    expect(await recipientes(OUTRA)).toBe(9)
  })
  it('apoio_seed_company: nem visitante nem usuário logado chamam direto', async () => {
    expect(await erro('anon', { role: 'anon' }, `SELECT apoio_seed_company($1)`, [EMPRESA])).toMatch(/permission denied/)
    expect(await erro('authenticated', { role: 'authenticated', sub: USUARIO }, `SELECT apoio_seed_company($1)`, [EMPRESA])).toMatch(/permission denied/)
    expect(await erro('service_role', { role: 'service_role' }, `SELECT apoio_seed_company($1)`, [EMPRESA])).toBeNull()
  })
  it('função nova criada depois nasce sem acesso de visitante', async () => {
    await db.exec(`CREATE FUNCTION public.funcao_nova_3b() RETURNS int LANGUAGE sql AS $$ SELECT 1 $$;`)
    const r = await db.query<{ a: boolean }>(`SELECT has_function_privilege('anon', 'public.funcao_nova_3b()', 'EXECUTE') a`)
    expect(r.rows[0].a).toBe(false)
  })
})
