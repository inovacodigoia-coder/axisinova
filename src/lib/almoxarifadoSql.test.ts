import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const cid = '00000000-0000-0000-0000-000000000001', other = '00000000-0000-0000-0000-000000000002', uid = '00000000-0000-0000-0000-000000000099'
describe('Almoxarifado — transferências seguras', () => {
  let db: PGlite
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
    CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='true'$$;
    CREATE TABLE company_sectors(id text PRIMARY KEY,company_id uuid,name text,is_active boolean,allowed_profile_ids text[]);
    CREATE TABLE sector_users(user_id uuid,company_id uuid,sector_id text);
    CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);
    CREATE TABLE farmacia_medicamentos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,codigo int,nome text,principio_ativo text,apresentacao text,forma text,unidade text,ativo boolean DEFAULT true,created_by uuid);
    INSERT INTO company_sectors VALUES('triagem','${cid}','Triagem',true,'{}'),('farmacia','${cid}','Farmácia',true,'{}'),('outra','${other}','Outra',true,'{}');
    SET test.uid='${uid}'; SET test.admin='true';`)
    await db.exec(readFileSync('drizzle/migrations/0134_almoxarifado_solicitacoes_setores.sql','utf8'))
  },30000)
  afterAll(async () => { await db.close() })
  const create = async (category='material') => (await db.query<{id:string}>(`select almox_item_criar('Teste',$1,'unidade',10) id`,[category])).rows[0].id
  const request = async (id:string,q=3,sector='triagem',destination='setor') => (await db.query<{id:string}>('select almox_solicitar($1,$2,$3) id',[sector,destination,JSON.stringify([{item_id:id,quantidade:q}])])).rows[0].id
  it('aprovação reduz 10 para 7 e transfere 3 ao setor; segunda decisão bloqueada',async()=>{
    const item=await create(), r=await request(item)
    await db.query('select almox_decidir($1,true)',[r])
    const b=await db.query<{local:string;quantidade:string}>('select local,quantidade from almox_saldos where item_id=$1 order by local',[item])
    expect(b.rows.map(x=>[x.local,Number(x.quantidade)])).toEqual([['almoxarifado',7],['setor:triagem',3]])
    await expect(db.query('select almox_decidir($1,true)',[r])).rejects.toThrow('não pendente')
  })
  it('recusa requer motivo e mantém saldo sem transferência',async()=>{
    const item=await create(), r=await request(item)
    await expect(db.query('select almox_decidir($1,false)',[r])).rejects.toThrow('motivo')
    await db.query("select almox_decidir($1,false,'Duplicado')",[r])
    expect((await db.query<{q:string}>('select quantidade q from almox_saldos where item_id=$1',[item])).rows).toEqual([{q:'10'}])
  })
  it('saldo insuficiente mantém pedido pendente e saldo intacto',async()=>{
    const item=await create(), r=await request(item,11)
    await expect(db.query('select almox_decidir($1,true)',[r])).rejects.toThrow('Saldo insuficiente')
    expect((await db.query<{status:string}>('select status from almox_solicitacoes where id=$1',[r])).rows[0].status).toBe('pendente')
    expect((await db.query<{q:string}>('select quantidade q from almox_saldos where item_id=$1',[item])).rows[0].q).toBe('10')
  })
  it('medicamento aprovado é ligado ao cadastro da farmácia e saldo',async()=>{
    const item=await create('medicamento'), r=await request(item,4,'farmacia','farmacia')
    await db.query('select almox_decidir($1,true)',[r])
    const result=await db.query<{nome:string;q:string}>('select m.nome,b.quantidade q from almox_itens i join farmacia_medicamentos m on m.id=i.medicamento_id join almox_saldos b on b.item_id=i.id and b.local=\'farmacia\' where i.id=$1',[item])
    expect(result.rows).toEqual([{nome:'Teste',q:'4'}])
  })
  it('outro setor/empresa e usuário sem permissão não aprovam',async()=>{
    const item=await create()
    await expect(request(item,1,'outra')).rejects.toThrow('Sem acesso')
    const r=await request(item)
    await db.exec("SET test.admin='false'")
    await expect(db.query('select almox_decidir($1,true)',[r])).rejects.toThrow('Sem permissão')
    await db.exec("SET test.admin='true'")
  })
  it('movimentos imutáveis e tabela inacessível para escrita direta',async()=>{
    const item=await create()
    await expect(db.query('update almox_movimentos set quantidade=1 where item_id=$1',[item])).rejects.toThrow('imutável')
    expect((await db.query<{ok:boolean}>("select has_table_privilege('authenticated','almox_saldos','UPDATE') ok")).rows[0].ok).toBe(false)
  })
  it('um usuário vinculado pode solicitar sem permissão de almoxarifado',async()=>{
    const item=await create()
    await db.exec(`INSERT INTO sector_users VALUES('${uid}','${cid}','triagem'); SET test.admin='false'`)
    const id=await request(item,1)
    expect((await db.query<{s:string}>('select status s from almox_solicitacoes where id=$1',[id])).rows[0].s).toBe('pendente')
    await db.exec("SET test.admin='true'")
  })
  it('quantidade zero e itens duplicados não criam pedido',async()=>{
    const item=await create()
    await expect(request(item,0)).rejects.toThrow('Quantidade inválida')
    await expect(db.query("select almox_solicitar('triagem','setor',$1)",[JSON.stringify([{item_id:item,quantidade:1},{item_id:item,quantidade:1}])])).rejects.toThrow('unique')
  })
})