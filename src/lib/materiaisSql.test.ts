import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
const cid='7858af33-878e-40c4-9305-e912cc6655c3',uid='00000000-0000-0000-0000-000000000099',occ='00000000-0000-0000-0000-000000000010',bed='00000000-0000-0000-0000-000000000011',ep='00000000-0000-0000-0000-000000000012',pid='00000000-0000-0000-0000-000000000013'
describe('Materiais por paciente — regras transacionais',()=>{
  let db:PGlite
  beforeAll(async()=>{
    db=new PGlite()
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
      CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
      CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='true'$$;
      CREATE TABLE companies(id uuid PRIMARY KEY,financeiro_habilitado boolean);
      CREATE TABLE company_sectors(id text PRIMARY KEY,company_id uuid,name text,is_active boolean,allowed_profile_ids text[],module_overrides jsonb);
      CREATE TABLE sector_users(user_id uuid,company_id uuid,sector_id text);
      CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);
      CREATE TABLE farmacia_medicamentos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,codigo int,nome text,principio_ativo text,apresentacao text,forma text,unidade text,ativo boolean DEFAULT true,created_by uuid);
      CREATE TABLE triage_entries(id uuid PRIMARY KEY,company_id uuid,patient_id uuid,patient_name text,order_id uuid,hospital_episode_id uuid,status text,created_at timestamptz DEFAULT now());
      CREATE TABLE bed_occupancies(id uuid PRIMARY KEY,company_id uuid,patient_id uuid,patient_name text,bed_id uuid,status text,away boolean DEFAULT false,triage_entry_id uuid,hospital_episode_id uuid);
      CREATE TABLE beds(id uuid PRIMARY KEY,company_id uuid,current_occupancy_id uuid,status text);
      CREATE TABLE admission_requests(id uuid PRIMARY KEY,company_id uuid,patient_id uuid,patient_name text,hospital_episode_id uuid,status text);
      CREATE TABLE inpatient_beds(id uuid PRIMARY KEY,company_id uuid,current_request_id uuid,status text);
      CREATE TABLE appointments(id uuid PRIMARY KEY,company_id uuid,patient_id uuid,sched_status text);
      CREATE TABLE bi_consumo_itens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,hospital_episode_id uuid,patient_id uuid,attendance_order_id uuid,tipo text,item_codigo text,item_nome text,quantidade numeric,administrado_em timestamptz,valor_unitario numeric,sem_valor_cadastrado boolean,origem_tabela text,origem_id uuid,detalhes jsonb,created_at timestamptz DEFAULT now());
      CREATE TABLE bi_jornada_eventos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,hospital_episode_id uuid,patient_id uuid,attendance_order_id uuid,tipo_evento text,fase text,setor text,usuario_id uuid,origem_tabela text,origem_id uuid,detalhes jsonb,ajuste_de uuid,justificativa text,ocorrido_em timestamptz DEFAULT now());
      SET test.uid='${uid}';SET test.admin='true';`)
    await db.exec(readFileSync('drizzle/migrations/0134_almoxarifado_solicitacoes_setores.sql','utf8'))
    await db.exec(readFileSync('drizzle/migrations/0135_almoxarifado_company_enablement.sql','utf8'))
    await db.exec(readFileSync('drizzle/migrations/0136_materiais_consumo_paciente.sql','utf8'))
    await db.exec(`INSERT INTO companies VALUES('${cid}',false,true);
      INSERT INTO company_sectors(id,company_id,name,is_active,allowed_profile_ids) VALUES('triagem','${cid}','Triagem',true,'{}'),('outro','00000000-0000-0000-0000-000000000002','Outra empresa',true,'{}');
      INSERT INTO triage_entries(id,company_id,patient_id,patient_name,hospital_episode_id,status) VALUES('${ep}','${cid}','${pid}','Paciente teste','${ep}','in_doctor');
      INSERT INTO bed_occupancies(id,company_id,patient_id,patient_name,bed_id,status,triage_entry_id,hospital_episode_id) VALUES('${occ}','${cid}','${pid}','Paciente teste','${bed}','active','${ep}','${ep}');
      INSERT INTO beds VALUES('${bed}','${cid}','${occ}','occupied');`)
  },30000)
  afterAll(async()=>{await db.close()})
  const create=async(cost:number|null=2,frac=false)=>{
    const item=(await db.query<{id:string}>("select almox_item_criar('Material teste','material','unidade',100) id")).rows[0].id
    await db.query('select almox_material_configurar($1,$2,$3)',[item,cost,frac])
    await db.query("insert into almox_saldos(company_id,item_id,local,setor_id,quantidade) values($1,$2,'setor:triagem','triagem',10)",[cid,item])
    return item
  }
  const use=async(item:string,q=2,key=crypto.randomUUID())=>(await db.query<{id:string}>("select materiais_registrar('post',$1,'triagem',$2,$3,'',$4) id",[occ,item,q,key])).rows[0].id
  it('desconta 2 de 10 e congela custo 2 × 2 com ator da sessão',async()=>{
    const item=await create(),id=await use(item)
    expect((await db.query<{q:string}>("select quantidade q from almox_saldos where item_id=$1 and local='setor:triagem'",[item])).rows[0].q).toBe('8')
    expect((await db.query('select valor_unitario::text custo,detalhes->>\'valor_total\' total,detalhes->>\'responsavel\' ator from bi_consumo_itens where id=$1',[id])).rows[0]).toEqual({custo:'2.0000',total:'4.0000',ator:uid})
    expect((await db.query<{n:number}>("select count(*)::int n from bi_jornada_eventos where origem_id=$1 and tipo_evento='material_usado'",[id])).rows[0].n).toBe(1)
  })
  it('alterar custo para 9 não modifica consumo anterior e gera histórico',async()=>{
    const item=await create(),id=await use(item)
    await db.query('select almox_material_configurar($1,9,false)',[item])
    expect((await db.query<{v:string}>('select valor_unitario::text v from bi_consumo_itens where id=$1',[id])).rows[0].v).toBe('2.0000')
    expect((await db.query<{n:number}>('select count(*)::int n from almox_custo_historico where item_id=$1',[item])).rows[0].n).toBe(2)
  })
  it('sem custo grava NULL e sem_valor_cadastrado',async()=>{
    const id=await use(await create(null))
    expect((await db.query('select valor_unitario,sem_valor_cadastrado from bi_consumo_itens where id=$1',[id])).rows[0]).toEqual({valor_unitario:null,sem_valor_cadastrado:true})
  })
  it('saldo insuficiente e quantidade zero não descontam',async()=>{
    const item=await create()
    await expect(use(item,11)).rejects.toThrow('Saldo insuficiente')
    await expect(use(item,0)).rejects.toThrow('Quantidade')
    expect((await db.query<{q:string}>("select quantidade q from almox_saldos where item_id=$1 and local='setor:triagem'",[item])).rows[0].q).toBe('10')
  })
  it('fração bloqueada por padrão; habilitar permite 0,5',async()=>{
    const item=await create()
    await expect(use(item,.5)).rejects.toThrow('inteira')
    await db.query('select almox_material_configurar($1,2,true)',[item])
    await use(item,.5)
    expect((await db.query<{q:string}>("select quantidade q from almox_saldos where item_id=$1 and local='setor:triagem'",[item])).rows[0].q).toBe('9.5')
  })
  it('estorno exige motivo, devolve saldo e gera quantidade/valor negativos',async()=>{
    const item=await create(),id=await use(item)
    await expect(db.query("select materiais_estornar($1,'',$2)",[id,crypto.randomUUID()])).rejects.toThrow('justificativa')
    const undo=(await db.query<{id:string}>("select materiais_estornar($1,'Correção teste',$2) id",[id,crypto.randomUUID()])).rows[0].id
    expect((await db.query<{q:string}>("select quantidade q from almox_saldos where item_id=$1 and local='setor:triagem'",[item])).rows[0].q).toBe('10')
    expect((await db.query('select quantidade::text q,detalhes->>\'valor_total\' total from bi_consumo_itens where id=$1',[undo])).rows[0]).toEqual({q:'-2',total:'-4.0000'})
    await expect(db.query("select materiais_estornar($1,'Novamente',$2)",[id,crypto.randomUUID()])).rejects.toThrow('já estornado')
  })
  it('mesma chave não duplica e payload diferente é rejeitado',async()=>{
    const item=await create(),key=crypto.randomUUID(),id=await use(item,2,key)
    expect(await use(item,2,key)).toBe(id)
    await expect(use(item,3,key)).rejects.toThrow('Chave')
  })
  it('perfil sem permissão e sessão ausente não registram',async()=>{
    const item=await create()
    await db.exec("SET test.admin='false'")
    await expect(use(item)).rejects.toThrow('Sem permissão')
    await db.exec("SET test.admin='true';SET test.uid=''")
    await expect(use(item)).rejects.toThrow('Sem permissão')
    await db.exec(`SET test.uid='${uid}'`)
  })
  it('outro setor de empresa diferente não pode receber consumo',async()=>{
    const item=await create()
    await expect(db.query("select materiais_registrar('post',$1,'outro',$2,1,'',$3)",[occ,item,crypto.randomUUID()])).rejects.toThrow('Sem acesso')
  })
  it('atendimento encerrado não permite novo uso',async()=>{
    const item=await create()
    await db.exec("update bed_occupancies set status='released'")
    await expect(use(item)).rejects.toThrow('ativo')
    await db.exec("update bed_occupancies set status='active'")
  })
})