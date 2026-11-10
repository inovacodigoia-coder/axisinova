import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Prazo adicional por Portal Externo — PostgreSQL isolado (PGlite), sem dados reais.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'
const ADM = '00000000-0000-4000-8000-000000000011'
const REC = '00000000-0000-4000-8000-000000000012'
const ADM2 = '00000000-0000-4000-8000-000000000013'
const ORIG = '00000000-0000-4000-8000-0000000000a1'
const ORIG2 = '00000000-0000-4000-8000-0000000000a2'
const DOC = '00000000-0000-4000-8000-0000000000d1'
const EX1 = '00000000-0000-4000-8000-0000000000e1'
const EX2 = '00000000-0000-4000-8000-0000000000e2'

const MIG = (() => {
  const f = readdirSync('drizzle/migrations').find(n => /_portal_prazo_adicional\.sql$/.test(n))
  return f ? `drizzle/migrations/${f}` : (process.env.PORTAL_PRAZO_SQL ?? '')
})()

const como = async (uid: string) => db.exec(`SET test.uid = '${uid}';`)
const rows = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows
const uma = async (sql: string) => (await rows(sql))[0]
const acesso = async (type: string, extra: string, company = C) =>
  (await uma(`INSERT INTO external_accesses(company_id,type,name,access_code,access_password${extra ? ',' + extra.split('=')[0] : ''})
    VALUES('${company}','${type}','Acesso ${type}','${Math.random().toString().slice(2, 8)}','1234'${extra ? ",'" + extra.split('=')[1] + "'" : ''}) RETURNING id`)).id as string
const definir = async (ids: string[], dias: number) =>
  (await uma(`SELECT portal_prazo_adicional_definir(ARRAY[${ids.map(i => `'${i}'`).join(',')}]::uuid[], ${dias}) n`)).n as number
const item = (id: string, data: string | null, contagem = 'corridos') =>
  ({ id, name: 'Exame', expectedDeliveryDate: data, prazoContagem: contagem })
const pedido = async (origin: string | null, doctor: string | null, exams: object[], company = C) =>
  (await uma(`INSERT INTO attendance_orders(company_id,origin_id,doctor_id,lab_guides)
    VALUES('${company}',${origin ? `'${origin}'` : 'NULL'},${doctor ? `'${doctor}'` : 'NULL'},'${JSON.stringify([{ id: '1', exams }])}'::jsonb)
    RETURNING id, lab_guides, delivery_date`))
const exames = (p: any) => p.lab_guides[0].exams as any[]

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, is_active boolean DEFAULT true);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE FUNCTION is_company_manager(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND role='company_admin') $$;
    CREATE FUNCTION calcular_prazo(_c uuid, _d date, _n int, _cont text) RETURNS date LANGUAGE plpgsql AS $$
      DECLARE d date := _d; k int := 0; BEGIN
        IF _cont = 'corridos' THEN RETURN _d + _n; END IF;
        WHILE k < _n LOOP d := d + 1; IF extract(isodow FROM d) < 6 THEN k := k + 1; END IF; END LOOP; RETURN d; END $$;
    CREATE TABLE external_accesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, type text, name text,
      status text NOT NULL DEFAULT 'active', access_code text UNIQUE, access_password text, origin_id uuid, doctor_id uuid,
      partner_origin_ids uuid[] DEFAULT '{}');
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, origin_id uuid, doctor_id uuid,
      lab_guides jsonb, delivery_date timestamptz);
    CREATE TABLE apoio_auditoria(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, tabela text, registro_id text, acao text,
      antes jsonb, depois jsonb, usuario_id uuid, created_at timestamptz DEFAULT now());
    CREATE TABLE apoio_laboratorio(id uuid PRIMARY KEY, nome text);
    CREATE TABLE lab_workbenches(id uuid PRIMARY KEY, company_id uuid, name text, tipo text, apoio_id uuid);
    CREATE FUNCTION bancada_prazo(_e uuid, _b uuid, _d date) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('prazo','2026-11-20','contagem','corridos') $$;
    CREATE FUNCTION bancada_laudo(_e uuid, _b uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    INSERT INTO profiles(id,company_id,role) VALUES('${ADM}','${C}','company_admin'),('${REC}','${C}','receptionist'),('${ADM2}','${C2}','company_admin');
  `)
  await db.exec(readFileSync(MIG, 'utf8'))
})
afterEach(async () => { await db.close() })

describe('Portais Externos — prazo adicional', () => {
  it('exame de 1 dia com +2 do Local fica com 3 dias (mantém o horário)', async () => {
    const id = await acesso('local', `origin_id=${ORIG}`)
    await como(ADM)
    expect(await definir([id], 2)).toBe(1)
    // pedido criado em 10/11 às 09:30 (Brasília) com prazo de 1 dia → 11/11 09:30; +2 → 13/11 09:30
    const p = await pedido(ORIG, null, [item(EX1, '2026-11-11T12:30:00.000Z')])
    expect(exames(p)[0].expectedDeliveryDate).toBe('2026-11-13T12:30:00.000Z')
    expect(exames(p)[0].prazoAdicionalPortal).toBe(2)
    expect(exames(p)[0].prazoSemAdicionalPortal).toBe('2026-11-11T12:30:00.000Z')
    expect(new Date(p.delivery_date).toISOString()).toBe('2026-11-13T12:30:00.000Z')
  })

  it('Parceiro vale para todas as origens vinculadas; outra origem não recebe', async () => {
    const id = await acesso('parceiro', `partner_origin_ids={${ORIG},${ORIG2}}`)
    await como(ADM); await definir([id], 3)
    const p = await pedido(ORIG2, null, [item(EX1, '2026-11-11T12:30:00.000Z')])
    expect(exames(p)[0].expectedDeliveryDate).toBe('2026-11-14T12:30:00.000Z')
    const outro = await pedido('00000000-0000-4000-8000-0000000000a9', null, [item(EX1, '2026-11-11T12:30:00.000Z')])
    expect(exames(outro)[0].expectedDeliveryDate).toBe('2026-11-11T12:30:00.000Z')
  })

  it('Médico soma pelo médico solicitante; com Local e Médico vale o maior, sem somar os dois', async () => {
    const m = await acesso('medico', `doctor_id=${DOC}`)
    const l = await acesso('local', `origin_id=${ORIG}`)
    await como(ADM); await definir([m], 4); await definir([l], 1)
    const p = await pedido(ORIG, DOC, [item(EX1, '2026-11-11T12:30:00.000Z')])
    expect(exames(p)[0].expectedDeliveryDate).toBe('2026-11-15T12:30:00.000Z')
  })

  it('exame em dias úteis pula o fim de semana', async () => {
    const id = await acesso('local', `origin_id=${ORIG}`)
    await como(ADM); await definir([id], 2)
    // sexta 13/11 + 2 úteis → terça 17/11
    const p = await pedido(ORIG, null, [item(EX1, '2026-11-13T18:00:00.000Z', 'uteis')])
    expect(exames(p)[0].expectedDeliveryDate).toBe('2026-11-17T18:00:00.000Z')
  })

  it('aplicar para todos de uma vez e zerar volta ao prazo do exame', async () => {
    const a = await acesso('local', `origin_id=${ORIG}`)
    const b = await acesso('parceiro', `partner_origin_ids={${ORIG2}}`)
    await como(ADM)
    expect(await definir([a, b], 5)).toBe(2)
    expect((await rows(`SELECT prazo_dias_adicionais d FROM external_accesses ORDER BY d`)).map(r => r.d)).toEqual([5, 5])
    expect(await definir([a, b], 0)).toBe(2)
    const p = await pedido(ORIG, null, [item(EX1, '2026-11-11T12:30:00.000Z')])
    expect(exames(p)[0].expectedDeliveryDate).toBe('2026-11-11T12:30:00.000Z')
    expect(exames(p)[0].prazoAdicionalPortal).toBeUndefined()
    expect((await uma(`SELECT count(*)::int n FROM apoio_auditoria WHERE acao='prazo_adicional_portal'`)).n).toBe(4)
  })

  it('pedido já existente não muda; só o exame novo incluído depois recebe o adicional', async () => {
    const id = await acesso('local', `origin_id=${ORIG}`)
    const antigo = await pedido(ORIG, null, [item(EX1, '2026-11-11T12:30:00.000Z')])
    await como(ADM); await definir([id], 2)
    const novos = [...exames(antigo), item(EX2, '2026-11-12T12:30:00.000Z')]
    const p = await uma(`UPDATE attendance_orders SET lab_guides='${JSON.stringify([{ id: '1', exams: novos }])}'::jsonb
      WHERE id='${antigo.id}' RETURNING lab_guides`)
    expect(exames(p)[0].expectedDeliveryDate).toBe('2026-11-11T12:30:00.000Z')
    expect(exames(p)[1].expectedDeliveryDate).toBe('2026-11-14T12:30:00.000Z')
    // salvar de novo não soma duas vezes
    const p2 = await uma(`UPDATE attendance_orders SET lab_guides=lab_guides WHERE id='${antigo.id}' RETURNING lab_guides`)
    expect(exames(p2)[1].expectedDeliveryDate).toBe('2026-11-14T12:30:00.000Z')
  })

  it('portal desativado não soma; exame sem prazo continua sem prazo', async () => {
    const id = await acesso('local', `origin_id=${ORIG}`)
    await como(ADM); await definir([id], 2)
    const p = await pedido(ORIG, null, [item(EX1, null)])
    expect(exames(p)[0].expectedDeliveryDate).toBeNull()
    await db.exec(`UPDATE external_accesses SET status='inactive' WHERE id='${id}'`)
    const p2 = await pedido(ORIG, null, [item(EX1, '2026-11-11T12:30:00.000Z')])
    expect(exames(p2)[0].expectedDeliveryDate).toBe('2026-11-11T12:30:00.000Z')
  })

  it('só o administrador define; nunca acesso de outra empresa; edição direta é bloqueada', async () => {
    const id = await acesso('local', `origin_id=${ORIG}`)
    await como(REC)
    await expect(definir([id], 2)).rejects.toThrow(/administrador/)
    await expect(db.exec(`UPDATE external_accesses SET prazo_dias_adicionais=2 WHERE id='${id}'`)).rejects.toThrow(/Prazo adicional/)
    await como(ADM2)
    expect(await definir([id], 2)).toBe(0)
    await como(ADM)
    await expect(definir([id], 400)).rejects.toThrow(/0 a 365/)
    expect((await uma(`SELECT prazo_dias_adicionais d FROM external_accesses WHERE id='${id}'`)).d).toBe(0)
  })

  it('troca de bancada recalcula o prazo e mantém o adicional do portal', async () => {
    const B = '00000000-0000-4000-8000-0000000000b1'
    await db.exec(`INSERT INTO lab_workbenches VALUES('${B}','${C}','Bioquímica','interna',NULL)`)
    const r = await uma(`SELECT bancada_aplicar_item('${JSON.stringify({ ...item(EX1, '2026-11-13T12:30:00.000Z'), prazoAdicionalPortal: 2 })}'::jsonb,
      '${EX1}','${B}','troca_pontual','teste',NULL) ex`)
    expect(r.ex.expectedDeliveryDate).toBe('2026-11-22T15:00:00.000Z')
    expect(r.ex.prazoAdicionalPortal).toBe(2)
  })
})
