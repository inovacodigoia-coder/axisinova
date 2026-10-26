import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'
let db: PGlite
const C='00000000-0000-4000-8000-000000000001', C2='00000000-0000-4000-8000-000000000002', U='00000000-0000-4000-8000-000000000011', U2='00000000-0000-4000-8000-000000000012', P='00000000-0000-4000-8000-000000000021'
const rows=async(sql:string)=>(await db.query<Record<string,any>>(sql)).rows
const one=async(sql:string)=>(await rows(sql))[0]
beforeEach(async()=>{
 db=new PGlite()
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.super',true),'false')::boolean $$;
 CREATE TABLE companies(id uuid PRIMARY KEY);
 CREATE TABLE profiles(id uuid PRIMARY KEY,company_id uuid,manager boolean);
 CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
 CREATE FUNCTION is_company_manager(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT manager FROM profiles WHERE id=u $$;
 CREATE TABLE sector_users(user_id uuid,sector_id text);
 CREATE TABLE company_sectors(id text,company_id uuid,is_active boolean,allowed_profile_ids text[]);
 CREATE TABLE access_profiles(id text,company_id uuid,is_active boolean,permissions jsonb);
 CREATE TABLE patients(id uuid PRIMARY KEY,company_id uuid);
 CREATE TABLE doctors(id uuid PRIMARY KEY,company_id uuid);
 CREATE TABLE apoio_auditoria(company_id uuid,tabela text,registro_id text,acao text,antes jsonb,depois jsonb,usuario_id uuid,created_at timestamptz DEFAULT now());
 CREATE TABLE storage.objects(bucket_id text,name text);
 INSERT INTO companies VALUES('${C}'),('${C2}'); INSERT INTO profiles VALUES('${U}','${C}',true),('${U2}','${C2}',true); INSERT INTO patients VALUES('${P}','${C}'); SET test.uid='${U}';`)
 await db.exec(readFileSync('drizzle/migrations/0112_financeiro_etapa1_base.sql','utf8'))
 await db.exec(readFileSync('drizzle/migrations/0113_financeiro_lgpd_guarda_fiscal.sql','utf8'))
 await db.exec(readFileSync('drizzle/migrations/0114_financeiro_validacao_parametros.sql','utf8'))
 await db.exec(`UPDATE companies SET financeiro_habilitado=true WHERE id='${C}'; SELECT financeiro__padroes('${C}');`)
})
afterEach(async()=>{await db.close()})
async function setup(tipo='receita',value='100',n=1,mode='unico') {
 const {id:account}=await one(`SELECT financeiro_configurar('conta','{"nome":"Banco","tipo":"banco","saldo_inicial":100,"data_inicial":"2020-01-01"}') AS id`)
 const {id:cat}=await one(`SELECT id FROM financeiro_categorias WHERE tipo='${tipo}' LIMIT 1`)
 const data={descricao:'Teste',tipo,valor:value,conta_id:account,categoria_id:cat,competencia:'2026-01-31',vencimento:'2026-01-31',paciente_id:P}
 const {ids}=await one(`SELECT financeiro_lancar('${JSON.stringify(data)}',${n},'${mode}') AS ids`)
 return {account,ids,data}
}
async function baixa(id:string,account:string,value:number) { return (await one(`SELECT financeiro_baixar('${id}','{"valor":${value},"conta_id":"${account}","data":"2026-01-31","forma":"pix"}') AS id`)).id }
it('existentes desligadas e novas ligadas com 13 categorias',async()=>{
 expect((await one(`SELECT financeiro_habilitado FROM companies WHERE id='${C2}'`)).financeiro_habilitado).toBe(false)
 await db.exec(`INSERT INTO companies VALUES('00000000-0000-4000-8000-000000000099')`)
 expect((await one(`SELECT financeiro_habilitado FROM companies WHERE id='00000000-0000-4000-8000-000000000099'`)).financeiro_habilitado).toBe(true)
 expect((await rows(`SELECT * FROM financeiro_categorias WHERE company_id='00000000-0000-4000-8000-000000000099'`))).toHaveLength(13)
})
it('parcelamento 3x preserva centavos e meses',async()=>{const {ids}=await setup('receita','100',3,'parcelado'); const l=await rows(`SELECT valor,vencimento::text FROM financeiro_lancamentos ORDER BY parcela`);expect(ids).toHaveLength(3);expect(l.map(x=>Number(x.valor))).toEqual([33.34,33.33,33.33]);expect(l.map(x=>x.vencimento)).toEqual(['2026-01-31','2026-02-28','2026-03-31'])})
it('recorrência mensal até 12 e recusa 13',async()=>{const {data}=await setup('despesa','50',12,'recorrente');expect(await rows('SELECT * FROM financeiro_lancamentos')).toHaveLength(12);await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify(data)}',13,'recorrente')`)).rejects.toThrow('12 meses')})
it('baixa parcial e total; excesso recusado; saldo correto',async()=>{const {ids,account}=await setup();await baixa(ids[0],account,40);expect((await one(`SELECT status FROM financeiro_lancamentos`)).status).toBe('parcial');expect(Number((await one(`SELECT saldo FROM financeiro_saldos('2026-12-31')`)).saldo)).toBe(140);await expect(baixa(ids[0],account,61)).rejects.toThrow('excede');await baixa(ids[0],account,60);expect((await one('SELECT status FROM financeiro_lancamentos')).status).toBe('pago');expect(Number((await one(`SELECT saldo FROM financeiro_saldos('2026-12-31')`)).saldo)).toBe(200)})
it('despesa reduz saldo e juros/multa/desconto compõem caixa',async()=>{const {ids,account}=await setup('despesa','50');await db.exec(`SELECT financeiro_baixar('${ids[0]}','{"valor":50,"juros":5,"multa":2,"desconto":3,"conta_id":"${account}","data":"2026-01-31","forma":"pix"}')`);expect(Number((await one(`SELECT saldo FROM financeiro_saldos('2026-12-31')`)).saldo)).toBe(46)})
it('estorno exige motivo, preserva baixa, reabre e audita',async()=>{const {ids,account}=await setup();const b=await baixa(ids[0],account,100);await expect(db.exec(`SELECT financeiro_estornar('${b}',' ')`)).rejects.toThrow('Motivo');await db.exec(`SELECT financeiro_estornar('${b}','Correção')`);expect((await one('SELECT status FROM financeiro_lancamentos')).status).toBe('aberto');expect((await one('SELECT estorno_motivo FROM financeiro_baixas')).estorno_motivo).toBe('Correção');expect((await one(`SELECT usuario_id FROM apoio_auditoria WHERE acao='estorno'`)).usuario_id).toBe(U);expect(Number((await one(`SELECT saldo FROM financeiro_saldos('2026-12-31')`)).saldo)).toBe(100)})
it('cancelamento exige motivo e estorno prévio; preserva lançamento',async()=>{const {ids,account}=await setup();await expect(db.exec(`SELECT financeiro_cancelar('${ids[0]}','')`)).rejects.toThrow('Motivo');const b=await baixa(ids[0],account,20);await expect(db.exec(`SELECT financeiro_cancelar('${ids[0]}','Erro')`)).rejects.toThrow('Estorne');await db.exec(`SELECT financeiro_estornar('${b}','Erro'); SELECT financeiro_cancelar('${ids[0]}','Duplicado')`);expect((await one('SELECT status,cancelado_motivo FROM financeiro_lancamentos'))).toEqual({status:'cancelado',cancelado_motivo:'Duplicado'});expect(await rows(`SELECT * FROM apoio_auditoria WHERE acao='cancelamento'`)).toHaveLength(1)})
it('lançamento pago não aceita edição de valor nem após estorno',async()=>{const {ids,account,data}=await setup();const b=await baixa(ids[0],account,100);await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify({...data,valor:500})}',1,'unico','${ids[0]}')`)).rejects.toThrow('não pode');await db.exec(`SELECT financeiro_estornar('${b}','Correção')`);await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify(data)}',1,'unico','${ids[0]}')`)).rejects.toThrow('não pode')})
it('LGPD remove vínculo/nome e preserva valores e baixas',async()=>{const {ids,account}=await setup();await db.exec(`UPDATE financeiro_lancamentos SET pagador='Pessoa Teste'`);await baixa(ids[0],account,25);await db.exec(`SELECT financeiro_lgpd_desvincular('${P}')`);const l=await one('SELECT paciente_id,pagador,valor FROM financeiro_lancamentos');expect(l.paciente_id).toBeNull();expect(l.pagador).toBeNull();expect(Number(l.valor)).toBe(100);expect(await rows('SELECT * FROM financeiro_baixas')).toHaveLength(1)})
it('módulo desligado bloqueia leitura e escrita',async()=>{await db.exec(`UPDATE companies SET financeiro_habilitado=false WHERE id='${C}'`);expect((await one('SELECT financeiro_meu_acesso() AS a')).a.ver).toBe(false);await expect(setup()).rejects.toThrow('Sem permissão');expect(await rows(`SELECT * FROM financeiro_saldos()`)).toHaveLength(0)})
it('perfil concede só ver; sem perfil não tem acesso',async()=>{await db.exec(`UPDATE profiles SET manager=false WHERE id='${U}'`);expect((await one(`SELECT financeiro_tem_permissao('ver') AS p`)).p).toBe(false);await db.exec(`INSERT INTO sector_users VALUES('${U}','FIN');INSERT INTO company_sectors VALUES('FIN','${C}',true,ARRAY['AP']);INSERT INTO access_profiles VALUES('AP','${C}',true,'{"financeiro":["financeiro.ver"]}')`);expect((await one(`SELECT financeiro_tem_permissao('ver') AS p`)).p).toBe(true);expect((await one(`SELECT financeiro_tem_permissao('baixar') AS p`)).p).toBe(false);await expect(setup()).rejects.toThrow('Sem permissão')})
it('outra empresa não acessa registros por RLS nem RPC e storage',async()=>{const {ids}=await setup();await db.exec(`UPDATE companies SET financeiro_habilitado=true WHERE id='${C2}';SET test.uid='${U2}';GRANT USAGE ON SCHEMA public,auth,storage TO authenticated;GRANT SELECT ON profiles,companies TO authenticated;SET ROLE authenticated`);expect(await rows('SELECT * FROM financeiro_lancamentos')).toHaveLength(0);await expect(db.exec(`SELECT financeiro_cancelar('${ids[0]}','Intrusão')`)).rejects.toThrow('indisponível');await db.exec(`RESET ROLE; INSERT INTO storage.objects VALUES('financeiro-comprovantes','${C}/teste.pdf'); GRANT SELECT ON storage.objects TO authenticated; ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;SET ROLE authenticated`);expect(await rows('SELECT * FROM storage.objects')).toHaveLength(0)})
it('anon sem tabela/EXECUTE e autenticado sem escrita direta',async()=>{expect((await one(`SELECT has_table_privilege('anon','financeiro_lancamentos','SELECT') AS a,has_table_privilege('authenticated','financeiro_lancamentos','INSERT') AS b,has_function_privilege('anon','financeiro_baixar(uuid,jsonb)','EXECUTE') AS c,has_function_privilege('authenticated','financeiro__padroes(uuid)','EXECUTE') AS d`))).toEqual({a:false,b:false,c:false,d:false});await db.exec('SET ROLE anon');await expect(db.exec(`SELECT financeiro_meu_acesso()`)).rejects.toThrow('permission denied')})
it('subcategorias máximo 2 níveis e empresa protegida',async()=>{const {data}=await setup();const {id}=await one(`SELECT financeiro_configurar('categoria','{"nome":"Sub","tipo":"receita","pai_id":"${data.categoria_id}"}') AS id`);await expect(db.exec(`SELECT financeiro_configurar('categoria','{"nome":"Subsub","tipo":"receita","pai_id":"${id}"}')`)).rejects.toThrow('dois níveis')})
it('valores positivos e moeda BRL no servidor',async()=>{const {data}=await setup();await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify({...data,valor:0})}')`)).rejects.toThrow('inválidos');await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify({...data,moeda:'USD'})}')`)).rejects.toThrow('inválidos')})
it('parâmetros nulos não geram lançamentos',async()=>{const {data}=await setup();await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify(data)}',NULL,'recorrente')`)).rejects.toThrow('Quantidade');await expect(db.exec(`SELECT financeiro_lancar('${JSON.stringify(data)}',1,NULL)`)).rejects.toThrow('Quantidade');expect(await rows('SELECT * FROM financeiro_lancamentos')).toHaveLength(1)})
it('exclusão explícita do paciente limpa nome sem perder valores',async()=>{await setup();await db.exec(`UPDATE financeiro_lancamentos SET pagador='Pessoa Teste';DELETE FROM patients WHERE id='${P}'`);const l=await one('SELECT paciente_id,pagador,valor FROM financeiro_lancamentos');expect(l.paciente_id).toBeNull();expect(l.pagador).toBeNull();expect(Number(l.valor)).toBe(100)})
