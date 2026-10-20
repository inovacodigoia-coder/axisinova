// CRM 12A: real PostgreSQL functions on isolated PGlite fixtures (no operational data, no messages).
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const sql = readFileSync('drizzle/migrations/0104_crm_12a.sql', 'utf8').replace(/ALTER PUBLICATION[^;]+;/g, '')
const C = '00000000-0000-4000-8000-0000000000c1'
const OUTRA = '00000000-0000-4000-8000-0000000000c2'
const GESTOR = '00000000-0000-4000-8000-0000000000a1'
const OPER = '00000000-0000-4000-8000-0000000000a2'
const VISU = '00000000-0000-4000-8000-0000000000a3'
const ESTRANHO = '00000000-0000-4000-8000-0000000000a4'
const CT = '00000000-0000-4000-8000-0000000000d1'
const PAC = '00000000-0000-4000-8000-0000000000e1'
let db: PGlite

async function rows(q: string, p: unknown[] = []) { return (await db.query<Record<string, any>>(q, p)).rows }
const como = (u: string) => db.exec(`SELECT set_config('teste.uid', '${u}', false)`)
async function erro(q: string, p: unknown[] = []) { try { await rows(q, p); return '' } catch (e: any) { return String(e.message) } }
const etapa = async (nome: string, comp = C) => (await rows('SELECT id FROM crm_etapas WHERE company_id=$1 AND nome=$2', [comp, nome]))[0].id
const criar = async (p: object) => (await rows('SELECT crm_lead_criar($1::jsonb) id', [JSON.stringify(p)]))[0].id

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    SET check_function_bodies = off;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA private;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('teste.uid', true),'')::uuid $$;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE companies(id uuid PRIMARY KEY, whatsapp_habilitado boolean DEFAULT true, inovachat_habilitado boolean DEFAULT true);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, full_name text, is_active boolean DEFAULT true);
    CREATE TABLE perms(user_id uuid, perm text);
    CREATE TABLE patients(id uuid PRIMARY KEY, company_id uuid, name text, phone text, cpf text);
    CREATE TABLE whatsapp_contatos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, telefone text, nome_exibicao text, paciente_id uuid,
      vinculo_status text DEFAULT 'novo', criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now());
    CREATE TABLE whatsapp_conversas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, contato_id uuid REFERENCES whatsapp_contatos(id) ON DELETE CASCADE,
      status text, responsavel_id uuid, setor_id text, ultima_mensagem_em timestamptz, criada_em timestamptz DEFAULT now(), nao_lidas int DEFAULT 0);
    CREATE TABLE whatsapp_mensagens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversa_id uuid REFERENCES whatsapp_conversas(id) ON DELETE CASCADE);
    CREATE TABLE whatsapp_conversa_acessos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, conversa_id uuid, usuario_id uuid, acessado_em timestamptz DEFAULT now());
    CREATE TABLE whatsapp_fila_envios(id uuid PRIMARY KEY, company_id uuid, telefone_destino text);
    CREATE TABLE whatsapp_nps_respostas(id uuid PRIMARY KEY, company_id uuid, fila_id uuid);
    CREATE TABLE whatsapp_auditoria(company_id uuid, acao text, antes jsonb, depois jsonb, usuario_id uuid);
    CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=$1 $$;
    CREATE FUNCTION is_company_manager(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION whatsapp_tel_canonico(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION inovachat_ativo(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION inovachat_tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS (SELECT 1 FROM perms WHERE user_id=auth.uid() AND perm=$1) $$;
    CREATE FUNCTION inovachat_pode_ver(uuid,text,uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $4 = 'visivel' $$;
    CREATE FUNCTION inovachat_nome_usuario(uuid) RETURNS text LANGUAGE sql AS $$ SELECT full_name FROM profiles WHERE id=$1 $$;
  `)
  await db.exec(sql)
  await db.exec(`ALTER TABLE patients ADD COLUMN phone2 text, ADD COLUMN phone3 text;
    ALTER TABLE whatsapp_mensagens ADD COLUMN company_id uuid, ADD COLUMN direcao text, ADD COLUMN origem text, ADD COLUMN status text, ADD COLUMN texto text, ADD COLUMN criado_em timestamptz DEFAULT now();
    CREATE TABLE appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, patient_id uuid, sched_status text DEFAULT 'scheduled');
    CREATE TABLE user_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid,user_id uuid,category text,priority text,title text,message text,action_route text);
  `)
  for (const file of ['0105_crm_12b_temperatura_evolucao_retornos.sql','0106_crm_12b_resultados_quadro.sql']) await db.exec(readFileSync('drizzle/migrations/'+file,'utf8').replace(/SELECT cron.schedule[^;]+;/g,''))
  await db.exec(`CREATE OR REPLACE FUNCTION crm_usuario_tem(u uuid,c uuid,p text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND company_id=c) AND EXISTS(SELECT 1 FROM perms WHERE user_id=u AND perm=p) $$;`)
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.crm_tem_permissao(_perm text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS (SELECT 1 FROM perms WHERE user_id=auth.uid() AND perm=_perm) $$;
    INSERT INTO companies(id) VALUES ('${C}'),('${OUTRA}');
    INSERT INTO profiles VALUES ('${GESTOR}','${C}','Gestora'),('${OPER}','${C}','Operador'),('${VISU}','${C}','Visualizador'),('${ESTRANHO}','${OUTRA}','Outra empresa');
    INSERT INTO perms VALUES ('${GESTOR}','crm.gerenciar'),('${OPER}','crm.operar'),('${VISU}','crm.visualizar'),('${ESTRANHO}','crm.gerenciar');
    INSERT INTO whatsapp_contatos(id, company_id, telefone, nome_exibicao) VALUES ('${CT}','${C}','5584999990000','Maria');
    INSERT INTO patients(id,company_id,name,phone,cpf) VALUES ('${PAC}','${C}','João Paciente','(55) 99123-4567','12345678900');
    UPDATE companies SET crm_habilitado = true;
  `)
})
afterEach(async () => { await db.close() })


async function lead() { await como(OPER); return criar({ contato_id: CT, nome: 'Teste CRM' }) }
async function automatico(evolution = true) { await db.query("UPDATE crm_config SET temperatura_modo='automatico',evolucao_automatica=$1,alterado_em=now()-interval '1 day' WHERE company_id=$2",[evolution,C]) }
async function message(id: string, text = '', direction = 'entrada', origin = 'paciente', status: string | null = null) {
 let conv = (await rows('SELECT id FROM whatsapp_conversas WHERE contato_id=$1',[CT]))[0]?.id
 if (!conv) conv = (await rows("INSERT INTO whatsapp_conversas(company_id,contato_id,status,setor_id) VALUES($1,$2,'na_fila','visivel') RETURNING id",[C,CT]))[0].id
 return (await rows('INSERT INTO whatsapp_mensagens(company_id,conversa_id,direcao,origem,status,texto,criado_em) VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()) RETURNING id',[C,conv,direction,origin,status,text]))[0].id
}
const state = async (id: string) => (await rows('SELECT * FROM crm_leads WHERE id=$1',[id]))[0]
const results = async () => (await rows("SELECT crm_resultados(current_date-30,current_date) r"))[0].r

describe('CRM 12B — regras PostgreSQL isoladas', () => {
 it('inicia Manual, evolução desligada, prazos 7 e 5 e lista editável', async () => {
  const c=(await rows('SELECT * FROM crm_config WHERE company_id=$1',[C]))[0]
  expect(c).toMatchObject({temperatura_modo:'manual',evolucao_automatica:false,travar_manual_dias:7,frio_apos_dias:5})
  await como(GESTOR)
  await rows('SELECT crm_config_salvar($1)',[JSON.stringify({...c,palavras_quentes:['consulta premium']})])
  expect((await rows('SELECT palavras_quentes FROM crm_config WHERE company_id=$1',[C]))[0].palavras_quentes).toEqual(['consulta premium'])
 })
 it('palavras inteiras e expressões normalizadas não confundem valorizar com valor', async () => {
  expect((await rows("SELECT crm_palavra_quente('Qual o VALOR da consulta?',ARRAY['valor']) w"))[0].w).toBe('valor')
  expect((await rows("SELECT crm_palavra_quente('Quero ORÇAMENTO!',ARRAY['orcamento']) w"))[0].w).toBe('orcamento')
  expect((await rows("SELECT crm_palavra_quente('quanto custa?',ARRAY['quanto custa']) w"))[0].w).toBe('quanto custa')
  expect((await rows("SELECT crm_palavra_quente('valorizar',ARRAY['valor']) w"))[0].w).toBeNull()
 })
 it('Manual não muda; automático aquece por valor e avisa uma vez sem armazenar texto', async () => {
  const id=await lead(); await message(id,'qual o valor da consulta?'); expect((await state(id)).temperatura).toBe('morno')
  await automatico(); await message(id,'qual o valor da consulta?'); expect((await state(id)).temperatura).toBe('quente')
  await rows("SELECT crm_temperatura_aplicar($1,'morno','teste')",[id]); await message(id,'valor')
  expect((await rows('SELECT count(*)::int n FROM user_notifications'))[0].n).toBe(1)
  const ev=await rows("SELECT * FROM crm_lead_eventos WHERE lead_id=$1 AND tipo='temperatura'",[id])
  expect(ev[0]).toMatchObject({origem:'sistema',regra:'palavra-chave: valor'})
  expect(JSON.stringify(ev)).not.toContain('qual o valor da consulta?')
 })
 it('ajuste manual trava exatamente 7 dias, liberação retoma automático', async () => {
  const id=await lead(); await automatico(); await rows('SELECT crm_lead_editar($1,$2)',[id,JSON.stringify({temperatura:'frio'})])
  expect((await rows("SELECT round(extract(epoch FROM(temperatura_travada_ate-now()))/86400)::int dias FROM crm_leads WHERE id=$1",[id]))[0].dias).toBe(7)
  await message(id,'valor'); expect((await state(id)).temperatura).toBe('frio')
  await rows('SELECT crm_voltar_automatico($1)',[id]); await message(id,'valor'); expect((await state(id)).temperatura).toBe('quente')
 })
 it('silêncio acima de 5 dias esfria e nova mensagem retoma Morno', async () => {
  const id=await lead(); await automatico(); await rows("UPDATE crm_leads SET criado_em=now()-interval '6 days' WHERE id=$1",[id]); await rows('SELECT crm_silencio_rodar()')
  expect((await state(id)).temperatura).toBe('frio'); await message(id,'bom dia'); expect((await state(id)).temperatura).toBe('morno')
 })
 it('silêncio de 4 dias e lead fechado não são reavaliados', async () => {
  const id=await lead(); await automatico(); await rows("UPDATE crm_leads SET criado_em=now()-interval '4 days' WHERE id=$1",[id]); await rows('SELECT crm_silencio_rodar()'); expect((await state(id)).temperatura).toBe('morno')
  await rows('SELECT crm_lead_mover($1,$2)',[id,await etapa('Compareceu')]); await message(id,'bom dia'); expect((await state(id)).temperatura).toBe('quente'); expect((await state(id)).fechado_em).not.toBeNull()
 })
 it('perda aplica Frio mesmo com trava manual', async () => {
  const id=await lead(); await automatico(); await rows('SELECT crm_lead_editar($1,$2)',[id,JSON.stringify({temperatura:'quente'})]); const mot=(await rows("SELECT id FROM crm_motivos_perda WHERE company_id=$1 AND nome='Preço'",[C]))[0].id
  await rows('SELECT crm_lead_mover($1,$2,$3)',[id,await etapa('Perdido'),mot]); expect((await state(id)).temperatura).toBe('frio')
 })
 it('falha e sistema não avançam; sucesso do retry avança uma única vez e não retrocede', async () => {
  const id=await lead(); await automatico(); await message(id,'teste','saida','sistema','enviada'); const m=await message(id,'teste','saida','usuario','falha'); expect((await state(id)).etapa_id).toBe(await etapa('Novo'))
  await rows("UPDATE whatsapp_mensagens SET status='enviada' WHERE id=$1",[m]); expect((await state(id)).etapa_id).toBe(await etapa('Em conversa'))
  await rows("UPDATE whatsapp_mensagens SET status='entregue' WHERE id=$1",[m]); expect((await rows("SELECT count(*)::int n FROM crm_lead_eventos WHERE lead_id=$1 AND tipo='etapa'",[id]))[0].n).toBe(1)
  await rows("SELECT crm_evoluir($1,'agendamento_criado')",[id]); await message(id,'oi','saida','usuario','enviada'); expect((await state(id)).etapa_id).toBe(await etapa('Agendado'))
 })
 it('agendamento vincula telefone único, avança e conclusão fecha em ganho', async () => {
  const id=await lead(); await automatico(); await rows('UPDATE patients SET phone=$1 WHERE id=$2',['5584999990000',PAC]); const a=(await rows('INSERT INTO appointments(company_id,patient_id) VALUES($1,$2) RETURNING id',[C,PAC]))[0].id
  expect(await state(id)).toMatchObject({paciente_id:PAC,etapa_id:await etapa('Agendado')})
  await rows("UPDATE appointments SET sched_status='completed' WHERE id=$1",[a]); expect((await state(id)).etapa_id).toBe(await etapa('Compareceu')); expect((await state(id)).fechado_em).not.toBeNull()
  await rows("UPDATE appointments SET sched_status='completed' WHERE id=$1",[a]); expect((await rows("SELECT count(*)::int n FROM crm_lead_eventos WHERE lead_id=$1 AND tipo='etapa'",[id]))[0].n).toBe(2)
 })
 it('telefone ambíguo não vincula nem avança', async () => {
  const id=await lead(); await automatico(); await rows('UPDATE patients SET phone=$1 WHERE id=$2',['5584999990000',PAC]); await rows('INSERT INTO patients(id,company_id,name,phone) VALUES(gen_random_uuid(),$1,$2,$3)',[C,'Outro paciente','5584999990000']); await rows('INSERT INTO appointments(company_id,patient_id) VALUES($1,$2)',[C,PAC]); expect((await state(id)).paciente_id).toBeNull(); expect((await state(id)).etapa_id).toBe(await etapa('Novo'))
 })
 it('falha CRM não impede gravação de mensagem ou agendamento', async () => {
  const id=await lead(); await automatico(); await db.exec("CREATE OR REPLACE FUNCTION crm_evoluir(uuid,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha simulada'; END $$;")
  await message(id,'oi','saida','usuario','enviada'); await rows('UPDATE crm_leads SET paciente_id=$1 WHERE id=$2',[PAC,id]); await rows('INSERT INTO appointments(company_id,patient_id) VALUES($1,$2)',[C,PAC]); expect((await rows('SELECT count(*)::int n FROM appointments'))[0].n).toBe(1); expect((await rows('SELECT count(*)::int n FROM whatsapp_mensagens'))[0].n).toBe(1)
 })
 it('retornos deduplicam por dia, adiamentos 1/3/7 e conclusão registram eventos', async () => {
  const id=await lead(); await rows('SELECT crm_retorno($1,NULL,now())',[id]); await rows('SELECT crm_retornos_rodar()'); await rows('SELECT crm_retornos_rodar()'); expect((await rows('SELECT count(*)::int n FROM user_notifications'))[0].n).toBe(1)
  for (const d of [1,3,7]) { await rows('SELECT crm_retorno($1,NULL,now())',[id]); await rows('SELECT crm_retorno($1,$2)',[id,d]); expect((await rows('SELECT round(extract(epoch FROM(proximo_contato_em-now()))/86400)::int d FROM crm_leads WHERE id=$1',[id]))[0].d).toBe(d) }
  await rows('SELECT crm_retorno($1)',[id]); expect((await state(id)).proximo_contato_em).toBeNull(); expect((await rows("SELECT count(*)::int n FROM crm_lead_eventos WHERE lead_id=$1 AND tipo='proximo_contato'",[id]))[0].n).toBeGreaterThan(0)
 })
 it('lead sem responsável notifica gestores, nunca visualizadores', async () => {
  const id=await lead(); await rows('UPDATE crm_leads SET responsavel_id=NULL,proximo_contato_em=now() WHERE id=$1',[id]); await rows('SELECT crm_retornos_rodar()'); expect((await rows('SELECT user_id FROM user_notifications')).map(r=>r.user_id)).toEqual([GESTOR])
 })
 it('visualizador lê resultados mas não configura/edita; outra empresa fica isolada', async () => {
  const id=await lead(); await como(VISU); expect((await results()).criados).toBe(1); expect(await erro('SELECT crm_config_salvar($1)',[JSON.stringify({})])).toContain('gestor'); expect(await erro('SELECT crm_retorno($1)',[id])).toContain('responsável'); await como(ESTRANHO); expect((await results()).criados).toBe(0); expect(await erro('SELECT crm_voltar_automatico($1)',[id])).toContain('não encontrado')
 })
 it('resultados agregados: 1 criado, 1 convertido, 100%, valor 250; sem texto/telefone', async () => {
  const id=await lead(); await rows('SELECT crm_lead_vincular_paciente($1,$2)',[id,PAC]); await rows('SELECT crm_lead_editar($1,$2)',[id,JSON.stringify({valor_estimado:250})]); await rows('SELECT crm_lead_mover($1,$2)',[id,await etapa('Agendado')]); const r=await results(); expect(r).toMatchObject({criados:1,convertidos:1,taxa:100,valor_convertidos:250}); expect(r.funil.find((e:any)=>e.nome==='Agendado').quantidade).toBe(1); expect(JSON.stringify(r)).not.toContain('Teste CRM'); expect(JSON.stringify(r)).not.toContain('5584999990000')
 })
})
