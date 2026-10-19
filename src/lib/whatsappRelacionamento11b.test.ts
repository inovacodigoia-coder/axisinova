// Etapa 11B — executa as funções SQL reais da migration em PostgreSQL isolado; nada toca produção nem WhatsApp.
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const base = readFileSync('drizzle/migrations/0100_whatsapp_relacionamento_11b.sql', 'utf8')
const fix = readFileSync('drizzle/migrations/0101_whatsapp_nps_processar_registro_vazio.sql', 'utf8')
const testeNps = readFileSync('drizzle/migrations/0103_whatsapp_nps_teste_resposta.sql', 'utf8')
const mig = base
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-0000000000c2'
const AG = '00000000-0000-4000-8000-000000000002'
const PAC = '00000000-0000-4000-8000-000000000003'
const INST = '00000000-0000-4000-8000-000000000004'
const TEL = '5584999990000'
let db: PGlite

function fn(name: string) {
  const src = testeNps.includes(`FUNCTION public.${name}(`) ? testeNps : fix.includes(`FUNCTION public.${name}(`) ? fix : mig
  const start = src.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  if (start < 0) throw new Error(`Função ausente: ${name}`)
  const corpo = src.indexOf('AS $$', start)
  const fim = src.indexOf('$$;', corpo + 5)
  return src.slice(start, fim + 3)
}
const clock = (t: string) => db.exec(`CREATE OR REPLACE FUNCTION public.fixture_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '${t}'::timestamptz $$;`)
const q = async (sql: string, p: unknown[] = []) => (await db.query<any>(sql, p)).rows
const um = async (tipo: string) => (await q('SELECT whatsapp__ciclo_um($1,$2,fixture_now()) r', [AG, tipo]))[0].r
const nps = async (texto: string, quoted: string | null = null) =>
  (await q('SELECT whatsapp_nps_processar($1,$2,$3,$4,true) r', [INST, TEL, texto, quoted]))[0].r

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION get_user_company_id(uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT '${C}'::uuid $$;
    CREATE FUNCTION inovachat_usuario_tem(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    CREATE FUNCTION whatsapp_normalizar_celular(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION whatsapp_tel_canonico(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
    CREATE FUNCTION whatsapp_nome_responsavel(uuid,uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'Resp' $$;
    CREATE FUNCTION whatsapp_render_modelo(t text,p text,a text,b boolean,m text,d timestamptz,r text) RETURNS text LANGUAGE sql AS $$ SELECT replace(t,'{primeiro_nome}',split_part(coalesce(p,''),' ',1)) $$;
    CREATE FUNCTION whatsapp_cabecalho(text,text) RETURNS text LANGUAGE sql AS $$ SELECT '*'||$1||'*:'||chr(10)||$2 $$;
    CREATE TABLE companies(id uuid, whatsapp_habilitado boolean, name text, nome_fantasia text, inovachat_habilitado boolean);
    CREATE TABLE whatsapp_config_empresa(company_id uuid PRIMARY KEY, envio_automatico_ativo boolean, ciclo_pausado boolean, ciclo_limite_dia int, ciclo_limite_semana int, janela_inicio time, janela_fim time,
      link_google text, link_indicacao text, link_cadastro text, link_questionario text);
    CREATE TABLE whatsapp_instancias(id uuid, company_id uuid, status text, ativo_no_rodizio boolean, proximo_envio_apos timestamptz, limite_diario int, ultimo_envio_em timestamptz);
    CREATE TABLE appointments(id uuid, company_id uuid, patient_id uuid, patient_name text, patient_phone1 text, patient_phone2 text, visit_type text, appointment_type text, doctor_id uuid, doctor text, date date, time time, status text, sched_status text, created_by uuid);
    CREATE TABLE patients(id uuid, company_id uuid, name text, phone text, phone2 text, birth_date date);
    CREATE TABLE profiles(id uuid, company_id uuid, is_active boolean, is_admin boolean, role text);
    CREATE TABLE user_notifications(company_id uuid, user_id uuid, category text, priority text, title text, message text, action_route text);
    CREATE TABLE whatsapp_contatos(id uuid, company_id uuid, telefone text);
    CREATE TABLE whatsapp_conversas(id uuid, company_id uuid, contato_id uuid, ultima_mensagem_em timestamptz);
    CREATE TABLE whatsapp_automacoes(id uuid DEFAULT gen_random_uuid(), company_id uuid, tipo text, ativo boolean, filtro_tipos_atendimento text[], filtro_medicos uuid[], ordem int DEFAULT 1,
      criado_em timestamptz DEFAULT now(), deslocamento_minutos int, horario_fixo time, texto text, incluir_aviso_saida boolean DEFAULT true,
      filtro_primeira_vez boolean, filtro_apenas_adultos boolean DEFAULT true, meses_sem_atendimento_max smallint DEFAULT 24, intervalo_minimo_dias smallint DEFAULT 90,
      expira_apos_horas int, resposta_promotor text, resposta_neutro text, resposta_detrator text, padrao boolean, atualizado_em timestamptz, atualizado_por uuid);
    CREATE TABLE whatsapp_automacoes_auditoria(company_id uuid, automacao_id uuid, acao text, texto_anterior text, dados_anteriores jsonb, usuario_id uuid);
    CREATE TABLE whatsapp_fila_envios(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, tipo text, agendamento_id uuid, paciente_id uuid, telefone_destino text, texto_final text,
      ciclo_adiamentos int DEFAULT 0, status text, instancia_id uuid, agendada_para timestamptz, enviada_em timestamptz, atualizado_em timestamptz DEFAULT now(),
      criado_em timestamptz DEFAULT now(), paciente_nome text, criado_por uuid, responsavel_nome text, automacao_id uuid, formato_envio text, erro text,
      expira_em timestamptz, message_id_uazapi text, resposta_acao text, respondida_em timestamptz, nps_teste_respostas jsonb);
    CREATE TABLE whatsapp_optout(company_id uuid, telefone text);
    CREATE FUNCTION whatsapp_optout_tem(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM whatsapp_optout WHERE company_id=$1 AND telefone=$2) $$;
  `)
  const tbl = mig.slice(mig.indexOf('CREATE TABLE IF NOT EXISTS public.whatsapp_nps_respostas'))
  await db.exec(tbl.slice(0, tbl.indexOf(');') + 2).replace('REFERENCES public.companies(id) ON DELETE CASCADE', ''))
  const nomes = ['whatsapp_automacao_categoria', 'whatsapp_automacao_prioridade', 'whatsapp_automacao_link_faltando', 'whatsapp_render_links', 'whatsapp_automacao_padrao',
    'whatsapp_automacoes_trg', 'whatsapp__regra_aplicavel', 'whatsapp__ciclo_um', 'whatsapp_reservar_envios', 'whatsapp_aniversario_rodar', 'whatsapp__nps_avisar', 'whatsapp_nps_processar', 'whatsapp_nps_teste_processar']
  await clock('2026-10-19 10:00:00-03')
  for (const n of nomes) await db.exec(fn(n).replace(/now\(\)/g, 'public.fixture_now()'))
  await db.exec(`
    CREATE TRIGGER t BEFORE INSERT OR UPDATE OR DELETE ON whatsapp_automacoes FOR EACH ROW EXECUTE FUNCTION whatsapp_automacoes_trg();
    INSERT INTO companies VALUES ('${C}',true,'Clinica','Clínica Sol',false), ('${C2}',true,'Outra',NULL,false);
    INSERT INTO whatsapp_config_empresa(company_id,envio_automatico_ativo,ciclo_pausado,ciclo_limite_dia,ciclo_limite_semana,janela_inicio,janela_fim)
      VALUES ('${C}',true,false,1,3,'07:00','20:00'), ('${C2}',true,false,1,3,'07:00','20:00');
    INSERT INTO whatsapp_instancias VALUES ('${INST}','${C}','connected',true,NULL,NULL,NULL);
    INSERT INTO profiles VALUES ('00000000-0000-4000-8000-0000000000aa','${C}',true,true,'company_admin');
    INSERT INTO patients VALUES ('${PAC}','${C}','Ana Lima','${TEL}',NULL,'1990-10-19');
    INSERT INTO appointments VALUES ('${AG}','${C}','${PAC}','Ana Lima','${TEL}',NULL,'return','consultation',NULL,'Dr. X','2026-10-19','08:00','confirmed','completed',NULL);
  `)
}, 30000)
afterEach(async () => { await db.close() })

const regra = (tipo: string, extra = '') => db.exec(`INSERT INTO whatsapp_automacoes(company_id,tipo,ativo,deslocamento_minutos,horario_fixo,texto${extra ? ',' + extra.split('=')[0] : ''})
  SELECT '${C}','${tipo}',true,(whatsapp_automacao_padrao('${tipo}')->>'deslocamento')::int,(whatsapp_automacao_padrao('${tipo}')->>'horario')::time,whatsapp_automacao_padrao('${tipo}')->>'texto'${extra ? ',' + extra.split('=')[1] : ''};`)

describe('Etapa 11B — regras SQL', () => {
  const respostaTeste = async (nota: string, citado: string | null = null, telefone = TEL) =>
    (await q('SELECT whatsapp_nps_teste_processar($1,$2,$3,$4) r', [INST, telefone, nota, citado]))[0].r
  const criarTeste = () => db.exec(`INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,enviada_em,instancia_id,message_id_uazapi,nps_teste_respostas)
    VALUES ('${C}','teste','${TEL}','lida',fixture_now(),'${INST}','TESTE1','{"promotor":"Obrigado {primeiro_nome}, nota alta","neutro":"Obrigado pela nota neutra","detrator":"Obrigado pela avaliação baixa"}')`)

  it.each([['9', 'nota alta'], ['7', 'nota neutra'], ['5', 'avaliação baixa']])('teste NPS nota %s agradece sem estatística ou aviso', async (nota, trecho) => {
    await criarTeste()
    const r = await respostaTeste(nota)
    expect(r.enviar).toBe(true)
    expect(r.texto).toContain(trecho)
    expect((await q('SELECT count(*)::int n FROM whatsapp_nps_respostas'))[0].n).toBe(0)
    expect((await q('SELECT count(*)::int n FROM user_notifications'))[0].n).toBe(0)
    expect((await respostaTeste(nota, 'TESTE1')).enviar).toBe(false)
    expect((await q("SELECT count(*)::int n FROM whatsapp_fila_envios WHERE tipo='resposta_automatica'"))[0].n).toBe(1)
  })

  it('teste NPS não responde para outro telefone, outra empresa ou após 72 horas', async () => {
    await criarTeste()
    expect((await respostaTeste('9','TESTE1','5584999991234')).tratada).toBe(false)
    await db.exec(`UPDATE whatsapp_fila_envios SET company_id='${C2}'`)
    expect((await respostaTeste('9','TESTE1')).tratada).toBe(false)
    await db.exec(`UPDATE whatsapp_fila_envios SET company_id='${C}',enviada_em=fixture_now()-interval '73 hours'`)
    expect((await respostaTeste('9','TESTE1')).tratada).toBe(false)
  })

  it('confirmação mais recente mantém os números 1/2/3 fora do teste NPS', async () => {
    await criarTeste()
    await db.exec(`INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,enviada_em,instancia_id,message_id_uazapi)
      VALUES ('${C}','confirmacao_agendamento','${TEL}','enviada',fixture_now()+interval '1 minute','${INST}','CONF1')`)
    for (const nota of ['1','2','3']) expect((await respostaTeste(nota)).tratada).toBe(false)
    expect((await respostaTeste('9','TESTE1')).enviar).toBe(true)
  })

  it('não ativa regra que usa link vazio; com link, ativa', async () => {
    await expect(regra('avaliacao_google')).rejects.toThrow(/Preencha o link do Google/)
    await db.exec(`UPDATE whatsapp_config_empresa SET link_google='https://g.page/r/x' WHERE company_id='${C}'`)
    await regra('avaliacao_google')
    expect((await q("SELECT count(*)::int n FROM whatsapp_automacoes WHERE tipo='avaliacao_google' AND ativo"))[0].n).toBe(1)
  })

  it('NPS entra para 24 h depois de finalizar e não repete em 90 dias', async () => {
    await regra('nps')
    expect(await um('nps')).toBe('ENFILEIRADA')
    const [l] = await q("SELECT agendada_para, expira_em FROM whatsapp_fila_envios WHERE tipo='ciclo_nps'")
    expect(new Date(l.agendada_para).toISOString()).toBe('2026-10-20T13:00:00.000Z')
    expect(new Date(l.expira_em).toISOString()).toBe('2026-10-23T13:00:00.000Z')
    await db.exec("UPDATE whatsapp_fila_envios SET agendamento_id=NULL")
    await clock('2026-12-01 10:00:00-03')
    expect(await um('nps')).toBe('NPS_RECENTE')
    await clock('2027-01-20 10:00:00-03')
    expect(await um('nps')).toBe('ENFILEIRADA')
  })

  it('Google avulso não sai quando o NPS ativo cobre o atendimento', async () => {
    await db.exec(`UPDATE whatsapp_config_empresa SET link_google='https://g.page/r/x' WHERE company_id='${C}'`)
    await regra('avaliacao_google'); await regra('nps')
    expect(await um('avaliacao_google')).toBe('PRECEDENCIA_NPS')
  })

  it('quem saiu não recebe nenhum dos novos tipos', async () => {
    await regra('nps'); await db.exec(`INSERT INTO whatsapp_optout VALUES ('${C}','${TEL}')`)
    expect(await um('nps')).toBe('OPTOUT')
  })

  async function npsEnviado() {
    await db.exec(`UPDATE whatsapp_config_empresa SET link_google='https://g.page/r/x' WHERE company_id='${C}'`)
    await regra('nps'); await um('nps')
    await db.exec(`UPDATE whatsapp_fila_envios SET status='enviada', enviada_em=fixture_now(), instancia_id='${INST}', message_id_uazapi='NPS1' WHERE tipo='ciclo_nps'`)
  }

  it('nota 10: promotor e agradecimento com o link do Google', async () => {
    await npsEnviado()
    const r = await nps('10')
    expect(r.tratada).toBe(true)
    expect(r.texto).toContain('https://g.page/r/x')
    expect((await q('SELECT nota, categoria FROM whatsapp_nps_respostas'))).toEqual([{ nota: 10, categoria: 'promotor' }])
    await nps('9')
    expect((await q('SELECT count(*)::int n FROM whatsapp_nps_respostas'))[0].n).toBe(1)
  })

  it('nota 5: detrator, pede comentário, avisa no sino; comentário seguinte é gravado', async () => {
    await npsEnviado()
    const r = await nps('5!')
    expect(r.texto).toContain('o que podemos melhorar')
    expect((await q('SELECT categoria FROM whatsapp_nps_respostas'))[0].categoria).toBe('detrator')
    expect((await q('SELECT message FROM user_notifications'))[0].message).toBe('Ana Lima deu nota 5 na pesquisa de satisfação.')
    const c = await nps('Demorou muito na recepção')
    expect(c.texto).toContain('Recebemos seu retorno')
    expect((await q('SELECT comentario FROM whatsapp_nps_respostas'))[0].comentario).toBe('Demorou muito na recepção')
    expect((await q('SELECT count(*)::int n FROM user_notifications'))[0].n).toBe(2)
    expect((await nps('Outra coisa')).tratada).toBe(false)
  })

  it('"1" com confirmação mais recente continua sendo confirmação', async () => {
    await npsEnviado()
    await clock('2026-10-20 11:00:00-03')
    await db.exec(`INSERT INTO whatsapp_fila_envios(company_id,tipo,telefone_destino,status,enviada_em,instancia_id) VALUES ('${C}','confirmacao_agendamento','${TEL}','enviada',fixture_now(),'${INST}')`)
    expect((await nps('1')).tratada).toBe(false)
    expect((await nps('8', 'NPS1')).tratada).toBe(true)
  })

  it('pesquisa vencida é cancelada como EXPIRADA antes de reservar', async () => {
    await regra('nps'); await um('nps')
    await clock('2026-10-24 10:00:00-03')
    await q('SELECT * FROM whatsapp_reservar_envios()')
    expect((await q("SELECT status, erro FROM whatsapp_fila_envios WHERE tipo='ciclo_nps'"))[0]).toEqual({ status: 'cancelada', erro: 'EXPIRADA' })
  })

  it('aniversário: adulto atendido recentemente recebe às 09:00, uma vez no ano', async () => {
    await regra('aniversario')
    await clock('2026-10-19 06:00:00-03')
    expect((await q("SELECT whatsapp_aniversario_rodar('2026-10-19') n"))[0].n).toBe(1)
    const [l] = await q("SELECT agendada_para, expira_em, texto_final FROM whatsapp_fila_envios WHERE tipo='ciclo_aniversario'")
    expect(new Date(l.agendada_para).toISOString()).toBe('2026-10-19T12:00:00.000Z')
    expect(l.texto_final).toContain('A equipe Clínica Sol')
    expect((await q("SELECT whatsapp_aniversario_rodar('2026-10-19') n"))[0].n).toBe(0)
  })

  it('aniversário: menor de 18 ou sem atendimento recente não recebe', async () => {
    await regra('aniversario')
    await db.exec(`UPDATE patients SET birth_date='2010-10-19'`)
    expect((await q("SELECT whatsapp_aniversario_rodar('2026-10-19') n"))[0].n).toBe(0)
    await db.exec(`UPDATE patients SET birth_date='1990-10-19'; UPDATE appointments SET date='2023-01-01'`)
    expect((await q("SELECT whatsapp_aniversario_rodar('2026-10-19') n"))[0].n).toBe(0)
  })

  it('outra empresa não usa as regras desta', async () => {
    await regra('nps')
    await db.exec(`UPDATE appointments SET company_id='${C2}'`)
    expect(await um('nps')).toBe('SEM_REGRA_ATIVA')
  })
})
