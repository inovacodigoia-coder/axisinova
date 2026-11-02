import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const cid = '00000000-0000-0000-0000-000000000001', other = '00000000-0000-0000-0000-000000000002'
const uid = '00000000-0000-0000-0000-000000000099'
const occ = '00000000-0000-0000-0000-0000000000a4', bed = '00000000-0000-0000-0000-0000000000a5', post = '00000000-0000-0000-0000-0000000000a6'
const convenio = '00000000-0000-0000-0000-0000000000b4', catalogo = '00000000-0000-0000-0000-0000000000b5', paciente = '00000000-0000-0000-0000-0000000000b6'

describe('Farmácia — cadastro de medicamentos e custo congelado na dispensação', () => {
  let db: PGlite
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
      CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='true'$$;
      CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.super',true)='true'$$;
      CREATE TABLE companies(id uuid primary key);
      CREATE TABLE sector_users(user_id uuid,sector_id text);
      CREATE TABLE company_sectors(id text,company_id uuid,is_active boolean,allowed_profile_ids text[]);
      CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);
      CREATE TABLE queue_tickets(id uuid primary key,company_id uuid,ticket_number text,patient_name text,status text);
      CREATE TABLE attendance_orders(id uuid primary key,company_id uuid,patient_id uuid,protocol text,convenio_id uuid,status text,lab_guides jsonb DEFAULT '[]');
      CREATE TABLE triage_entries(id uuid primary key,company_id uuid,patient_id uuid,ticket_id uuid,order_id uuid,protocol text,status text,color text,target_minutes int,classified_by uuid,doctor_started_by uuid,hospital_episode_id uuid);
      CREATE TABLE collection_posts(id uuid primary key,company_id uuid,name text);
      CREATE TABLE beds(id uuid primary key,company_id uuid,label text,post_id uuid);
      CREATE TABLE bed_occupancies(id uuid primary key,company_id uuid,patient_id uuid,patient_name text,bed_id uuid,status text,released_by uuid,release_reason text,hospital_episode_id uuid);
      CREATE TABLE bed_referrals(id uuid primary key,company_id uuid,occupancy_id uuid,destination text,status text);
      CREATE TABLE prescriptions(id uuid primary key default gen_random_uuid(),company_id uuid,occupancy_id uuid NOT NULL,bed_id uuid NOT NULL,patient_name text,doctor_name text,notes text,status text default 'active',created_by uuid,created_at timestamptz default now());
      CREATE TABLE prescription_items(id uuid primary key default gen_random_uuid(),company_id uuid,prescription_id uuid,medication text,dose text,route text,interval_hours numeric,doses_count int,first_dose_at timestamptz,created_at timestamptz default now());
      CREATE TABLE pharmacy_dispensations(id uuid primary key default gen_random_uuid(),company_id uuid,prescription_id uuid,status text default 'pending',urgent boolean default false,dispensed_by uuid,dispensed_at timestamptz,created_at timestamptz default now());
      CREATE FUNCTION pharmacy_dispense(uuid) RETURNS void LANGUAGE sql AS $$SELECT$$;
      CREATE TABLE medication_doses(id uuid primary key default gen_random_uuid(),company_id uuid,prescription_id uuid,scheduled_at timestamptz,occupancy_id uuid,prescription_item_id uuid,dose_number int,administered_at timestamptz,administered_by uuid);
      CREATE TABLE convenios(id uuid primary key,company_id uuid,exam_prices jsonb);
      CREATE TABLE lab_exam_results(id uuid primary key,company_id uuid,order_id uuid,patient_id uuid,exam_code text,exam_name text,exam_catalog_id uuid,status text,released_by uuid);
      CREATE TABLE admission_requests(id uuid primary key,company_id uuid,patient_id uuid,status text,hospital_episode_id uuid,admitted_by uuid,ended_by uuid);
      INSERT INTO companies VALUES('${cid}'),('${other}');
      INSERT INTO collection_posts VALUES('${post}','${cid}','Posto Adulto');
      INSERT INTO beds VALUES('${bed}','${cid}','Leito 01','${post}');
      INSERT INTO convenios VALUES('${convenio}','${cid}','[{"examId":"${catalogo}","price":42.5}]');
      SET test.uid='${uid}'; SET test.admin='true'; SET test.super='false';`)
    await db.exec(readFileSync('drizzle/migrations/0127_bi_hospitalar_modulo.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0128_bi_hospitalar_gatilhos.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0129_bi_hospitalar_permissoes_codigos.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0130_bi_hospitalar_episodio_retroativo.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0131_bi_hospitalar_imutabilidade_generica.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0132_bi_hospitalar_imutabilidade_aninhada.sql', 'utf8'))
    await db.exec(readFileSync('drizzle/migrations/0133_farmacia_medicamentos_custo.sql', 'utf8'))
    await db.exec(`INSERT INTO bed_occupancies(id,company_id,patient_id,patient_name,bed_id,status,hospital_episode_id) VALUES('${occ}','${cid}','${paciente}','Paciente Teste','${bed}','active',gen_random_uuid())`)
  }, 30000)
  afterAll(async () => { await db.close() })

  const salvar = (id: string | null, d: object) => db.query<{ id: string }>('select farmacia_medicamento_salvar($1,$2) id', [id, JSON.stringify(d)]).then(r => r.rows[0].id)
  const prescrever = (medId: string) => db.query<{ id: string }>('select prescription_create($1,null,null,$2) id', [occ, JSON.stringify([{ medicamento_id: medId, dose: '1 cp' }])]).then(r => r.rows[0].id)
  const dispensacao = (p: string) => db.query<{ id: string }>('select id from pharmacy_dispensations where prescription_id=$1', [p]).then(r => r.rows[0].id)
  const itens = (p: string, q: string) => db.query<{ id: string }>('select id from prescription_items where prescription_id=$1', [p]).then(r => r.rows.map(x => ({ item_id: x.id, quantidade: q })))

  it('código interno automático e sequencial por empresa', async () => {
    const a = await salvar(null, { nome: 'Dipirona', apresentacao: '500 mg', custo: '0.35' })
    const b = await salvar(null, { nome: 'Soro' })
    const r = await db.query<{ codigo: number }>('select codigo from farmacia_medicamentos where id in ($1,$2) order by codigo', [a, b])
    expect(r.rows.map(x => x.codigo)).toEqual([1, 2])
  })
  it('sem permissão, não cadastra (perfil sem farmacia.medicamentos.criar)', async () => {
    await db.exec("SET test.admin='false'")
    await expect(salvar(null, { nome: 'X' })).rejects.toThrow(/Sem permissão/)
    await db.exec("SET test.admin='true'")
  })
  it('mudança de custo gera histórico', async () => {
    const id = await salvar(null, { nome: 'Omeprazol', custo: '1.00' })
    await salvar(id, { nome: 'Omeprazol', custo: '1.20' })
    const r = await db.query<{ a: string | null; n: string }>('select custo_anterior a, custo_novo n from farmacia_medicamento_custos where medicamento_id=$1 order by alterado_em, custo_novo', [id])
    expect(r.rows.map(x => [x.a == null ? null : Number(x.a), Number(x.n)])).toEqual([[null, 1], [1, 1.2]])
  })
  it('prescrição só aceita medicamento cadastrado e ativo', async () => {
    const id = await salvar(null, { nome: 'Inativo' })
    await db.query('select farmacia_medicamento_ativo($1,false)', [id])
    await expect(prescrever(id)).rejects.toThrow(/cadastrado e ativo/)
    await expect(db.query('select prescription_create($1,null,null,$2)', [occ, '[{"medication":"Texto livre","dose":"1"}]'])).rejects.toThrow(/cadastrado e ativo/)
  })
  it('dispensação congela custo × quantidade no BI', async () => {
    const id = await salvar(null, { nome: 'Paracetamol', custo: '0.50' })
    const p = await prescrever(id)
    const d = await dispensacao(p)
    await db.query('select farmacia_dispensar($1,$2,$3,$4)', [d, JSON.stringify(await itens(p, '4')), 'Téc. Ana', 'Maria'])
    await salvar(id, { nome: 'Paracetamol', custo: '9.00' })
    const r = await db.query<{ v: string; q: string; t: string; sem: boolean }>(`select valor_unitario v, quantidade q, detalhes->>'valor_total' t, sem_valor_cadastrado sem from bi_consumo_itens where tipo='medicacao' and item_nome like 'Paracetamol%'`)
    expect(r.rows.map(x => [Number(x.v), Number(x.q), Number(x.t), x.sem])).toEqual([[0.5, 4, 2, false]])
  })
  it('medicamento sem custo entra como sem valor cadastrado', async () => {
    const id = await salvar(null, { nome: 'Sem Custo' })
    const p = await prescrever(id)
    await db.query('select farmacia_dispensar($1,$2,$3,$4)', [await dispensacao(p), JSON.stringify(await itens(p, '1')), 'Téc', 'Ret'])
    const r = await db.query<{ v: string | null; sem: boolean }>(`select valor_unitario v, sem_valor_cadastrado sem from bi_consumo_itens where item_nome='Sem Custo'`)
    expect(r.rows).toEqual([{ v: null, sem: true }])
  })
  it('exige quantidade, solicitante e quem retirou', async () => {
    const id = await salvar(null, { nome: 'Teste Q' })
    const p = await prescrever(id); const d = await dispensacao(p)
    await expect(db.query('select farmacia_dispensar($1,$2,$3,$4)', [d, JSON.stringify(await itens(p, '1')), '', 'R'])).rejects.toThrow(/quem solicitou/)
    await expect(db.query('select farmacia_dispensar($1,$2,$3,$4)', [d, JSON.stringify(await itens(p, '0')), 'S', 'R'])).rejects.toThrow(/quantidade/)
  })
  it('medicamento usado não pode ser excluído, só inativado', async () => {
    const id = await salvar(null, { nome: 'Usado' })
    await prescrever(id)
    await expect(db.query('delete from farmacia_medicamentos where id=$1', [id])).rejects.toThrow(/apenas inative/)
  })
  it('prescrição do atendimento médico entra na fila da Farmácia sem duplicar', async () => {
    const id = await salvar(null, { nome: 'Amoxicilina' })
    const args = ['ag-1', 'Paciente', 'Dr', null, JSON.stringify([{ medicamento_id: id, dose: '500 mg' }])]
    const a = (await db.query<{ id: string }>('select prescription_create_atendimento($1,$2,$3,$4,$5) id', args)).rows[0].id
    const b = (await db.query<{ id: string }>('select prescription_create_atendimento($1,$2,$3,$4,$5) id', args)).rows[0].id
    expect(a).toBe(b)
    const r = await db.query<{ n: number }>("select count(*)::int n from pharmacy_dispensations where prescription_id=$1 and status='pending'", [a])
    expect(r.rows[0].n).toBe(1)
  })
})
