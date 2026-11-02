import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const cid='00000000-0000-0000-0000-000000000001', other='00000000-0000-0000-0000-000000000002', uid='00000000-0000-0000-0000-000000000099', tri='00000000-0000-0000-0000-000000000010', occ='00000000-0000-0000-0000-000000000011', adm='00000000-0000-0000-0000-000000000012', bed='00000000-0000-0000-0000-000000000020', sector='00000000-0000-0000-0000-000000000030'
describe('identificação hospitalar: segurança, limite e vínculo',()=>{
  let db:PGlite, companion:string
  beforeAll(async()=>{
    db=new PGlite()
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT 'authenticated'$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
      CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='true'$$;
      CREATE TABLE companies(id uuid primary key);CREATE TABLE lab_settings(id uuid DEFAULT gen_random_uuid(),company_id uuid);
      CREATE TABLE patients(id uuid,company_id uuid,name text,birth_date date,gender text);
      CREATE TABLE triage_entries(id uuid primary key,company_id uuid,patient_id uuid,patient_name text,patient_birth_date date,color text,created_at timestamptz DEFAULT now(),wristband_printed_at timestamptz);
      CREATE TABLE bed_occupancies(id uuid primary key,company_id uuid,triage_entry_id uuid,patient_id uuid,patient_name text,bed_id uuid,status text,allocated_at timestamptz DEFAULT now());
      CREATE TABLE admission_requests(id uuid primary key,company_id uuid,patient_id uuid,patient_name text,origin_occupancy_id uuid,origin_inpatient_bed_id uuid,bed_id uuid,requested_at timestamptz DEFAULT now(),admitted_at timestamptz);
      CREATE TABLE inpatient_beds(id uuid,company_id uuid,name text,unit_id uuid,current_request_id uuid,status text);
      CREATE TABLE inpatient_units(id uuid,company_id uuid,name text);CREATE TABLE beds(id uuid,company_id uuid,name text,post_id uuid);
      CREATE TABLE collection_posts(id uuid,company_id uuid,name text);
      CREATE TABLE sector_users(user_id uuid,sector_id text);CREATE TABLE company_sectors(id text,company_id uuid,name text,is_active boolean,allowed_profile_ids text[]);
      CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);
      CREATE TABLE triage_wristband_prints(company_id uuid,entry_id uuid,is_reprint boolean,reason text,printed_by uuid);
      INSERT INTO companies VALUES('${cid}'),('${other}'); SET test.uid='${uid}'; SET test.admin='true';`)
    await db.exec(readFileSync('drizzle/migrations/0124_hospital_identificacao_acompanhantes.sql','utf8'))
    await db.exec(readFileSync('drizzle/migrations/0125_hospital_etiquetas_configuracao_guardas.sql','utf8'))
    await db.exec(readFileSync('drizzle/migrations/0126_hospital_local_texto.sql','utf8'))
    await db.exec(`INSERT INTO company_sectors VALUES('${sector}','${cid}','Pronto Atendimento Adulto',true,ARRAY['p']);
      INSERT INTO triage_entries(id,company_id,patient_name,color) VALUES('${tri}','${cid}','Paciente Teste','yellow'),('00000000-0000-0000-0000-000000000013','${other}','Outro','blue');
      INSERT INTO bed_occupancies(id,company_id,triage_entry_id,patient_name,bed_id,status) VALUES('${occ}','${cid}','${tri}','Paciente Teste','${bed}','active');
      INSERT INTO admission_requests(id,company_id,origin_occupancy_id,patient_name) VALUES('${adm}','${cid}','${occ}','Paciente Teste');`)
  },30000)
  afterAll(async()=>{await db.close()})
  const add=(name:string)=>db.query<{id:string}>('select hospital_acompanhante_adicionar($1,$2,$3) id',['triage',tri,name])
  const ctx=(context='triage',id=tri)=>db.query<{ctx:any}>('select hospital_identificacao_contexto($1,$2) ctx',[context,id])
  const prepare=()=>db.query<{job:any}>('select hospital_identificacao_preparar($1,$2,$3,$4) job',['triage',tri,'etiqueta_acompanhante',companion])
  it('limite padrão é 1',async()=>expect((await db.query('select max_acompanhantes from companies where id=$1',[cid])).rows).toEqual([{max_acompanhantes:1}]))
  it('mínimo é 1',async()=>await expect(db.query('update companies set max_acompanhantes=0 where id=$1',[cid])).rejects.toThrow(/check constraint/))
  it('nome é obrigatório',async()=>await expect(add(' ')).rejects.toThrow(/nome/))
  it('mesmo acompanhante é reutilizado sem duplicar',async()=>{companion=(await add('Maria Teste')).rows[0].id;expect((await add(' maria teste ')).rows[0].id).toBe(companion)})
  it('novo cadastro bloqueado no limite 1',async()=>await expect(add('Outro Teste')).rejects.toThrow(/Limite/))
  it('triagem posto e internação compartilham o mesmo cadastro',async()=>{for(const [context,id] of [['triage',tri],['post',occ],['admission',adm]]){const data=(await ctx(context,id)).rows[0].ctx;expect(data.episodeId).toBe(tri);expect(data.companions).toHaveLength(1);expect(data.companions[0].id).toBe(companion)}})
  it('local sem leito vem do setor cadastrado',async()=>{await db.query('select hospital_identificacao_local($1,$2)',[tri,sector]);expect((await ctx()).rows[0].ctx.bed).toBe('Pronto Atendimento Adulto')})
  it('local aceita identificador textual real sem exigir UUID',async()=>{await db.exec(`INSERT INTO company_sectors VALUES('setor-pronto-atendimento','${cid}','Recepção Hospitalar',true,ARRAY['p'])`);await db.query('select hospital_identificacao_local_definir($1,$2)',[tri,'setor-pronto-atendimento']);expect((await ctx()).rows[0].ctx.bed).toBe('Recepção Hospitalar')})
  it('local textual de outra empresa permanece bloqueado',async()=>{await db.exec(`INSERT INTO company_sectors VALUES('setor-outra-empresa','${other}','Privado',true,ARRAY['p'])`);await expect(db.query('select hospital_identificacao_local_definir($1,$2)',[tri,'setor-outra-empresa'])).rejects.toThrow('Local inválido')})
  it('leito atual na internação supera origem da triagem',async()=>{await db.exec(`insert into inpatient_units values('${sector}','${cid}','Clínica Médica');insert into inpatient_beds values('${bed}','${cid}','Leito 01','${sector}','${adm}','occupied')`);const d=(await ctx()).rows[0].ctx;expect(d.bed).toBe('Leito 01');expect(d.sector).toBe('Clínica Médica')})
  it('reimpressões ilimitadas registradas após confirmação',async()=>{for(let i=0;i<3;i++){const job=(await prepare()).rows[0].job;expect(job.isReprint).toBe(i>0);await db.query('select hospital_identificacao_finalizar($1,$2)',[job.printId,'confirmado'])}expect((await db.query('select count(*)::int n from hospital_identificacao_prints where status=$1',['confirmado'])).rows).toEqual([{n:3}])})
  it('limite maior permite apenas quantidade configurada',async()=>{await db.query('update companies set max_acompanhantes=2 where id=$1',[cid]);await add('José Teste');await expect(add('Terceiro Teste')).rejects.toThrow(/Limite/)})
  it('sem login não cadastra ou imprime',async()=>{await db.exec("SET test.uid=''");await expect(add('Bloqueado')).rejects.toThrow(/permissão/);await expect(ctx()).rejects.toThrow(/permissão/);await db.exec(`SET test.uid='${uid}'`)})
  it('sem permissão não cadastra ou imprime',async()=>{await db.exec("SET test.admin='false'");await expect(add('Bloqueado')).rejects.toThrow(/permissão/);await expect(ctx()).rejects.toThrow(/permissão/);await db.exec("SET test.admin='true'")})
  it('permissão reception export não concede cadastro sem create/edit',async()=>{await db.exec(`SET test.admin='false';INSERT INTO sector_users VALUES('${uid}','${sector}');INSERT INTO access_profiles VALUES('p','${cid}',true,'{"reception":["export"]}');`);expect((await ctx()).rows[0].ctx.canRegister).toBe(false);await expect(add('Bloqueado')).rejects.toThrow(/permissão/);await db.exec("SET test.admin='true'")})
  it('atendimento de outra empresa não pode ser consultado',async()=>await expect(ctx('triage','00000000-0000-0000-0000-000000000013')).rejects.toThrow(/indisponível/))
  it('RLS isola empresas e bloqueia gravação direta',async()=>{await db.exec(`insert into hospital_acompanhantes(company_id,episode_id,nome,created_by) values('${other}','${tri}','Privado','${uid}');SET ROLE authenticated`);expect((await db.query('select nome from hospital_acompanhantes')).rows.map((r:any)=>r.nome)).not.toContain('Privado');await expect(db.query(`insert into hospital_acompanhantes(company_id,episode_id,nome,created_by) values('${cid}','${tri}','Direto','${uid}')`)).rejects.toThrow(/permission denied/);await db.exec('RESET ROLE')})
  it('episódio imutável impede trocar vínculo',async()=>await expect(db.query('update triage_entries set hospital_episode_id=$1 where id=$2',[other,tri])).rejects.toThrow(/imutável/))
  it('sem permissão de configuração não muda limite',async()=>{await db.exec("SET test.admin='false'");await expect(db.query('update companies set max_acompanhantes=3 where id=$1',[cid])).rejects.toThrow(/administradores/);await db.exec("SET test.admin='true'")})
  it('configuração rejeita dimensões inválidas',async()=>await expect(db.query('select hospital_etiquetas_configurar($1)',[JSON.stringify({etiqueta_paciente:{widthMm:0,heightMm:40,marginMm:2,nomeSizePt:9,textoSizePt:8,nomeBold:true,textoBold:false,barcode:true}})])).rejects.toThrow(/inválidos/))
  it('requisições simultâneas não ultrapassam limite',async()=>{await db.query('update companies set max_acompanhantes=3 where id=$1',[cid]);const results=await Promise.allSettled([add('Concorrente A'),add('Concorrente B')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);expect((await ctx()).rows[0].ctx.companions).toHaveLength(3)})
  it('transferência de internação conserva episódio e acompanhantes',async()=>{const id='00000000-0000-0000-0000-000000000050';await db.query('insert into admission_requests(id,company_id,origin_inpatient_bed_id,patient_name) values($1,$2,$3,$4)',[id,cid,bed,'Paciente Teste']);const d=(await ctx('admission',id)).rows[0].ctx;expect(d.episodeId).toBe(tri);expect(d.companions).toHaveLength(3)})
  it('log de falha não é tratado como impressão confirmada',async()=>{const job=(await db.query<{job:any}>('select hospital_identificacao_preparar($1,$2,$3) job',['triage',tri,'etiqueta_paciente'])).rows[0].job;await db.query('select hospital_identificacao_finalizar($1,$2)',[job.printId,'falha']);expect((await db.query<{job:any}>('select hospital_identificacao_preparar($1,$2,$3) job',['triage',tri,'etiqueta_paciente'])).rows[0].job.isReprint).toBe(false)})
})