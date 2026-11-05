import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const cid='00000000-0000-0000-0000-000000000001', uid='00000000-0000-0000-0000-000000000099', order='00000000-0000-0000-0000-000000000010', result='00000000-0000-0000-0000-000000000011'
let db:PGlite
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
 CREATE FUNCTION atendimento_detalhes_tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.allowed',true)='yes'$$;
 CREATE TABLE profiles(id uuid,company_id uuid,full_name text);
 CREATE TABLE attendance_orders(id uuid,company_id uuid,order_number text,registered_by uuid,registered_by_name text,created_at timestamptz default now(),status text,authorization_password text,hash text,updated_at timestamptz);
 CREATE TABLE lab_exam_results(id uuid,company_id uuid,order_id uuid,exam_name text,typed_by uuid,typed_at timestamptz,released_by uuid,released_at timestamptz,status text);
 CREATE TABLE lab_result_values(id uuid,company_id uuid,result_id uuid,parameter_name text,value text);
 CREATE TABLE apoio_auditoria(id uuid default gen_random_uuid(),company_id uuid,tabela text,registro_id text,acao text,antes jsonb,depois jsonb,usuario_id uuid,created_at timestamptz default now());
 CREATE TABLE apoio_pedido_exame(id uuid,company_id uuid,pedido_id uuid);
 CREATE TABLE apoio_pedido_exame_historico(id uuid,company_id uuid,pedido_exame_id uuid,usuario_id uuid,created_at timestamptz,status_de text,status_para text,motivo text,origem text);
 CREATE TABLE lab_result_value_history(id uuid,company_id uuid,result_id uuid,created_at timestamptz,parameter_name text,value text,unit text,reason text,replaced_by text);
 CREATE TABLE document_print_logs(id uuid,company_id uuid,attendance_id uuid,printed_by uuid,printed_at timestamptz,template_name text,format text);
 INSERT INTO profiles VALUES('${uid}','${cid}','Operador Teste');
 INSERT INTO attendance_orders(id,company_id,order_number,registered_by,status) VALUES('${order}','${cid}','15-15','${uid}','open');
 INSERT INTO lab_exam_results(id,company_id,order_id,exam_name,status) VALUES('${result}','${cid}','${order}','Hemograma','draft');
 SET test.uid='${uid}'; SET test.allowed='yes';`)
 await db.exec(readFileSync('drizzle/migrations/0142_atendimento_auditoria.sql','utf8'))
},30000)
afterAll(async()=>{await db.close()})
it('registra usuário, horário e valores antes/depois',async()=>{
 await db.exec(`UPDATE attendance_orders SET status='collection_done' WHERE id='${order}'`)
 const r=await db.query<any>(`SELECT * FROM atendimento_auditoria_lista('${order}') WHERE acao='update'`)
 expect(r.rows[0].usuario_id).toBe(uid); expect(r.rows[0].usuario_nome).toBe('Operador Teste'); expect(r.rows[0].created_at).toBeTruthy()
 expect(r.rows[0].antes.campos.status).toBe('open'); expect(r.rows[0].depois.campos.status).toBe('collection_done')
})
it('vincula parâmetro ao UUID do pedido',async()=>{
 await db.exec(`INSERT INTO lab_result_values VALUES(gen_random_uuid(),'${cid}','${result}','Bastonetes absoluto','25')`)
 const r=await db.query<any>(`SELECT depois FROM atendimento_auditoria_lista('${order}') WHERE acao='insert'`)
 expect(r.rows[0].depois.campos.value).toBe('25')
})
it('não registra senha/hash nem mudança só de timestamp',async()=>{
 const n=(await db.query<any>('select count(*) n from apoio_auditoria')).rows[0].n
 await db.exec(`UPDATE attendance_orders SET authorization_password='segredo',hash='privado',updated_at=now() WHERE id='${order}'`)
 expect((await db.query<any>('select count(*) n from apoio_auditoria')).rows[0].n).toBe(n)
})
it('bloqueia sem permissão',async()=>{
 await db.exec(`SET test.allowed='no'`)
 await expect(db.query(`SELECT * FROM atendimento_auditoria_lista('${order}')`)).rejects.toThrow(/permissão/)
 await db.exec(`SET test.allowed='yes'`)
})
it('bloqueia sem login',async()=>{
 await db.exec(`SET test.uid=''`)
 await expect(db.query(`SELECT * FROM atendimento_auditoria_lista('${order}')`)).rejects.toThrow(/permissão/)
 await db.exec(`SET test.uid='${uid}'`)
})
it('bloqueia pedido de outra empresa',async()=>{
 await db.exec(`INSERT INTO attendance_orders(id,company_id,status) VALUES('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000002','open')`)
 await expect(db.query(`SELECT * FROM atendimento_auditoria_lista('00000000-0000-0000-0000-000000000020')`)).rejects.toThrow(/não encontrado/)
})
it('nega execução anônima',async()=>{
 expect((await db.query<any>(`SELECT has_function_privilege('anon','atendimento_auditoria_lista(uuid,integer,integer)','EXECUTE') allowed`)).rows[0].allowed).toBe(false)
})