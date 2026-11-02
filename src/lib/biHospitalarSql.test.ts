import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const cid = '00000000-0000-0000-0000-000000000001', other = '00000000-0000-0000-0000-000000000002'
const uid = '00000000-0000-0000-0000-000000000099'
const ticket = '00000000-0000-0000-0000-0000000000a1', pedido = '00000000-0000-0000-0000-0000000000a2'
const tri = '00000000-0000-0000-0000-0000000000a3', occ = '00000000-0000-0000-0000-0000000000a4'
const bed = '00000000-0000-0000-0000-0000000000a5', post = '00000000-0000-0000-0000-0000000000a6'
const presc = '00000000-0000-0000-0000-0000000000a7', item = '00000000-0000-0000-0000-0000000000a8'
const disp = '00000000-0000-0000-0000-0000000000a9', dose = '00000000-0000-0000-0000-0000000000b1'
const exame = '00000000-0000-0000-0000-0000000000b2', adm = '00000000-0000-0000-0000-0000000000b3'
const convenio = '00000000-0000-0000-0000-0000000000b4', catalogo = '00000000-0000-0000-0000-0000000000b5'
const paciente = '00000000-0000-0000-0000-0000000000b6'

describe('BI Gestão Hospitalar — Etapa 1: módulo, jornada, consumo e segmentos', () => {
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
      CREATE TABLE bed_occupancies(id uuid primary key,company_id uuid,patient_id uuid,bed_id uuid,status text,released_by uuid,release_reason text,hospital_episode_id uuid);
      CREATE TABLE bed_referrals(id uuid primary key,company_id uuid,occupancy_id uuid,destination text,status text);
      CREATE TABLE prescriptions(id uuid primary key,company_id uuid,occupancy_id uuid,prescribed_by uuid);
      CREATE TABLE prescription_items(id uuid primary key,prescription_id uuid,medication text,dose text);
      CREATE TABLE pharmacy_dispensations(id uuid primary key,company_id uuid,prescription_id uuid,status text,dispensed_by uuid);
      CREATE TABLE medication_doses(id uuid primary key,company_id uuid,occupancy_id uuid,prescription_item_id uuid,dose_number int,administered_at timestamptz,administered_by uuid);
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
  }, 30000)
  afterAll(async () => { await db.close() })

  const eventos = () => db.query<{ tipo_evento: string }>('select tipo_evento from bi_jornada_eventos where company_id=$1 order by ocorrido_em, created_at', [cid]).then(r => r.rows.map(x => x.tipo_evento))

  it('módulo nasce desabilitado em empresas novas e existentes', async () => {
    const r = await db.query<{ bi_hospitalar_habilitado: boolean }>('select bi_hospitalar_habilitado from companies order by id')
    expect(r.rows).toEqual([{ bi_hospitalar_habilitado: false }, { bi_hospitalar_habilitado: false }])
  })
  it('sem habilitação, ninguém tem acesso', async () => {
    expect((await db.query<{ ver: boolean }>("select (bi_meu_acesso()->>'ver')::boolean ver")).rows[0].ver).toBe(false)
  })
  it('somente Super Admin habilita o módulo', async () => {
    await expect(db.query('select bi_hospitalar_liberar($1,true)', [cid])).rejects.toThrow(/Super Admin/)
    await db.exec("SET test.super='true'")
    await db.query('select bi_hospitalar_liberar($1,true)', [cid])
    await db.exec("SET test.super='false'")
    expect((await db.query<{ ok: boolean }>('select bi_hospitalar_habilitada() ok')).rows[0].ok).toBe(true)
  })
  it('perfil sem o grupo configurado fica sem acesso mesmo com módulo ligado', async () => {
    await db.exec("SET test.admin='false'")
    expect((await db.query<{ ver: boolean }>("select (bi_meu_acesso()->>'ver')::boolean ver")).rows[0].ver).toBe(false)
    await db.exec(`INSERT INTO sector_users VALUES('${uid}','s1');INSERT INTO company_sectors VALUES('s1','${cid}',true,ARRAY['p']);
      INSERT INTO access_profiles VALUES('p','${cid}',true,'{"bi_hospitalar":["bi_hospitalar.ver"]}')`)
    expect((await db.query<{ ver: boolean }>("select (bi_meu_acesso()->>'ver')::boolean ver")).rows[0].ver).toBe(true)
    expect((await db.query<{ exp: boolean }>("select (bi_meu_acesso()->>'exportar')::boolean exp")).rows[0].exp).toBe(false)
    await db.exec("SET test.admin='true'")
  })
  it('jornada completa gera todos os eventos na ordem', async () => {
    await db.query(`insert into queue_tickets(id,company_id,ticket_number,patient_name,status) values('${ticket}','${cid}','A001','Paciente BI','waiting')`)
    await db.query(`update queue_tickets set status='called' where id='${ticket}'`)
    await db.query(`update queue_tickets set status='in_attendance' where id='${ticket}'`)
    await db.query(`update queue_tickets set status='finalized' where id='${ticket}'`)
    await db.query(`insert into triage_entries(id,company_id,patient_id,ticket_id,order_id,protocol,status,hospital_episode_id) values('${tri}','${cid}','${paciente}','${ticket}',null,'P1','waiting','${tri}')`)
    await db.query(`update triage_entries set status='classified',color='yellow',target_minutes=60,classified_by='${uid}' where id='${tri}'`)
    await db.query(`update triage_entries set status='in_doctor' where id='${tri}'`)
    await db.query(`update triage_entries set status='in_attendance',doctor_started_by='${uid}' where id='${tri}'`)
    await db.query(`update triage_entries set status='done' where id='${tri}'`)
    await db.query(`insert into bed_occupancies(id,company_id,patient_id,bed_id,status,hospital_episode_id) values('${occ}','${cid}','${paciente}','${bed}','active','${tri}')`)
    await db.query(`insert into prescriptions(id,company_id,occupancy_id,prescribed_by) values('${presc}','${cid}','${occ}','${uid}')`)
    await db.query(`insert into prescription_items(id,prescription_id,medication,dose) values('${item}','${presc}','Dipirona','1g')`)
    await db.query(`insert into pharmacy_dispensations(id,company_id,prescription_id,status) values('${disp}','${cid}','${presc}','pending')`)
    await db.query(`update pharmacy_dispensations set status='dispensed',dispensed_by='${uid}' where id='${disp}'`)
    await db.query(`insert into medication_doses(id,company_id,occupancy_id,prescription_item_id,dose_number) values('${dose}','${cid}','${occ}','${item}',1)`)
    await db.query(`update medication_doses set administered_at=now(),administered_by='${uid}' where id='${dose}'`)
    await db.query(`insert into attendance_orders(id,company_id,patient_id,protocol,convenio_id,status) values('${pedido}','${cid}','${paciente}','P1','${convenio}','open')`)
    await db.query(`insert into lab_exam_results(id,company_id,order_id,patient_id,exam_code,exam_name,exam_catalog_id,status,released_by) values('${exame}','${cid}','${pedido}','${paciente}','HEM','Hemograma','${catalogo}','released','${uid}')`)
    await db.query(`insert into admission_requests(id,company_id,patient_id,status,hospital_episode_id) values('${adm}','${cid}','${paciente}','pending','${tri}')`)
    await db.query(`update admission_requests set status='approved' where id='${adm}'`)
    await db.query(`update admission_requests set status='admitted',admitted_by='${uid}' where id='${adm}'`)
    await db.query(`update admission_requests set status='discharged',ended_by='${uid}' where id='${adm}'`)
    const tipos = await eventos()
    const esperado = ['chegada', 'chamada_recepcao', 'inicio_recepcao', 'fim_recepcao', 'triagem_inicio', 'triagem_classificacao', 'triagem_envio_medico', 'medico_entrada_fila', 'consulta_inicio', 'consulta_fim', 'leito_alocacao', 'medicacao_prescricao', 'medicacao_dispensacao', 'medicacao_administracao', 'exame_solicitacao', 'exame_liberacao', 'internacao_solicitacao', 'internacao_aprovacao', 'internacao_chegada', 'saida_alta']
    for (const e of esperado) expect(tipos).toContain(e)
    expect(tipos.indexOf('chegada')).toBeLessThan(tipos.indexOf('triagem_inicio'))
    expect(tipos.indexOf('triagem_inicio')).toBeLessThan(tipos.indexOf('consulta_inicio'))
    expect(tipos.indexOf('consulta_fim')).toBeLessThan(tipos.indexOf('saida_alta'))
    expect((await db.query<{ n: number }>(`select count(*)::int n from bi_jornada_erros where company_id='${cid}'`)).rows[0].n).toBe(0)
  })
  it('senha do totem recebe o episódio ao entrar na triagem', async () => {
    expect((await db.query<{ ep: string }>(`select hospital_episode_id ep from queue_tickets where id='${ticket}'`)).rows[0].ep).toBe(tri)
  })
  it('episódio do ticket não pode ser trocado', async () => {
    await expect(db.query(`update queue_tickets set hospital_episode_id='${other}' where id='${ticket}'`)).rejects.toThrow(/não pode ser alterado/)
  })
  it('medicação consumida fica sem valor cadastrado (não assume zero)', async () => {
    const r = await db.query<{ valor: number | null; sem: boolean }>(`select valor_unitario valor, sem_valor_cadastrado sem from bi_consumo_itens where tipo='medicacao' and origem_id='${dose}'`)
    expect(r.rows).toEqual([{ valor: null, sem: true }])
  })
  it('exame liberado congela o preço do convênio pelo código interno', async () => {
    const r = await db.query<{ codigo: string; valor: string; sem: boolean }>(`select item_codigo codigo, valor_unitario::text valor, sem_valor_cadastrado sem from bi_consumo_itens where tipo='exame' and origem_id='${exame}'`)
    expect(r.rows).toEqual([{ codigo: 'HEM', valor: '42.5', sem: false }])
    await db.query(`update convenios set exam_prices='[{"examId":"${catalogo}","price":99}]' where id='${convenio}'`)
    const depois = await db.query<{ valor: string }>(`select valor_unitario::text valor from bi_consumo_itens where origem_id='${exame}'`)
    expect(depois.rows[0].valor).toBe('42.5')
  })
  it('exame sem preço no convênio fica marcado sem valor cadastrado', async () => {
    await db.query(`insert into lab_exam_results(id,company_id,order_id,patient_id,exam_code,exam_name,exam_catalog_id,status) values('00000000-0000-0000-0000-0000000000c1','${cid}','${pedido}','${paciente}','GLI','Glicose',null,'released')`)
    const r = await db.query<{ sem: boolean }>(`select sem_valor_cadastrado sem from bi_consumo_itens where item_codigo='GLI'`)
    expect(r.rows[0].sem).toBe(true)
  })
  it('eventos e consumos são imutáveis', async () => {
    await expect(db.query(`update bi_jornada_eventos set setor='X' where company_id='${cid}' limit 1`)).rejects.toThrow(/imutáveis/)
    await expect(db.query(`delete from bi_jornada_eventos where company_id='${cid}'`)).rejects.toThrow(/imutáveis/)
    await expect(db.query(`update bi_consumo_itens set valor_unitario=1 where origem_id='${exame}'`)).rejects.toThrow(/imutáveis/)
  })
  it('view de segmentos devolve tempo por setor com segmento em andamento', async () => {
    await db.query(`insert into triage_entries(id,company_id,patient_id,protocol,status,hospital_episode_id) values('00000000-0000-0000-0000-0000000000c2','${cid}','${paciente}','P2','waiting','00000000-0000-0000-0000-0000000000c2')`)
    const r = await db.query<{ setor: string; em_andamento: boolean; duracao: string }>(`select setor, em_andamento, duracao_minutos::text duracao from bi_jornada_segmentos where company_id='${cid}' and hospital_episode_id='${tri}' order by inicio`)
    expect(r.rows.length).toBeGreaterThan(3)
    expect(r.rows[0].setor).toBe('Recepção')
    expect(r.rows[r.rows.length - 1].em_andamento).toBe(true)
    expect(r.rows.slice(0, -1).every(s => s.em_andamento === false)).toBe(true)
  })
  it('evasão exige motivo e gera evento final de saída', async () => {
    await expect(db.query(`select bi_registrar_evasao('${tri}',' ')`)).rejects.toThrow(/motivo/)
    await db.query(`select bi_registrar_evasao('${tri}','Paciente saiu sem ser atendido')`)
    const r = await db.query<{ n: number }>(`select count(*)::int n from bi_jornada_eventos where tipo_evento='saida_evasao' and hospital_episode_id='${tri}'`)
    expect(r.rows[0].n).toBe(1)
  })
  it('RLS impede leitura cruzada entre empresas e gravação direta', async () => {
    await db.exec(`insert into bi_jornada_eventos(company_id,tipo_evento) values('${other}','chegada');SET ROLE authenticated`)
    const r = await db.query<{ company_id: string }>('select distinct company_id from bi_jornada_eventos')
    expect(r.rows.map(x => x.company_id)).toEqual([cid])
    await expect(db.query(`insert into bi_jornada_eventos(company_id,tipo_evento) values('${cid}','chegada')`)).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE')
  })
  it('módulo desligado bloqueia leitura mesmo com permissão no perfil', async () => {
    await db.exec("SET test.super='true'")
    await db.query('select bi_hospitalar_liberar($1,false)', [cid])
    await db.exec("SET test.super='false';SET test.admin='false';SET ROLE authenticated")
    expect((await db.query<{ n: number }>('select count(*)::int n from bi_jornada_eventos')).rows[0].n).toBe(0)
    await db.exec("RESET ROLE;SET test.admin='true';SET test.super='true'")
    await db.query('select bi_hospitalar_liberar($1,true)', [cid])
    await db.exec("SET test.super='false'")
  })
  it('auditoria registra acesso à tela', async () => {
    await db.query(`select bi_registrar_acesso('abrir_tela')`)
    const r = await db.query<{ n: number }>(`select count(*)::int n from bi_acesso_log where company_id='${cid}' and acao='abrir_tela'`)
    expect(r.rows[0].n).toBe(1)
  })
})
