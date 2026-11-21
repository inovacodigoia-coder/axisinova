import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Etapa 3D — funções de usuário logado conferem a empresa do usuário.
// Duas empresas fictícias (A e B), um usuário de cada; PGlite, nada toca o banco real.
const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}
// ETAPA_3D_SQL permite conferir o texto antes de aplicar a migração.
const SQL_3D = process.env.ETAPA_3D_SQL ? readFileSync(process.env.ETAPA_3D_SQL, 'utf8') : migracao('empresa_do_usuario_3d')

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const USER_A = '00000000-0000-4000-8000-0000000000a1'
const USER_B = '00000000-0000-4000-8000-0000000000b1'
const GESTOR_A = '00000000-0000-4000-8000-0000000000a2'
const SUPER = '00000000-0000-4000-8000-0000000000f1'
const PEDIDO_A = '00000000-0000-4000-8000-0000000001a1'
const PEDIDO_B = '00000000-0000-4000-8000-0000000001b1'
const EXAME = '00000000-0000-4000-8000-0000000002e1'
const APOIO = '00000000-0000-4000-8000-0000000003c1'

let db: PGlite
type Claims = Record<string, unknown> | null
const logado = (sub: string): Claims => ({ sub, role: 'authenticated' })
const SERVIDOR: Claims = { role: 'service_role' }

const como = async <T,>(role: string, claims: Claims, sql: string, params: unknown[] = []) => {
  const c = claims ? JSON.stringify(claims).replace(/'/g, "''") : ''
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claims', '${c}', false);`)
  try { return await db.query<T>(sql, params) } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '', false);`)
  }
}
const erro = async (role: string, claims: Claims, sql: string, params: unknown[] = []) => {
  try { await como(role, claims, sql, params); return null } catch (e) { return (e as Error).message }
}
const um = async <T,>(role: string, claims: Claims, sql: string, params: unknown[] = []) =>
  (await como<{ r: T }>(role, claims, sql, params)).rows[0]?.r

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(auth.jwt()->>'sub', '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, private TO anon, authenticated, service_role;

    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, is_admin boolean DEFAULT false, is_active boolean DEFAULT true,
      full_name text, council_type text, council_uf text, council_number text);
    CREATE FUNCTION public.get_user_company_id(_user_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT company_id FROM public.profiles WHERE id = _user_id $$;
    CREATE FUNCTION public.is_company_manager(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND coalesce(p.is_active, true)
        AND (p.is_admin = true OR p.role IN ('company_admin','super_admin'))) $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;

    CREATE TABLE companies(id uuid PRIMARY KEY, chat_interno_habilitado boolean DEFAULT true);
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY, company_id uuid, order_number text, protocol text, lab_guides jsonb);
    CREATE TABLE apoio_pedido_exame(pedido_id uuid, apoio_id uuid);
    CREATE TABLE apoio_laboratorio(id uuid PRIMARY KEY, company_id uuid, conector text, nome text);
    CREATE TABLE feriado(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, data date, descricao text, abrangencia text, uf text, municipio text);
    CREATE UNIQUE INDEX feriado_unq ON feriado (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), data, abrangencia, COALESCE(uf, ''), COALESCE(municipio, ''));

    CREATE FUNCTION public.data_pascoa(_ano integer) RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mes int; dia int;
    BEGIN
      a := _ano % 19; b := _ano / 100; c := _ano % 100; d := b / 4; e := b % 4;
      f := (b + 8) / 25; g := (b - f + 1) / 3; h := (19*a + b - d - g + 15) % 30;
      i := c / 4; k := c % 4; l := (32 + 2*e + 2*i - h - k) % 7; m := (a + 11*h + 22*l) / 451;
      mes := (h + l - 7*m + 114) / 31; dia := ((h + l - 7*m + 114) % 31) + 1;
      RETURN make_date(_ano, mes, dia);
    END $$;

    -- Texto atual (antes da 3D) das duas funções que só perdem o acesso direto.
    CREATE FUNCTION public.chat_interno_ativo(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT coalesce((SELECT chat_interno_habilitado FROM public.companies WHERE id = p_company), false) $$;
    CREATE FUNCTION public.apoio_valida_cod_ped(_apoio uuid, _cod text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT CASE WHEN (al.conector ILIKE '%pardini%' OR al.nome ILIKE '%pardini%') THEN upper(coalesce(_cod,'')) ~ '^[A-Z0-9]{7}$'
        ELSE length(trim(coalesce(_cod,''))) BETWEEN 1 AND 40 END FROM public.apoio_laboratorio al WHERE al.id = _apoio $$;
    GRANT EXECUTE ON FUNCTION public.chat_interno_ativo(uuid), public.apoio_valida_cod_ped(uuid, text) TO authenticated, service_role;

    -- Como as funções do banco que as usam por dentro (chat_interno_meu_acesso, apoio_envio_manual, apoio_kanban_lista).
    CREATE FUNCTION public.interna_chat_ativo() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT public.chat_interno_ativo(public.get_user_company_id(auth.uid())) $$;
    CREATE FUNCTION public.interna_valida_cod(_apoio uuid, _cod text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM apoio_laboratorio WHERE id = _apoio AND company_id = get_user_company_id(auth.uid())) THEN RETURN NULL; END IF;
        RETURN public.apoio_valida_cod_ped(_apoio, _cod); END $$;
    GRANT EXECUTE ON FUNCTION public.interna_chat_ativo(), public.interna_valida_cod(uuid, text) TO authenticated;

    INSERT INTO companies VALUES ('${A}', true), ('${B}', true);
    INSERT INTO profiles(id, company_id, role, is_admin, full_name, council_type, council_uf, council_number) VALUES
      ('${USER_A}', '${A}', 'biochemist', false, 'BIOQUIMICA A', 'CRBM', 'SP', '111'),
      ('${USER_B}', '${B}', 'biochemist', false, 'BIOQUIMICO B', 'CRF', 'RJ', '222'),
      ('${GESTOR_A}', '${A}', 'company_admin', true, 'GESTOR A', NULL, NULL, NULL),
      ('${SUPER}', '${A}', 'super_admin', false, 'SUPER', NULL, NULL, NULL);
    INSERT INTO attendance_orders VALUES
      ('${PEDIDO_A}', '${A}', '7-01', '7-01', '[{"exams":[{"id":"${EXAME}","material":"SORO A"}]}]'),
      ('${PEDIDO_B}', '${B}', '9-01', '9-01', '[{"exams":[{"id":"${EXAME}","material":"SORO B"}]}]');
    INSERT INTO apoio_pedido_exame VALUES ('${PEDIDO_A}', '${APOIO}'), ('${PEDIDO_B}', '${APOIO}');
    INSERT INTO apoio_laboratorio VALUES ('${APOIO}', '${A}', 'pardini', 'Pardini');
  `)
  await db.exec(SQL_3D)
  await db.exec(`
    CREATE FUNCTION public.interna_aliquota(_pedido uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
      AS $$ SELECT public.apoio_codigo_aliquota(_pedido, '${APOIO}'::uuid) $$;
    GRANT EXECUTE ON FUNCTION public.interna_aliquota(uuid) TO authenticated;
  `)
})
afterEach(async () => { await db.close() })

describe('lab_aprovador_info (nome e conselho de quem liberou)', () => {
  const SQL = `SELECT array_agg(full_name ORDER BY full_name) r FROM lab_aprovador_info($1::uuid[])`
  it('usuário A pedindo profissionais de A e B recebe só o de A', async () => {
    expect(await um('authenticated', logado(USER_A), SQL, [[USER_A, USER_B]])).toEqual(['BIOQUIMICA A'])
  })
  it('usuário A pedindo só o profissional de B recebe vazio', async () => {
    expect(await um('authenticated', logado(USER_A), SQL, [[USER_B]])).toBeNull()
  })
  it('usuário B continua vendo o próprio profissional com o conselho', async () => {
    const r = await como<{ council_type: string; council_uf: string; council_number: string }>('authenticated', logado(USER_B),
      `SELECT * FROM lab_aprovador_info($1::uuid[])`, [[USER_B]])
    expect(r.rows.map(x => [x.council_type, x.council_uf, x.council_number])).toEqual([['CRF', 'RJ', '222']])
  })
  it('visitante sem login: permissão negada', async () => {
    expect(await erro('anon', { role: 'anon' }, SQL, [[USER_A]])).toMatch(/permission denied/)
  })
})

describe('apoio_item_material e apoio_codigo_aliquota', () => {
  it('pedido de outra empresa: material vazio e código nulo', async () => {
    expect(await um('authenticated', logado(USER_A), `SELECT apoio_item_material($1, $2) r`, [PEDIDO_B, EXAME])).toBe('')
    expect(await um('authenticated', logado(USER_A), `SELECT apoio_codigo_aliquota($1, $2) r`, [PEDIDO_B, APOIO])).toBeNull()
  })
  it('pedido da própria empresa: continua devolvendo material e código', async () => {
    expect(await um('authenticated', logado(USER_A), `SELECT apoio_item_material($1, $2) r`, [PEDIDO_A, EXAME])).toBe('SORO A')
    expect(await um('authenticated', logado(USER_A), `SELECT apoio_codigo_aliquota($1, $2) r`, [PEDIDO_A, APOIO])).toBe('7-01-AP1')
  })
  it('chamada por dentro de outra função do Apoio segue a mesma regra', async () => {
    expect(await um('authenticated', logado(USER_A), `SELECT interna_aliquota($1) r`, [PEDIDO_A])).toBe('7-01-AP1')
    expect(await um('authenticated', logado(USER_A), `SELECT interna_aliquota($1) r`, [PEDIDO_B])).toBeNull()
  })
  it('servidor (service_role) continua vendo qualquer pedido', async () => {
    expect(await um('service_role', SERVIDOR, `SELECT apoio_item_material($1, $2) r`, [PEDIDO_B, EXAME])).toBe('SORO B')
  })
})

describe('next_attendance_order_number', () => {
  const SQL = `SELECT next_attendance_order_number($1, NULL, '01') r`
  it('usuário A pedindo número da empresa B: recusado', async () => {
    expect(await erro('authenticated', logado(USER_A), SQL, [B])).toMatch(/Sem permissão/)
  })
  it('usuário A na própria empresa: próximo número', async () => {
    expect(await um('authenticated', logado(USER_A), SQL, [A])).toBe('8-01')
  })
  it('usuário B na própria empresa: próximo número', async () => {
    expect(await um('authenticated', logado(USER_B), SQL, [B])).toBe('10-01')
  })
  it('servidor (importação pelo parceiro) continua numerando', async () => {
    expect(await um('service_role', SERVIDOR, SQL, [B])).toBe('10-01')
  })
})

describe('carregar_feriados_nacionais', () => {
  const SQL = `SELECT carregar_feriados_nacionais(2027) r`
  it('usuário comum: recusado e nada gravado', async () => {
    expect(await erro('authenticated', logado(USER_A), SQL)).toMatch(/Apenas o administrador/)
    expect((await db.query<{ n: number }>(`SELECT count(*)::int n FROM feriado`)).rows[0].n).toBe(0)
  })
  it('gestor da empresa grava os 13 e a segunda vez não duplica', async () => {
    expect(await um('authenticated', logado(GESTOR_A), SQL)).toBe(13)
    expect(await um('authenticated', logado(GESTOR_A), SQL)).toBe(0)
    expect((await db.query<{ n: number }>(`SELECT count(*)::int n FROM feriado`)).rows[0].n).toBe(13)
  })
  it('Super Admin também pode carregar', async () => {
    expect(await um('authenticated', logado(SUPER), SQL)).toBe(13)
  })
})

describe('chat_interno_ativo e apoio_valida_cod_ped: só por dentro', () => {
  it('chamada direta de usuário logado: permissão negada', async () => {
    expect(await erro('authenticated', logado(USER_A), `SELECT chat_interno_ativo($1)`, [B])).toMatch(/permission denied/)
    expect(await erro('authenticated', logado(USER_A), `SELECT apoio_valida_cod_ped($1, 'ABC1234')`, [APOIO])).toMatch(/permission denied/)
  })
  it('as funções do banco que as usam continuam funcionando', async () => {
    expect(await um('authenticated', logado(USER_A), `SELECT interna_chat_ativo() r`)).toBe(true)
    expect(await um('authenticated', logado(USER_A), `SELECT interna_valida_cod($1, 'ABC1234') r`, [APOIO])).toBe(true)
    expect(await um('authenticated', logado(USER_B), `SELECT interna_valida_cod($1, 'ABC1234') r`, [APOIO])).toBeNull()
  })
  it('servidor mantém o acesso', async () => {
    expect(await um('service_role', SERVIDOR, `SELECT chat_interno_ativo($1) r`, [A])).toBe(true)
  })
})
