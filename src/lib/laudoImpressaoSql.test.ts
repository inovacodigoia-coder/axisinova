import { beforeAll, afterAll, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const cid='00000000-0000-0000-0000-000000000001', outra='00000000-0000-0000-0000-000000000002', uid='00000000-0000-0000-0000-000000000099', order='00000000-0000-0000-0000-000000000010', orderOutra='00000000-0000-0000-0000-000000000020'
let db:PGlite
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
 CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$SELECT '${cid}'::uuid$$;
 CREATE FUNCTION atendimento_detalhes_tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.allowed',true)='yes'$$;
 CREATE TABLE companies(id uuid primary key);
 CREATE TABLE profiles(id uuid,company_id uuid,full_name text);
 CREATE TABLE attendance_orders(id uuid primary key,company_id uuid,order_number text);
 CREATE TABLE document_print_logs(id uuid,company_id uuid,attendance_id uuid,printed_by uuid,printed_at timestamptz,template_name text,format text);
 INSERT INTO companies VALUES('${cid}'),('${outra}');
 INSERT INTO profiles VALUES('${uid}','${cid}','Recepção Teste');
 INSERT INTO attendance_orders VALUES('${order}','${cid}','543-00'),('${orderOutra}','${outra}','1-00');
 INSERT INTO document_print_logs VALUES(gen_random_uuid(),'${cid}','${order}','${uid}',now()-interval '1 hour','Declaração de comparecimento','A4');
 SET test.uid='${uid}'; SET test.allowed='yes';`)
 await db.exec(readFileSync('drizzle/migrations/0147_laudo_impressao_historico.sql','utf8'))
},30000)
afterAll(async()=>{await db.close()})
const exames=`'[{"id":"e1","codigo":"H","nome":"HEMOGRAMA COMPLETO"},{"id":"e2","codigo":"URE","nome":"UREIA"}]'::jsonb`
it('registra quem clicou em Imprimir Laudo, quais exames e quando',async()=>{
 await db.exec(`SELECT laudo_impressao_registrar('${order}','abrir',${exames})`)
 const r=await db.query<any>(`SELECT * FROM laudo_impressao_lista('${order}') WHERE tipo='laudo'`)
 expect(r.rows).toHaveLength(1)
 expect(r.rows[0].acao).toBe('abrir')
 expect(r.rows[0].usuario_nome).toBe('Recepção Teste')
 expect(r.rows[0].created_at).toBeTruthy()
 expect(r.rows[0].exames.map((e:any)=>e.codigo)).toEqual(['H','URE'])
})
it('cada clique gera um registro novo',async()=>{
 await db.exec(`SELECT laudo_impressao_registrar('${order}','imprimir',${exames})`)
 const r=await db.query<any>(`SELECT count(*)::int n FROM laudo_impressao_lista('${order}') WHERE tipo='laudo'`)
 expect(r.rows[0].n).toBe(2)
})
it('mostra também declarações/termos impressos',async()=>{
 const r=await db.query<any>(`SELECT detalhe FROM laudo_impressao_lista('${order}') WHERE tipo='documento'`)
 expect(r.rows[0].detalhe).toBe('Declaração de comparecimento (A4)')
})
it('exige exames e ação válida',async()=>{
 await expect(db.query(`SELECT laudo_impressao_registrar('${order}','abrir','[]'::jsonb)`)).rejects.toThrow(/exames/)
 await expect(db.query(`SELECT laudo_impressao_registrar('${order}','apagar',${exames})`)).rejects.toThrow(/inválida/)
})
it('bloqueia pedido de outra empresa',async()=>{
 await expect(db.query(`SELECT laudo_impressao_registrar('${orderOutra}','abrir',${exames})`)).rejects.toThrow(/não encontrado/)
 await expect(db.query(`SELECT * FROM laudo_impressao_lista('${orderOutra}')`)).rejects.toThrow(/não encontrado/)
})
it('bloqueia sem login e leitura sem permissão',async()=>{
 await db.exec(`SET test.allowed='no'`)
 await expect(db.query(`SELECT * FROM laudo_impressao_lista('${order}')`)).rejects.toThrow(/permissão/)
 await db.exec(`SET test.allowed='yes'; SET test.uid=''`)
 await expect(db.query(`SELECT laudo_impressao_registrar('${order}','abrir',${exames})`)).rejects.toThrow(/Login/)
 await db.exec(`SET test.uid='${uid}'`)
})
