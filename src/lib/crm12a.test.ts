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
  await db.exec(`
    CREATE OR REPLACE FUNCTION public.crm_tem_permissao(_perm text) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS (SELECT 1 FROM perms WHERE user_id=auth.uid() AND perm=_perm) $$;
    INSERT INTO companies(id) VALUES ('${C}'),('${OUTRA}');
    INSERT INTO profiles VALUES ('${GESTOR}','${C}','Gestora'),('${OPER}','${C}','Operador'),('${VISU}','${C}','Visualizador'),('${ESTRANHO}','${OUTRA}','Outra empresa');
    INSERT INTO perms VALUES ('${GESTOR}','crm.gerenciar'),('${OPER}','crm.operar'),('${VISU}','crm.visualizar'),('${ESTRANHO}','crm.gerenciar');
    INSERT INTO whatsapp_contatos(id, company_id, telefone, nome_exibicao) VALUES ('${CT}','${C}','5584999990000','Maria');
    INSERT INTO patients VALUES ('${PAC}','${C}','João Paciente','(55) 99123-4567','12345678900');
    UPDATE companies SET crm_habilitado = true;
  `)
})
afterEach(async () => { await db.close() })

describe('CRM 12A — funil e leads', () => {
  it('ligar o CRM cria o funil padrão de 5 etapas, 5 tags e 5 motivos', async () => {
    expect((await rows(`SELECT nome, tipo, inicial FROM crm_etapas WHERE company_id='${C}' ORDER BY ordem`)).map(r => r.nome))
      .toEqual(['Novo', 'Em conversa', 'Agendado', 'Compareceu', 'Perdido'])
    expect((await rows(`SELECT count(*)::int n FROM crm_tags WHERE company_id='${C}'`))[0].n).toBe(5)
    expect((await rows(`SELECT count(*)::int n FROM crm_motivos_perda WHERE company_id='${C}'`))[0].n).toBe(5)
  })

  it('cria lead na etapa inicial com evento "criado" e bloqueia segundo lead aberto do mesmo contato', async () => {
    await como(OPER)
    const id = await criar({ contato_id: CT, nome: 'Maria' })
    expect((await rows('SELECT etapa_id FROM crm_leads WHERE id=$1', [id]))[0].etapa_id).toBe(await etapa('Novo'))
    expect((await rows('SELECT tipo FROM crm_lead_eventos WHERE lead_id=$1', [id])).map(r => r.tipo)).toEqual(['criado'])
    expect(await erro('SELECT crm_lead_criar($1::jsonb)', [JSON.stringify({ contato_id: CT, nome: 'Maria' })])).toContain('já tem um lead aberto')
  })

  it('Perdido exige motivo; Reabrir volta à etapa inicial e limpa o motivo', async () => {
    await como(OPER)
    const id = await criar({ contato_id: CT, nome: 'Maria' })
    await rows('SELECT crm_lead_mover($1,$2)', [id, await etapa('Agendado')])
    expect((await rows('SELECT etapa_id FROM crm_leads WHERE id=$1', [id]))[0].etapa_id).toBe(await etapa('Agendado'))
    expect(await erro('SELECT crm_lead_mover($1,$2)', [id, await etapa('Perdido')])).toContain('motivo')
    const mot = (await rows(`SELECT id FROM crm_motivos_perda WHERE company_id='${C}' AND nome='Preço'`))[0].id
    await rows('SELECT crm_lead_mover($1,$2,$3)', [id, await etapa('Perdido'), mot])
    expect((await rows('SELECT fechado_em IS NOT NULL f, motivo_perda_id FROM crm_leads WHERE id=$1', [id]))[0]).toEqual({ f: true, motivo_perda_id: mot })
    await rows('SELECT crm_lead_reabrir($1)', [id])
    expect((await rows('SELECT etapa_id, fechado_em, motivo_perda_id FROM crm_leads WHERE id=$1', [id]))[0])
      .toEqual({ etapa_id: await etapa('Novo'), fechado_em: null, motivo_perda_id: null })
  })

  it('quem só tem crm.visualizar vê o lead mas não edita; o gestor edita', async () => {
    await como(OPER)
    const id = await criar({ contato_id: CT, nome: 'Maria' })
    await como(VISU)
    expect((await rows('SELECT crm_quadro() q'))[0].q.leads).toHaveLength(1)
    expect(await erro('SELECT crm_lead_nota($1,$2)', [id, 'oi'])).toContain('responsável ou o gestor')
    await como(GESTOR)
    await rows('SELECT crm_lead_editar($1,$2::jsonb)', [id, JSON.stringify({ temperatura: 'quente' })])
    expect((await rows('SELECT tipo, de, para FROM crm_lead_eventos WHERE lead_id=$1 AND tipo=$2', [id, 'temperatura']))[0]).toEqual({ tipo: 'temperatura', de: 'morno', para: 'quente' })
  })

  it('usuário de outra empresa não vê nem altera leads desta', async () => {
    await como(OPER)
    const id = await criar({ contato_id: CT, nome: 'Maria' })
    await como(ESTRANHO)
    expect((await rows('SELECT crm_quadro() q'))[0].q.leads).toHaveLength(0)
    expect(await erro('SELECT crm_lead_mover($1,$2)', [id, await etapa('Agendado')])).toContain('não encontrado')
  })

  it('Novo lead por telefone: +55 fixo, 11 dígitos (inclusive DDD 55) e vínculo com o único paciente', async () => {
    await como(OPER)
    expect(await erro('SELECT crm_lead_criar($1::jsonb)', [JSON.stringify({ telefone: '5591234567', nome: 'X' })])).toContain('11 dígitos')
    const id = await criar({ telefone: '55991234567', nome: 'João' })
    const r = (await rows('SELECT l.paciente_id, c.telefone FROM crm_leads l JOIN whatsapp_contatos c ON c.id=l.contato_id WHERE l.id=$1', [id]))[0]
    expect(r).toEqual({ paciente_id: PAC, telefone: '5555991234567' })
  })

  it('funil: desativar etapa com leads exige migrar; não pode ficar sem etapa de perda', async () => {
    await como(OPER)
    await criar({ contato_id: CT, nome: 'Maria', etapa_id: await etapa('Em conversa') })
    await como(GESTOR)
    expect(await erro('SELECT crm_etapa_desativar($1)', [await etapa('Em conversa')])).toContain('Escolha para qual etapa')
    expect((await rows('SELECT crm_etapa_desativar($1,$2) n', [await etapa('Em conversa'), await etapa('Agendado')]))[0].n).toBe(1)
    expect(await erro('SELECT crm_etapa_desativar($1)', [await etapa('Perdido')])).toContain('etapa de perda')
  })

  it('Excluir dados deste contato apaga lead, tags e histórico e audita só as quantidades', async () => {
    await como(OPER)
    const tag = (await rows(`SELECT id FROM crm_tags WHERE company_id='${C}' LIMIT 1`))[0].id
    const id = await criar({ contato_id: CT, nome: 'Maria', tags: [tag] })
    await rows('SELECT crm_lead_nota($1,$2)', [id, 'nota sigilosa'])
    const r = (await rows('SELECT inovachat_excluir_contato_executar($1,$2,0) r', [CT, GESTOR]))[0].r
    expect(r).toMatchObject({ crm_leads: 1, crm_eventos: 2, crm_tags: 1 })
    expect((await rows('SELECT count(*)::int n FROM crm_lead_eventos'))[0].n).toBe(0)
    expect(JSON.stringify((await rows(`SELECT depois FROM whatsapp_auditoria WHERE acao='inovachat_exclusao_titular'`))[0].depois)).not.toContain('sigilosa')
  })
})
