import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Etapa 3A — funções da Bancada exigem login e mesma empresa; proteções de Super Admin da API de parceiros.
// PGlite com dados fictícios.
const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}
const PROTECOES_API = readFileSync('supabase/migrations/20260906045729_d9acd3f7-aa5c-40ec-90dd-7d246d12adcc.sql', 'utf8')

const EMPRESA = '00000000-0000-4000-8000-000000000001'
const OUTRA = '00000000-0000-4000-8000-000000000002'
const USUARIO = '00000000-0000-4000-8000-000000000020'
const USUARIO_OUTRA = '00000000-0000-4000-8000-000000000021'
const SUPER = '00000000-0000-4000-8000-000000000022'
const GESTOR = '00000000-0000-4000-8000-000000000023'
const EXAME = '00000000-0000-4000-8000-0000000000e1'
const BANCADA = '00000000-0000-4000-8000-0000000000b1'
const BANCADA_NOVA = '00000000-0000-4000-8000-0000000000b2'
const PEDIDO = '00000000-0000-4000-8000-0000000000a1'
const PARCEIRO = '00000000-0000-4000-8000-0000000000c1'

let db: PGlite

const como = async <T,>(role: string, uid: string | null, sql: string, params: unknown[] = []) => {
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`)
  try { return await db.query<T>(sql, params) } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '', false);`)
  }
}
const erroDe = async (role: string, uid: string | null, sql: string, params: unknown[] = []) => {
  try { await como(role, uid, sql, params); return null } catch (e) { return (e as Error).message }
}

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, private TO authenticated, anon;
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text);
    CREATE FUNCTION public.get_user_company_id(_uid uuid) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT company_id FROM public.profiles WHERE id = _uid $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;
    CREATE TABLE exams(id uuid PRIMARY KEY, company_id uuid, workbench_id uuid);
    CREATE TABLE lab_workbenches(id uuid PRIMARY KEY, company_id uuid, tipo text DEFAULT 'interna');
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY, company_id uuid, order_number text, protocol text, patient_name text,
      status text, lab_guides jsonb, created_at timestamptz DEFAULT now());
    CREATE TABLE apoio_pedido_exame(id uuid DEFAULT gen_random_uuid(), pedido_id uuid, exame_id uuid, status text, created_at timestamptz DEFAULT now());
    CREATE TABLE lab_exam_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, exam_catalog_id uuid, status text);
    CREATE TABLE lab_result_values(id uuid DEFAULT gen_random_uuid(), result_id uuid);
    CREATE FUNCTION public.bancada_item_coletado(_order_status text, _ex jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
      SELECT coalesce(_order_status,'') IN ('collection_done','in_analysis','validation','released','completed')
        OR coalesce((_ex->>'collected')::boolean,false) OR nullif(_ex->>'collectedAt','') IS NOT NULL $$;
    -- Mesmo texto da função em produção (chamada pela tela de troca de bancada)
    CREATE FUNCTION public.bancada_troca_previa(_exam uuid, _bancada uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
    DECLARE e exams%ROWTYPE; nb lab_workbenches%ROWTYPE; mover jsonb := '[]'; ficam jsonb := '[]'; naomov jsonb := '[]'; it record; j jsonb;
    BEGIN
      SELECT * INTO e FROM exams WHERE id = _exam AND company_id = get_user_company_id(auth.uid());
      IF NOT FOUND THEN RAISE EXCEPTION 'Exame não encontrado'; END IF;
      SELECT * INTO nb FROM lab_workbenches WHERE id = _bancada;
      FOR it IN SELECT * FROM bancada_itens_exame(_exam) WHERE bancada_id IS NOT DISTINCT FROM e.workbench_id ORDER BY criado_em LOOP
        j := jsonb_build_object('pedido_id', it.pedido_id, 'pedido', it.order_number, 'paciente', it.paciente, 'data', it.criado_em, 'ref', it.gi||':'||it.ei);
        IF it.coletado THEN ficam := ficam || j;
        ELSIF it.apoio_status IS NOT NULL AND it.apoio_status <> 'aguardando_remessa' AND coalesce(nb.tipo,'interna') = 'interna' THEN
          naomov := naomov || (j || jsonb_build_object('motivo', 'não movido: já em remessa'));
        ELSE mover := mover || j; END IF;
      END LOOP;
      RETURN jsonb_build_object('mover', mover, 'ficam', ficam, 'nao_movidos', naomov);
    END $$;
    GRANT EXECUTE ON FUNCTION public.bancada_troca_previa(uuid, uuid) TO anon, authenticated;

    CREATE TABLE companies(id uuid PRIMARY KEY, name text, partner_api_enabled boolean DEFAULT false, partner_api_max_partners int,
      partner_api_released_at timestamptz, partner_api_released_by uuid, partner_api_note text);
    CREATE TABLE api_partners(id uuid PRIMARY KEY, company_id uuid, name text, api_authorized boolean DEFAULT false);
    GRANT SELECT, INSERT, UPDATE ON companies, api_partners TO authenticated;

    INSERT INTO profiles VALUES ('${USUARIO}', '${EMPRESA}', 'receptionist'), ('${USUARIO_OUTRA}', '${OUTRA}', 'receptionist'),
      ('${SUPER}', NULL, 'super_admin'), ('${GESTOR}', '${EMPRESA}', 'company_admin');
    INSERT INTO lab_workbenches VALUES ('${BANCADA}', '${EMPRESA}', 'interna'), ('${BANCADA_NOVA}', '${EMPRESA}', 'interna');
    INSERT INTO exams VALUES ('${EXAME}', '${EMPRESA}', '${BANCADA}');
    INSERT INTO attendance_orders(id, company_id, order_number, patient_name, status, lab_guides) VALUES
      ('${PEDIDO}', '${EMPRESA}', 'P-001', 'PACIENTE FICTICIO', 'pending', '[{"exams":[{"id":"${EXAME}"}]}]');
    INSERT INTO lab_exam_results(order_id, exam_catalog_id, status) VALUES ('${PEDIDO}', '${EXAME}', 'digitized');
    INSERT INTO companies(id, name) VALUES ('${EMPRESA}', 'Empresa fictícia');
  `)
  await db.exec(migracao('bancada_funcoes_exigem_login'))
  await db.exec(PROTECOES_API)
})
afterEach(async () => { await db.close() })

describe('bancada_itens_exame', () => {
  it('sem login: permissão negada', async () => {
    expect(await erroDe('anon', null, `SELECT * FROM bancada_itens_exame($1)`, [EXAME])).toMatch(/permission denied/)
  })
  it('logado em outra empresa: volta vazio (sem nome de paciente)', async () => {
    const r = await como('authenticated', USUARIO_OUTRA, `SELECT * FROM bancada_itens_exame($1)`, [EXAME])
    expect(r.rows).toHaveLength(0)
  })
  it('logado sem empresa (conta sem perfil): volta vazio', async () => {
    const r = await como('authenticated', '00000000-0000-4000-8000-0000000000ff', `SELECT * FROM bancada_itens_exame($1)`, [EXAME])
    expect(r.rows).toHaveLength(0)
  })
  it('logado na mesma empresa: devolve o pedido em aberto', async () => {
    const r = await como<{ order_number: string; paciente: string }>('authenticated', USUARIO, `SELECT * FROM bancada_itens_exame($1)`, [EXAME])
    expect(r.rows.map(x => [x.order_number, x.paciente])).toEqual([['P-001', 'PACIENTE FICTICIO']])
  })
  it('a prévia da troca de bancada continua listando o pedido para a mesma empresa', async () => {
    const r = await como<{ r: { mover: { pedido: string }[] } }>('authenticated', USUARIO, `SELECT bancada_troca_previa($1, $2) r`, [EXAME, BANCADA_NOVA])
    expect(r.rows[0].r.mover.map(m => m.pedido)).toEqual(['P-001'])
  })
})

describe('bancada_item_tem_resultado', () => {
  it('sem login: permissão negada', async () => {
    expect(await erroDe('anon', null, `SELECT bancada_item_tem_resultado($1, $2)`, [PEDIDO, EXAME])).toMatch(/permission denied/)
  })
  it('logado em outra empresa: responde falso', async () => {
    const r = await como<{ r: boolean }>('authenticated', USUARIO_OUTRA, `SELECT bancada_item_tem_resultado($1, $2) r`, [PEDIDO, EXAME])
    expect(r.rows[0].r).toBe(false)
  })
  it('logado na mesma empresa: responde verdadeiro quando há resultado', async () => {
    const r = await como<{ r: boolean }>('authenticated', USUARIO, `SELECT bancada_item_tem_resultado($1, $2) r`, [PEDIDO, EXAME])
    expect(r.rows[0].r).toBe(true)
  })
})

describe('proteções de Super Admin da API de parceiros', () => {
  it('administrador da empresa não liga partner_api_enabled', async () => {
    await como('authenticated', GESTOR, `UPDATE companies SET partner_api_enabled = true, partner_api_max_partners = 99 WHERE id = $1`, [EMPRESA])
    const r = await db.query<{ partner_api_enabled: boolean; partner_api_max_partners: number | null }>(`SELECT partner_api_enabled, partner_api_max_partners FROM companies`)
    expect(r.rows[0]).toEqual({ partner_api_enabled: false, partner_api_max_partners: null })
  })
  it('usuário comum não cria parceiro já autorizado nem autoriza depois', async () => {
    await como('authenticated', USUARIO, `INSERT INTO api_partners VALUES ($1, $2, 'Parceiro fictício', true)`, [PARCEIRO, EMPRESA])
    expect((await db.query<{ a: boolean }>(`SELECT api_authorized a FROM api_partners`)).rows[0].a).toBe(false)
    await como('authenticated', USUARIO, `UPDATE api_partners SET api_authorized = true WHERE id = $1`, [PARCEIRO])
    expect((await db.query<{ a: boolean }>(`SELECT api_authorized a FROM api_partners`)).rows[0].a).toBe(false)
  })
  it('Super Admin consegue ligar as duas', async () => {
    await como('authenticated', SUPER, `UPDATE companies SET partner_api_enabled = true WHERE id = $1`, [EMPRESA])
    await como('authenticated', SUPER, `INSERT INTO api_partners VALUES ($1, $2, 'Parceiro fictício', true)`, [PARCEIRO, EMPRESA])
    expect((await db.query<{ e: boolean }>(`SELECT partner_api_enabled e FROM companies`)).rows[0].e).toBe(true)
    expect((await db.query<{ a: boolean }>(`SELECT api_authorized a FROM api_partners`)).rows[0].a).toBe(true)
  })
})
