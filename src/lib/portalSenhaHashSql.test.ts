import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Etapa 3C.2 — senha do portal só como hash (bcrypt), exibida uma vez, trava no servidor.
// PostgreSQL isolado (PGlite), dados fictícios; o bloco final confere o banco real só em leitura.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'
const U1 = '00000000-0000-4000-8000-000000000011'
const O1 = '00000000-0000-4000-8000-0000000000a1'
const PCPF = '00000000-0000-4000-8000-0000000000f1'
const PSEM = '00000000-0000-4000-8000-0000000000f2'
const POUTRA = '00000000-0000-4000-8000-0000000000f3'

const migracao = (trecho: string) => {
  const f = readdirSync('drizzle/migrations').find(n => n.endsWith('.sql') && n.includes(trecho))
  if (!f && process.env.PORTAL_COLUNA_SQL && trecho === 'portal_senha_coluna_fechada') return readFileSync(process.env.PORTAL_COLUNA_SQL, 'utf8')
  if (!f) throw new Error(`migração ${trecho} não encontrada`)
  return readFileSync(`drizzle/migrations/${f}`, 'utf8')
}
const uma = async (sql: string, p: unknown[] = []) => (await db.query<Record<string, any>>(sql, p)).rows[0]
const fetch = async (code: string, senha: string) => (await uma(`SELECT portal_fetch($1,$2) r`, [code, senha])).r
const como = (uid: string | null) => db.exec(`SET test.uid = '${uid ?? ''}'`)
const falhasDe = async (code: string) =>
  Number((await uma(`SELECT count(*) n FROM external_access_logs WHERE access_code=$1 AND NOT success`, [code])).n)
const ZERAR_FALHAS = `DELETE FROM external_access_logs WHERE NOT success`

// Conversão usada no banco real (mesmo SQL, em lotes)
const CONVERTER = `WITH alvo AS (
  SELECT id FROM public.external_accesses
  WHERE access_password_hash IS NULL AND access_password IS NOT NULL AND access_password <> ''
  ORDER BY id LIMIT 800
), feito AS (
  UPDATE public.external_accesses e
     SET access_password_hash = extensions.crypt(e.access_password, extensions.gen_salt('bf', 10))
    FROM alvo WHERE e.id = alvo.id
  RETURNING e.id, e.company_id
), log AS (
  INSERT INTO public.external_access_senha_log (company_id, access_id, evento)
  SELECT company_id, id, 'convertida' FROM feito RETURNING 1
)
SELECT (SELECT count(*) FROM feito) AS convertidas`

const ANTIGAS: Array<[string, string]> = [
  ['10001', '4821'], ['10002', '0007'], ['10003', '9350'], ['10004', '1234'], ['10005', '6619'],
  ['10006', '2048'], ['10007', '7777'], ['10008', '5302'],
]

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto SCHEMA extensions;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY, name text);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, full_name text);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE FUNCTION chat_interno_ativo(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE system_settings(key text PRIMARY KEY, value jsonb, updated_at timestamptz DEFAULT now());
    CREATE TABLE patients(id uuid PRIMARY KEY, company_id uuid, cpf text, birth_date date, gender text);
    CREATE TABLE company_branding(company_id uuid, brand_name text, logo_url text);
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, origin_id uuid,
      origin_name text, status text, lab_guides jsonb, patient_name text, patient_id uuid, doctor_id uuid, protocol text,
      order_number text, delivery_date timestamptz, doctor_name text, doctor_crm text, convenio_name text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE lab_exam_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, order_id uuid, exam_ref text,
      exam_name text, exam_code text, status text, typed_at timestamptz, released_at timestamptz, released_by uuid,
      portal_blocked_types text[], exam_catalog_id uuid, notes text);
    CREATE TABLE exams(id uuid PRIMARY KEY, report_template_id uuid);
    CREATE TABLE lab_settings(id uuid PRIMARY KEY, company_id uuid);
    CREATE TABLE lab_report_templates(id uuid PRIMARY KEY);
    CREATE TABLE external_accesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, type text, name text,
      email text, status text NOT NULL DEFAULT 'active', access_code text UNIQUE, access_password text, patient_id uuid,
      doctor_id uuid, origin_id uuid, partner_origin_ids uuid[] DEFAULT '{}', partner_type text, cnpj text,
      responsible_name text, phone text, crm text, specialty text, permissions jsonb DEFAULT '{}', last_access_at timestamptz,
      created_by uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), password_kind text,
      prazo_dias_adicionais int DEFAULT 0);
    CREATE TABLE external_access_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, access_id uuid,
      access_code text NOT NULL, access_type text, action text NOT NULL, success boolean NOT NULL, details text,
      ip_address text, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION generate_external_access_code() RETURNS text LANGUAGE plpgsql AS $$
    DECLARE c text; BEGIN
      LOOP c := lpad((10000 + floor(random() * 90000))::int::text, 5, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM external_accesses WHERE access_code = c); END LOOP;
      RETURN c; END $$;
    -- privilégios como no banco real antes da etapa
    GRANT ALL ON external_accesses TO anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    INSERT INTO companies VALUES('${C}','Lab Teste'),('${C2}','Outra');
    INSERT INTO profiles VALUES('${U1}','${C}','Recepção Teste');
    INSERT INTO patients(id,company_id,cpf) VALUES('${PCPF}','${C}','123.456.789-09'),('${PSEM}','${C}',NULL),('${POUTRA}','${C2}','111.222.333-44');
  `)
  for (const [code, senha] of ANTIGAS) {
    await db.query(`INSERT INTO external_accesses(company_id,type,name,access_code,access_password,origin_id,password_kind)
      VALUES($1,'local','UBS '||$2,$2,$3,$4,'random')`, [C, code, senha, O1])
  }
  await db.exec(migracao('portal_senha_hash_base'))
  await db.exec(CONVERTER)
  await db.exec(migracao('portal_senha_so_hash_e_trava'))
  await db.exec(migracao('portal_senha_coluna_fechada'))
}, 120_000)
afterAll(async () => { await db?.close() })

describe('Etapa 3C.2 — senha do portal só como hash', () => {
  it('(a) senhas antigas continuam entrando pelo hash; erradas são recusadas', async () => {
    const r = await uma(`SELECT count(*) n, count(access_password_hash) h,
      count(*) FILTER (WHERE access_password_hash LIKE '$2a$10$%') bf FROM external_accesses`)
    expect(Number(r.h)).toBe(ANTIGAS.length)
    expect(Number(r.bf)).toBe(ANTIGAS.length)
    for (const [code, senha] of ANTIGAS) {
      expect((await fetch(code, senha)).ok).toBe(true)
      expect(await fetch(code, senha === '9999' ? '9998' : '9999')).toEqual({ ok: false, error: 'invalid_password' })
    }
    // comparação é só pelo hash: trocar o texto antigo não muda nada
    await db.exec(`ALTER TABLE external_accesses DISABLE TRIGGER external_accesses_senha_hash;
      UPDATE external_accesses SET access_password='0000' WHERE access_code='10001';
      ALTER TABLE external_accesses ENABLE TRIGGER external_accesses_senha_hash;`)
    expect((await fetch('10001', '4821')).ok).toBe(true)
    expect((await fetch('10001', '0000')).ok).toBe(false)
    await db.exec(ZERAR_FALHAS)
  }, 120_000)

  it('(b) nenhum perfil logado nem visitante lê ou grava a senha (texto ou hash)', async () => {
    for (const papel of ['authenticated', 'anon']) {
      await db.exec(`SET ROLE ${papel}`)
      await expect(db.query(`SELECT access_password FROM external_accesses`)).rejects.toThrow(/permission denied/)
      await expect(db.query(`SELECT access_password_hash FROM external_accesses`)).rejects.toThrow(/permission denied/)
      await expect(db.query(`SELECT * FROM external_accesses`)).rejects.toThrow(/permission denied/)
      await expect(db.query(`UPDATE external_accesses SET access_password_hash='x'`)).rejects.toThrow(/permission denied/)
      await expect(db.query(`INSERT INTO external_accesses(company_id,type,name,access_code,access_password) VALUES('${C}','local','x','99999','1')`)).rejects.toThrow(/permission denied/)
      await db.exec(`RESET ROLE`)
    }
    await db.exec(`SET ROLE authenticated`)
    const ok = await db.query(`SELECT id, name, access_code, password_kind FROM external_accesses LIMIT 1`)
    expect(ok.rows.length).toBe(1)
    await db.exec(`RESET ROLE`)
    // as funções que montam o registro para a tela nunca levam as colunas de senha
    const j = (await uma(`SELECT portal__acesso_json(e) j FROM external_accesses e LIMIT 1`)).j
    expect(Object.keys(j)).not.toContain('access_password')
    expect(Object.keys(j)).not.toContain('access_password_hash')
  })

  it('(c) regenerar invalida a senha antiga, zera as falhas e libera o bloqueio', async () => {
    await como(U1)
    for (let i = 0; i < 10; i++) await fetch('10002', '1111')
    expect(await fetch('10002', '0007')).toEqual({ ok: false, error: 'locked' })
    const id = (await uma(`SELECT id FROM external_accesses WHERE access_code='10002'`)).id
    const r = (await uma(`SELECT portal_acesso_regenerar($1, false) r`, [id])).r
    expect(r.access_code).toBe('10002')
    expect(r.senha).toMatch(/^\d{8}$/)
    expect((await fetch('10002', r.senha)).ok).toBe(true)
    expect(await fetch('10002', '0007')).toEqual({ ok: false, error: 'invalid_password' })
    const log = await uma(`SELECT evento, user_id FROM external_access_senha_log WHERE access_id=$1 ORDER BY created_at DESC LIMIT 1`, [id])
    expect(log).toEqual({ evento: 'regenerada', user_id: U1 })
    // outra empresa não regenera
    await db.query(`INSERT INTO profiles VALUES('00000000-0000-4000-8000-000000000099','${C2}','Outra')`)
    await como('00000000-0000-4000-8000-000000000099')
    await expect(db.query(`SELECT portal_acesso_regenerar($1, false)`, [id])).rejects.toThrow(/Acesso não encontrado/)
    await como(null)
    await expect(db.query(`SELECT portal_acesso_regenerar($1, false)`, [id])).rejects.toThrow(/Sem permissão/)
    await db.exec(ZERAR_FALHAS)
  }, 60_000)

  it('(d) a senha só volta na resposta da geração e não aparece em nenhum registro', async () => {
    await como(U1)
    const r = (await uma(`SELECT portal_acesso_criar($1::jsonb) r`, [JSON.stringify({ type: 'local', name: 'UBS Nova', origin_id: O1, company_id: C2 })])).r
    expect(r.senha).toMatch(/^\d{8}$/)
    expect(r.company_id).toBe(C) // empresa vem da sessão, não do pedido
    const linha = await uma(`SELECT access_password, access_password_hash, senha_gerada_por FROM external_accesses WHERE id=$1`, [r.id])
    expect(linha.access_password).toBeNull()
    expect(linha.access_password_hash).not.toContain(r.senha)
    expect(linha.senha_gerada_por).toBe(U1)
    await fetch(r.access_code, '00000001')
    const tudo = await uma(`SELECT
      (SELECT coalesce(string_agg(to_jsonb(l)::text, ''), '') FROM external_access_senha_log l) a,
      (SELECT coalesce(string_agg(to_jsonb(l)::text, ''), '') FROM external_access_logs l) b`)
    expect(tudo.a).not.toContain(r.senha)
    expect(tudo.b).not.toContain(r.senha)
    expect((await uma(`SELECT evento FROM external_access_senha_log WHERE access_id=$1`, [r.id])).evento).toBe('gerada')
    // tela antiga que ainda grava texto: vira hash na hora e o texto não fica
    await db.exec(`UPDATE external_accesses SET access_password='5555' WHERE id='${r.id}'`)
    expect((await uma(`SELECT access_password p FROM external_accesses WHERE id=$1`, [r.id])).p).toBeNull()
    expect((await fetch(r.access_code, '5555')).ok).toBe(true)
    await db.exec(ZERAR_FALHAS)
  }, 60_000)

  it('(e) senhas geradas têm 8 números e não são triviais; tamanho configurável', async () => {
    for (const t of ['00000000', '12345678', '87654321', '90123456', '12121212', '11112222', '12341234', '1a345678'])
      expect((await uma(`SELECT portal_senha_trivial($1) t`, [t])).t).toBe(true)
    expect((await uma(`SELECT portal_senha_trivial('48207193') t`)).t).toBe(false)
    const geradas = (await db.query<{ s: string }>(`SELECT portal_senha_gerar() s FROM generate_series(1,200)`)).rows.map(r => r.s)
    for (const s of geradas) {
      expect(s).toMatch(/^\d{8}$/)
      expect((await uma(`SELECT portal_senha_trivial($1) t`, [s])).t).toBe(false)
    }
    expect(new Set(geradas).size).toBeGreaterThan(195)
    await db.exec(`INSERT INTO system_settings(key,value) VALUES('portal_senha_tamanho','10')`)
    expect((await uma(`SELECT portal_senha_gerar() s`)).s).toMatch(/^\d{10}$/)
    await db.exec(`DELETE FROM system_settings WHERE key='portal_senha_tamanho'`)
  })

  it('(f) trava no servidor e resposta uniforme', async () => {
    // código inexistente e senha errada: mesma resposta
    expect(await fetch('77777', '12345678')).toEqual({ ok: false, error: 'invalid_password' })
    expect(await fetch('10003', '12345678')).toEqual({ ok: false, error: 'invalid_password' })
    // abrir a tela (senha vazia) não conta nem revela nada
    expect(await fetch('10003', '')).toEqual({ ok: false, error: 'invalid_password' })
    expect(await falhasDe('10003')).toBe(1)
    // o navegador não consegue registrar falha (nem travar o código de outro)
    for (let i = 0; i < 12; i++) await db.query(`SELECT portal_log_attempt('10003', false, 'login')`)
    expect(await falhasDe('10003')).toBe(1)
    for (let i = 0; i < 9; i++) await fetch('10003', '0000')
    expect(await fetch('10003', '9350')).toEqual({ ok: false, error: 'locked' })
    expect((await uma(`SELECT portal_fetch_laudo('10003','9350',gen_random_uuid()) r`)).r).toEqual({ ok: false, error: 'locked' })
    // trava vale também para código inexistente
    for (let i = 0; i < 9; i++) await fetch('77777', '1')
    expect(await fetch('77777', '1')).toEqual({ ok: false, error: 'locked' })
    // acesso inativo só se revela com a senha certa
    await db.exec(`UPDATE external_accesses SET status='inactive' WHERE access_code='10005'`)
    expect(await fetch('10005', '1')).toEqual({ ok: false, error: 'invalid_password' })
    expect(await fetch('10005', '6619')).toEqual({ ok: false, error: 'inactive' })
    await db.exec(`UPDATE external_accesses SET status='active' WHERE access_code='10005'`)
    await db.exec(ZERAR_FALHAS)
  }, 60_000)

  it('(g) portal, laudo e chat funcionam com a senha correta', async () => {
    const ped = (await uma(`INSERT INTO attendance_orders(company_id,origin_id,status,lab_guides,patient_name)
      VALUES('${C}','${O1}','open','[]','PACIENTE TESTE') RETURNING id`)).id
    const p = await fetch('10006', '2048')
    expect(p.ok).toBe(true)
    expect(p.orders.map((o: any) => o.id)).toContain(ped)
    // laudo: senha certa passa da conferência (exame inexistente), errada não
    expect((await uma(`SELECT portal_fetch_laudo('10006','2048',gen_random_uuid()) r`)).r).toEqual({ ok: false, error: 'not_found' })
    expect((await uma(`SELECT portal_fetch_laudo('10006','2049',gen_random_uuid()) r`)).r).toEqual({ ok: false, error: 'invalid_password' })
    const chat = (await uma(`SELECT portal__chat_validar('10006','2048') r`)).r
    expect(chat.ok).toBe(true)
    expect((await uma(`SELECT portal__chat_validar('10006','2047') r`)).r).toEqual({ ok: false, error: 'invalid_password' })
    await db.exec(ZERAR_FALHAS)
  }, 60_000)

  it('paciente: CPF como hoje; sem CPF senha nova só na resposta; acesso existente não muda', async () => {
    await como(U1)
    const comCpf = (await uma(`SELECT portal_acesso_paciente_garantir($1,'MARIA',NULL,false) r`, [PCPF])).r
    expect(comCpf.password_kind).toBe('cpf')
    expect(comCpf.senha).toBeUndefined()
    expect((await fetch(comCpf.access_code, '8909')).ok).toBe(true)
    // de novo: mesmo acesso, sem senha e sem mudança
    const deNovo = (await uma(`SELECT portal_acesso_paciente_garantir($1,'MARIA',NULL,false) r`, [PCPF])).r
    expect(deNovo.id).toBe(comCpf.id)
    expect(deNovo.senha).toBeUndefined()
    expect((await fetch(comCpf.access_code, '8909')).ok).toBe(true)
    // senha nova pedida: modelo novo, a do CPF deixa de valer
    const nova = (await uma(`SELECT portal_acesso_paciente_garantir($1,'MARIA',NULL,true) r`, [PCPF])).r
    expect(nova.senha).toMatch(/^\d{8}$/)
    expect(nova.password_kind).toBe('random')
    expect((await fetch(comCpf.access_code, '8909')).ok).toBe(false)
    expect((await fetch(comCpf.access_code, nova.senha)).ok).toBe(true)
    const semCpf = (await uma(`SELECT portal_acesso_paciente_garantir($1,'JOAO',NULL,false) r`, [PSEM])).r
    expect(semCpf.senha).toMatch(/^\d{8}$/)
    await expect(db.query(`SELECT portal_acesso_paciente_garantir($1,'X',NULL,false)`, [POUTRA])).rejects.toThrow(/Paciente não encontrado/)
    await db.exec(ZERAR_FALHAS)
  }, 60_000)
})

// Banco real (somente leitura): todas as linhas com hash e colunas de senha fechadas.
describe.skipIf(!process.env.PGHOST)('banco real', () => {
  const q = (sql: string) => execFileSync('psql', ['-At', '-c', sql], { encoding: 'utf8' }).trim()
  it('todas as linhas têm hash bcrypt', () => {
    expect(q(`select count(*) filter (where access_password_hash is null or access_password_hash not like '$2a$%') from external_accesses`)).toBe('0')
  })
  it('authenticated e anon não leem nem gravam as colunas de senha', () => {
    for (const papel of ['authenticated', 'anon'])
      for (const col of ['access_password', 'access_password_hash'])
        for (const priv of ['SELECT', 'UPDATE', 'INSERT'])
          expect(q(`select has_column_privilege('${papel}','public.external_accesses','${col}','${priv}')`)).toBe('f')
  })
})
