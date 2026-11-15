import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'

// Soroteca — PostgreSQL isolado (PGlite), só dados fictícios.
let db: PGlite
const C = '00000000-0000-4000-8000-000000000001'
const C2 = '00000000-0000-4000-8000-000000000002'
const ADM = '00000000-0000-4000-8000-000000000011'
const VER = '00000000-0000-4000-8000-000000000012'
const ARM = '00000000-0000-4000-8000-000000000013'
const NADA = '00000000-0000-4000-8000-000000000014'
const ADM2 = '00000000-0000-4000-8000-000000000015'
const HEM = '00000000-0000-4000-8000-0000000000b1'
const BIO = '00000000-0000-4000-8000-0000000000b2'
const PAC = '00000000-0000-4000-8000-0000000000c1'

// 0161 (base) + migrations seguintes da soroteca (ex.: prateleiras), na ordem
const MIGS = (() => {
  const fs = readdirSync('drizzle/migrations').filter(n => /^\d+_soroteca(_[a-z_]+)?\.sql$/.test(n)).sort().map(n => `drizzle/migrations/${n}`)
  const extra = process.env.SOROTECA_SQL_EXTRA
  return extra && !fs.some(f => f.endsWith(extra.split('/').pop()!)) ? [...fs, extra] : fs
})()

const como = async (uid: string) => db.exec(`SET test.uid = '${uid}';`)
const rows = async (sql: string, p: any[] = []) => (await db.query<Record<string, any>>(sql, p)).rows
const uma = async (sql: string, p: any[] = []) => (await rows(sql, p))[0]
const erro = async (sql: string, p: any[] = []) => {
  try { await db.query(sql, p); return '' } catch (e: any) { return String(e.message) }
}
const COLETA = '2026-11-10T12:00:00.000Z'
const exame = (id: string, bancada: string, extra: object = {}) =>
  ({ id, examId: id, name: `Exame ${id}`, bancadaId: bancada, bancadaTipo: 'interna', collected: true, collectedAt: COLETA, collectedBy: { id: 'u', name: 'Ana Costa' }, ...extra })
const pedido = async (numero: string, exams: object[], company = C) =>
  (await uma(`INSERT INTO attendance_orders(company_id, order_number, protocol, empresa_seq, patient_id, patient_name, status, lab_guides)
    VALUES($1, $2, $2, 15, $3, 'Maria Teste', 'in_analysis', $4::jsonb) RETURNING id`, [company, numero, PAC, JSON.stringify([{ id: 'g1', exams }])])).id as string
/** Estante (grade de tubos com etiqueta própria): os tubos só ficam em estantes. */
const equipamento = async (codigo: string, linhas = 4, colunas = 5, wb: string | null = BIO) =>
  (await uma(`SELECT soroteca_estante_gravar(NULL, $1, NULL, $2, $3, $4, true) id`, [codigo, linhas, colunas, wb])).id as string
const geladeira = async (nome: string, prateleiras = 2, posicoes = 2) =>
  (await uma(`SELECT soroteca_armario_gravar(NULL, $1, 'geladeira', '2-8°C', $2, $3, true) id`, [nome, prateleiras, posicoes])).id as string
const armazenar = (itens: object[]) => uma(`SELECT soroteca_armazenar($1::jsonb) r`, [JSON.stringify(itens)])
const item = (order: string, idx: number, exames: string[], eq: string, linha: number, coluna: number) =>
  ({ order_id: order, tubo_indice: idx, exame_ids: exames, equipamento_id: eq, linha, coluna, tubo_nome: 'Tubo gel' })
const amostras = async (f: object = {}) => (await uma(`SELECT soroteca_amostras($1::jsonb) r`, [JSON.stringify(f)])).r.amostras as any[]
/** Libera os exames de todos os tubos guardados na estante (o Finalizar só aceita estante com tudo liberado). */
const liberarEstante = (est: string) => db.query(`INSERT INTO lab_exam_results(company_id, order_id, exam_ref, status, released_at)
  SELECT s.company_id, s.order_id, s.order_id::text || ':' || e, 'released', now() FROM soroteca_amostra s CROSS JOIN LATERAL unnest(s.exame_ids) e
  WHERE s.equipamento_id = $1 AND s.status = 'armazenada' ON CONFLICT (company_id, exam_ref) DO NOTHING`, [est])
const guardarLiberada = async (est: string, gel: string, prat: string) => { await liberarEstante(est); return uma(`SELECT soroteca_estante_guardar($1, $2, $3) r`, [est, gel, prat]) }

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY, sequence_id int);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, full_name text);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
    CREATE SCHEMA private;
    CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role='super_admin') $$;
    CREATE FUNCTION is_company_manager(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=u AND role='company_admin') $$;
    CREATE TABLE access_profiles(id text PRIMARY KEY, company_id uuid, permissions jsonb, is_active boolean DEFAULT true, name text);
    CREATE TABLE company_sectors(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), is_active boolean DEFAULT true, allowed_profile_ids text[]);
    CREATE TABLE sector_users(user_id uuid, sector_id uuid);
    CREATE TABLE patients(id uuid PRIMARY KEY, name text, cpf text, birth_date date);
    CREATE TABLE attendance_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, order_number text, protocol text,
      empresa_seq int, patient_id uuid, patient_name text, is_urgent boolean, status text, lab_guides jsonb, created_at timestamptz DEFAULT now());
    CREATE TABLE lab_exam_results(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, order_id uuid, exam_ref text, exam_name text,
      status text, released_at timestamptz, released_by uuid, UNIQUE(company_id, exam_ref));
    CREATE TABLE lab_workbenches(id uuid PRIMARY KEY, company_id uuid, name text, is_active boolean DEFAULT true, tipo text);
    CREATE TABLE lab_settings(company_id uuid, lab_name text, responsible_name text, responsible_register text, report_logo_primary_url text);
    CREATE TABLE company_branding(company_id uuid, brand_name text, logo_url text);
    INSERT INTO companies VALUES('${C}', 15), ('${C2}', 3);
    INSERT INTO profiles VALUES('${ADM}','${C}','company_admin','Admin'),('${VER}','${C}','biochemist','Só Vê'),
      ('${ARM}','${C}','biochemist','Pedro Lima'),('${NADA}','${C}','receptionist','Sem Acesso'),('${ADM2}','${C2}','company_admin','Outra');
    INSERT INTO access_profiles VALUES('p_ver','${C}','{"soroteca":["soroteca.ver"]}'),('p_arm','${C}','{"soroteca":["soroteca.armazenar"]}'),
      ('p_old','${C}','{"serotheque":["view","create"]}');
    INSERT INTO company_sectors(id, allowed_profile_ids) VALUES('00000000-0000-4000-8000-0000000000f1','{p_ver}'),('00000000-0000-4000-8000-0000000000f2','{p_arm}');
    INSERT INTO sector_users VALUES('${VER}','00000000-0000-4000-8000-0000000000f1'),('${ARM}','00000000-0000-4000-8000-0000000000f2');
    INSERT INTO patients VALUES('${PAC}','Maria Teste','123.456.789-00','1990-01-13');
    INSERT INTO lab_workbenches VALUES('${HEM}','${C}','Hematologia',true,'interna'),('${BIO}','${C}','Bioquímica',true,'interna');
  `)
  for (const m of MIGS) await db.exec(readFileSync(m, 'utf8'))
  // módulo ativo na empresa de teste (as demais regras são testadas em 'Soroteca — módulo por empresa')
  await db.exec(`INSERT INTO soroteca_modulo(company_id, ativo) VALUES('${C}', true) ON CONFLICT (company_id) DO UPDATE SET ativo = true`)
})
afterEach(async () => { await db.close() })

describe('Soroteca — código do tubo', () => {
  it('código alfanumérico do banco é igual ao da etiqueta impressa', async () => {
    for (const [p, i, s] of [['322-01', 1, 15], ['16-00', 3, 1], ['1-01', 12, null], ['99999-07', 2, 128]] as const) {
      const codigo = buildSampleCode(p, i, s)
      const sql = await uma(`SELECT soroteca_codigo_tubo($1, $2, $3) c, soroteca_hash_amostra(soroteca_codigo_tubo($1, $2, $3)) h`, [p, i, s])
      expect(sql.c).toBe(codigo)
      expect(sql.h).toBe(generateSampleHash(codigo))
    }
  })

  it('bipe do código de barras encontra o tubo de um pedido ainda não guardado', async () => {
    const o = await pedido('322-01', [exame('e1', BIO), exame('e2', HEM)])
    await como(VER)
    const r = (await uma(`SELECT soroteca_localizar($1) r`, [generateSampleHash('322-01-2-15')])).r
    expect(r.modo).toBe('tubo')
    expect(r.pedidos[0].order_id).toBe(o)
    expect(r.pedidos[0].tubo_indice).toBe(2)
  })
})

describe('Soroteca — permissões', () => {
  it('sem permissão não vê nem guarda; só ver não guarda; armazenar já inclui ver', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await como(NADA)
    expect(await erro(`SELECT soroteca_resumo()`)).toMatch(/Sem permissão/)
    await como(VER)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toEqual({ ver: true, armazenar: false, descartar: false, configurar: false, modulo_ativo: true, pode_ativar: false })
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/Sem permissão/)
    await como(ARM)
    expect((await uma(`SELECT soroteca_acesso() a`)).a.ver).toBe(true)
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    expect(await erro(`SELECT soroteca_descartar(ARRAY[(SELECT id FROM soroteca_amostra)], 'Validade vencida', 'Pedro')`)).toMatch(/Sem permissão/)
    expect(await erro(`SELECT soroteca_armario_gravar(NULL, 'X', 'freezer', NULL, 2, 2, true)`)).toMatch(/Sem permissão/)
  })

  it('perfis antigos do módulo recebem as permissões equivalentes', async () => {
    const p = await uma(`SELECT permissions->'soroteca' s FROM access_profiles WHERE id='p_old'`)
    expect([...p.s].sort()).toEqual(['soroteca.armazenar', 'soroteca.ver'])
  })

  it('outra empresa não usa equipamento nem pedido alheio', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await db.exec(`INSERT INTO soroteca_modulo(company_id, ativo) VALUES('${C2}', true)`)
    await como(ADM2)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/Pedido não encontrado/)
  })
})

describe('Soroteca — armazenar, mover, retirar e descartar', () => {
  it('validade = coleta + retenção da bancada (Hematologia 3 dias, Bioquímica 7)', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', HEM)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1), item(o, 2, ['e2'], eq, 1, 2)])
    const l = await amostras()
    const bio = l.find(a => a.codigo_amostra === '1-01-1-15')
    const hem = l.find(a => a.codigo_amostra === '1-01-2-15')
    expect(new Date(bio.validade).toISOString()).toBe('2026-11-17T12:00:00.000Z')
    expect(new Date(hem.validade).toISOString()).toBe('2026-11-13T12:00:00.000Z')
    expect(hem.codigo_alfanumerico).toBe(generateSampleHash('1-01-2-15'))
  })

  it('prazo configurado na bancada vale para as próximas entradas', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    await db.query(`SELECT soroteca_config_salvar(10, 'Pedro', $1::jsonb)`, [JSON.stringify({ [BIO]: 15 })])
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    expect(new Date((await amostras())[0].validade).toISOString()).toBe('2026-11-25T12:00:00.000Z')
    const cfg = (await uma(`SELECT soroteca_config_ler() c`)).c
    expect(cfg.aviso_dias).toBe(10)
    expect(cfg.bancadas.find((b: any) => b.nome === 'Hematologia').dias).toBe(3)
  })

  it('posição ocupada bloqueia e o lote inteiro volta atrás', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', HEM)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    const msg = await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 2, ['e2'], eq, 2, 1), item(o, 2, ['e2'], eq, 1, 1)])])
    expect(msg).toMatch(/já está ocupada pela amostra 1-01-1-15/)
    expect((await amostras()).length).toBe(1)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 2, ['e2'], eq, 9, 1)])])).toMatch(/fora da grade/)
  })

  it('tubo só de apoio, não coletado ou com exame de outro pedido não entra', async () => {
    const o = await pedido('1-01', [exame('a1', BIO, { bancadaTipo: 'apoio' }), exame('n1', BIO, { collected: false, collectedAt: null }), exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['a1'], eq, 1, 1)])])).toMatch(/só tem exames de apoio/)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['n1'], eq, 1, 1)])])).toMatch(/ainda não foi coletado/)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['xx'], eq, 1, 1)])])).toMatch(/não conferem/)
    await armazenar([item(o, 1, ['a1', 'e1'], eq, 1, 1)])
    const a = (await amostras())[0]
    expect(a.tem_apoio).toBe(true)
    expect(a.total).toBe(1)
  })

  it('status: vermelho sem liberado, amarelo parcial, azul todos liberados', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1', 'e2'], eq, 1, 1)])
    expect((await amostras())[0].status_resultado).toBe('em_analise')
    await db.query(`INSERT INTO lab_exam_results(company_id, order_id, exam_ref, status, released_at) VALUES($1, $2, $3, 'released', now())`, [C, o, `${o}:e1`])
    expect((await amostras())[0].status_resultado).toBe('parcial')
    await db.query(`INSERT INTO lab_exam_results(company_id, order_id, exam_ref, status, released_at) VALUES($1, $2, $3, 'released', now())`, [C, o, `${o}:e2`])
    expect((await amostras())[0].status_resultado).toBe('liberado')
  })

  it('mover, retirar (libera a posição) e guardar de novo ficam no histórico', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)]) // bipe repetido não duplica
    await armazenar([item(o, 1, ['e1'], eq, 2, 3)])
    const id = (await amostras())[0].id
    expect(await erro(`SELECT soroteca_retirar($1, 'Outro', 'curto')`, [id])).toMatch(/pelo menos 10 caracteres/)
    expect(await erro(`SELECT soroteca_retirar($1, 'Consulta externa', 'Pedido do médico assistente')`, [id])).toMatch(/Motivo da retirada inválido/)
    await db.query(`SELECT soroteca_retirar($1, 'Solicitação médica', 'Pedido do médico assistente')`, [id])
    expect((await amostras())[0]).toMatchObject({ status: 'retirada', linha: null })
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    const r = (await uma(`SELECT soroteca_rastreio($1) r`, [id])).r
    expect(r.movimentos.map((m: any) => m.tipo)).toEqual(['entrada', 'movimentacao', 'retirada', 'entrada'])
    expect(r.movimentos[1]).toMatchObject({ de_linha: 1, de_coluna: 1, linha: 2, coluna: 3 })
    expect(r.movimentos[2]).toMatchObject({ motivo: 'Solicitação médica', observacao: 'Pedido do médico assistente', usuario_nome: 'Admin' })
    expect(r.coleta.responsavel).toBe('Ana Costa')
  })

  it('descarte grava o usuário logado como responsável, libera a posição e a amostra não volta nem é apagada', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    const id = (await amostras())[0].id
    expect((await uma(`SELECT soroteca_descartar(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', 'Nome Digitado', 'rotina') n`, [id])).n).toBe(1)
    expect(await uma(`SELECT responsavel_nome, usuario_id FROM soroteca_movimento WHERE tipo = 'descarte'`)).toEqual({ responsavel_nome: 'Admin', usuario_id: ADM })
    expect((await amostras({ situacao: 'descartada' }))[0]).toMatchObject({ status: 'descartada', equipamento_id: null })
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/já foi descartada/)
    expect((await uma(`SELECT soroteca_resumo() r`)).r.descartadas_mes).toBe(1)
    await db.exec(`RESET ROLE`)
    expect(await erro(`DELETE FROM soroteca_amostra`)).toMatch(/não pode ser excluída/)
    expect(await erro(`UPDATE soroteca_movimento SET motivo = 'x'`)).toMatch(/não pode ser alterada/)
  })

  it('estante não encolhe nem inativa com tubos guardados; código não repete', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], eq, 3, 4)])
    expect(await erro(`SELECT soroteca_estante_gravar($1, 'E79002', NULL, 2, 5, NULL, true)`, [eq])).toMatch(/fora da nova grade/)
    expect(await erro(`SELECT soroteca_estante_gravar($1, 'E79002', NULL, 4, 5, NULL, false)`, [eq])).toMatch(/antes de inativar/)
    expect(await erro(`SELECT soroteca_estante_gravar(NULL, ' e79002', NULL, 4, 5, NULL, true)`)).toMatch(/Já existe uma estante/)
  })
})

describe('Soroteca — estantes e geladeiras', () => {
  const prats = async (eq: string) => (await rows(`SELECT id, nome, linhas, colunas, ordem FROM soroteca_prateleira WHERE equipamento_id = $1 ORDER BY ordem`, [eq]))
  const guardar = guardarLiberada

  it('tubo só entra em estante; geladeira guarda estantes', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01')
    const [p1] = await prats(g)
    expect(p1).toMatchObject({ nome: 'Prateleira 1', linhas: 1, colunas: 2 })
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([{ ...item(o, 1, ['e1'], g, 1, 1), prateleira_id: p1.id }])])).toMatch(/ficam dentro de estantes/)
    const est = await equipamento('E79002', 4, 16)
    const r = (await armazenar([item(o, 1, ['e1'], est, 1, 1)])).r
    expect(r[0]).toMatchObject({ equipamento_nome: 'Estante E79002', prateleira_nome: '', linha: 1, coluna: 1 })
  })

  it('finalizar guarda a estante na prateleira com vaga; bipar de novo abre e fica no histórico', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ARM)
    const est = await equipamento('E79002')
    const est2 = await equipamento('E79003')
    await como(ADM)
    const g = await geladeira('Geladeira 01', 2, 1)
    const [p1, p2] = await prats(g)
    await como(ARM)
    expect(await erro(`SELECT soroteca_estante_guardar($1, $2, $3)`, [est, g, p1.id])).toMatch(/está vazia/)
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    expect((await guardar(est, g, p1.id)).r).toMatchObject({ equipamento_nome: 'Geladeira 01', prateleira_nome: 'Prateleira 1', tubos: 1 })
    const a = (await amostras())[0]
    expect(a).toMatchObject({ equipamento_tipo: 'estante', estante_codigo: 'E79002', local_nome: 'Geladeira 01', local_prateleira_nome: 'Prateleira 1' })
    expect((await amostras({ equipamento_id: g })).length).toBe(1)
    const res = (await uma(`SELECT soroteca_resumo() r`)).r.equipamentos
    const gel = res.find((e: any) => e.id === g)
    expect(gel.ocupadas).toBe(1)
    expect(gel.prateleiras.map((p: any) => p.ocupadas)).toEqual([1, 0])
    expect(res.find((e: any) => e.id === est)).toMatchObject({ situacao: 'armazenada', local_prateleira_id: p1.id, codigo: 'E79002' })
    // estante guardada não recebe tubo sem ser aberta; prateleira cheia recusa outra estante
    const o2 = await pedido('2-01', [exame('e9', BIO)])
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o2, 1, ['e9'], est, 1, 2)])])).toMatch(/bipe a estante para abrir/)
    await armazenar([item(o2, 1, ['e9'], est2, 1, 1)])
    expect(await erro(`SELECT soroteca_estante_guardar($1, $2, $3)`, [est2, g, p1.id])).toMatch(/já está cheia \(1 de 1 estantes\)/)
    await guardar(est2, g, p2.id)
    expect((await uma(`SELECT soroteca_estante_abrir($1) r`, [est])).r).toEqual({ aberta: true, de: 'Geladeira 01 > Prateleira 1' })
    expect((await uma(`SELECT soroteca_estante_abrir($1) r`, [est])).r.aberta).toBe(false)
    // tubo do E79003 já finalizado (estante guardada): não muda de estante pela Entrada
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o2, 1, ['e9'], est, 1, 2)])])).toMatch(/já finalizado: retire pela Consulta/)
    const rast = (await uma(`SELECT soroteca_rastreio($1) r`, [a.id])).r
    expect(rast.estante_movimentos.map((m: any) => m.tipo)).toEqual(['guardada', 'aberta'])
    expect(rast.amostra.local_nome).toBeNull()
    await db.exec(`RESET ROLE`)
    expect(await erro(`DELETE FROM soroteca_estante_movimento`)).toMatch(/não pode ser alterada/)
  })

  it('geladeira não perde prateleira nem posição ocupada por estante', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01', 2, 2)
    const [, p2] = await prats(g)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    await guardar(est, g, p2.id)
    expect(await erro(`SELECT soroteca_armario_gravar($1, 'Geladeira 01', 'geladeira', NULL, 1, 2, true)`, [g])).toMatch(/Prateleira 2 tem 1 estante/)
    expect(await erro(`SELECT soroteca_armario_gravar($1, 'Geladeira 01', 'geladeira', NULL, 2, 2, false)`, [g])).toMatch(/Retire as estantes/)
    await db.query(`SELECT soroteca_armario_gravar($1, 'Geladeira A', 'freezer', '-20°C', 3, 4, true)`, [g])
    expect((await prats(g)).map(p => [p.nome, p.colunas])).toEqual([['Prateleira 1', 4], ['Prateleira 2', 4], ['Prateleira 3', 4]])
    expect(await erro(`SELECT soroteca_armario_gravar($1, 'X', 'geladeira', NULL, 1, 1, true)`, [est])).toMatch(/Estante se edita/)
  })

  it('código da estante não pode parecer etiqueta de tubo; quem armazena cria mas não edita', async () => {
    await como(ARM)
    expect(await erro(`SELECT soroteca_estante_gravar(NULL, 'ABCDEFGH1', NULL, 4, 4, NULL, true)`)).toMatch(/se parece com a etiqueta de um tubo/)
    expect(await erro(`SELECT soroteca_estante_gravar(NULL, 'E 1', NULL, 4, 4, NULL, true)`)).toMatch(/de 2 a 30/)
    const est = await equipamento('E10')
    expect(await erro(`SELECT soroteca_estante_gravar($1, 'E10', NULL, 4, 8, NULL, true)`, [est])).toMatch(/Sem permissão para configurar/)
    await como(VER)
    expect(await erro(`SELECT soroteca_estante_gravar(NULL, 'E11', NULL, 4, 4, NULL, true)`)).toMatch(/Sem permissão/)
  })
})

describe('Soroteca — módulo por empresa', () => {
  const TI = '00000000-0000-4000-8000-000000000016'
  const desligar = () => db.exec(`UPDATE soroteca_modulo SET ativo = false WHERE company_id = '${C}'`)

  it('desativado: some para todos da empresa, inclusive administrador e TI – Administração', async () => {
    await db.exec(`
      INSERT INTO profiles VALUES('${TI}','${C}','biochemist','Tiago TI');
      INSERT INTO access_profiles VALUES('p_ti','${C}','{"soroteca":["soroteca.ver","soroteca.configurar"]}', true, 'TI – Administração');
      INSERT INTO company_sectors(id, allowed_profile_ids) VALUES('00000000-0000-4000-8000-0000000000f3','{p_ti}');
      INSERT INTO sector_users VALUES('${TI}','00000000-0000-4000-8000-0000000000f3');`)
    await desligar()
    for (const u of [VER, ARM, TI, ADM]) {
      await como(u)
      expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: false, armazenar: false, configurar: false, modulo_ativo: false, pode_ativar: false })
      expect(await erro(`SELECT soroteca_resumo()`)).toMatch(/Sem permissão/)
    }
  })

  it('empresa sem registro do módulo começa desativada, até para o administrador', async () => {
    await como(ADM2)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: false, modulo_ativo: false, pode_ativar: false })
  })

  it('a própria empresa não liga nem desliga; só o Super Admin', async () => {
    const SA = '00000000-0000-4000-8000-000000000017'
    await db.exec(`INSERT INTO profiles VALUES('${SA}','${C}','super_admin','Super')`)
    await desligar()
    for (const u of [ARM, ADM]) {
      await como(u)
      expect(await erro(`SELECT soroteca_modulo_definir(true)`)).toMatch(/Só o Super Admin/)
    }
    await como(SA)
    await db.query(`SELECT soroteca_modulo_definir(true)`)
    await como(VER)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: true, modulo_ativo: true })
    await como(ADM2)
    expect((await uma(`SELECT soroteca_modulo_ativo() a`)).a).toBe(false)
  })
})

describe('Soroteca — bipe do tubo e descarte de estante (S05)', () => {
  const prats = async (eq: string) => (await rows(`SELECT id, nome FROM soroteca_prateleira WHERE equipamento_id = $1 ORDER BY ordem`, [eq]))
  const localizar = async (t: string) => (await uma(`SELECT soroteca_localizar($1) r`, [t])).r
  const descartarEstante = (id: string, motivo: string, resp: string, obs: string | null, destino: string, forcar = false) =>
    uma(`SELECT soroteca_estante_descartar($1, $2, $3, $4, $5, $6) r`, [id, motivo, resp, obs, destino, forcar])
  const resumoDe = async (id: string) => (await uma(`SELECT soroteca_resumo() r`)).r.equipamentos.find((e: any) => e.id === id)
  const historicoEstante = async (id: string) =>
    rows(`SELECT tipo, tubos, motivo, responsavel_nome, destino FROM soroteca_estante_movimento WHERE estante_id = $1 ORDER BY created_at, tipo`, [id])
  const VELHO = { collectedAt: '2026-01-10T12:00:00.000Z' }

  it('nenhuma função da Soroteca apaga ou altera sem filtro (o banco recusa DELETE/UPDATE sem WHERE)', () => {
    const corpos = new Map<string, string>()
    for (const m of MIGS) {
      for (const x of readFileSync(m, 'utf8').matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\([\s\S]*?\$\$([\s\S]*?)\$\$/g)) corpos.set(x[1], x[2])
    }
    const semFiltro: string[] = []
    for (const [nome, corpo] of corpos) {
      for (const x of corpo.matchAll(/\bDELETE\s+FROM\b|\bUPDATE\s+[\w.]+(\s+\w+)?\s+SET\b/gi)) {
        const comando = corpo.slice(x.index!, corpo.indexOf(';', x.index!))
        if (!/\bWHERE\b/i.test(comando)) semFiltro.push(`${nome}: ${comando.slice(0, 60)}`)
      }
    }
    expect(corpos.has('soroteca_localizar')).toBe(true)
    expect(semFiltro).toEqual([])
  })

  it('guardar tubo em estante: bipe acha o tubo, guarda, bipe repetido mostra onde está e estante reaberta recebe mais', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    const o2 = await pedido('2-01', [exame('e2', BIO)])
    await como(ARM)
    const est = await equipamento('E79002')
    const cod = buildSampleCode('1-01', 1, 15)
    // dois bipes na mesma transação: a limpeza da lista temporária roda com a tabela já existente
    await db.exec('BEGIN')
    const r1 = await localizar(cod)
    const r2 = await localizar(generateSampleHash(cod))
    await db.exec('COMMIT')
    expect(r1).toMatchObject({ modo: 'tubo' })
    expect(r1.pedidos.map((p: any) => [p.order_id, p.tubo_indice])).toEqual([[o, 1]])
    expect(r2.pedidos.map((p: any) => [p.order_id, p.tubo_indice])).toEqual([[o, 1]])
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    const r3 = await localizar(cod)
    expect(r3.pedidos[0].guardados).toEqual([expect.objectContaining({ status: 'armazenada', equipamento_id: est, linha: 1, coluna: 1 })])
    // estante guardada na geladeira, bipada de novo: abre e recebe mais um tubo
    await como(ADM)
    const g = await geladeira('Geladeira 01', 1, 2)
    const [p1] = await prats(g)
    await como(ARM)
    await guardarLiberada(est, g, p1.id)
    expect((await uma(`SELECT soroteca_estante_abrir($1) r`, [est])).r.aberta).toBe(true)
    await armazenar([item(o2, 1, ['e2'], est, 1, 2)])
    expect((await amostras({ equipamento_id: est })).map(a => a.coluna).sort()).toEqual([1, 2])
  })

  it('descartar estante vencida: todos os tubos descartados com último endereço, vaga livre e estante reaproveitada', async () => {
    const o = await pedido('1-01', [exame('e1', BIO, VELHO)])
    const o2 = await pedido('2-01', [exame('e2', BIO, VELHO)])
    await como(ADM)
    const est = await equipamento('E79002')
    const g = await geladeira('Geladeira 01', 2, 1)
    const [p1] = await prats(g)
    await armazenar([item(o, 1, ['e1'], est, 1, 1), item(o2, 1, ['e2'], est, 2, 3)])
    for (const [ord, e] of [[o, 'e1'], [o2, 'e2']]) {
      await db.query(`INSERT INTO lab_exam_results(company_id, order_id, exam_ref, status, released_at) VALUES($1, $2, $3, 'released', now())`, [C, ord, `${ord}:${e}`])
    }
    await guardarLiberada(est, g, p1.id)
    const lista = (await uma(`SELECT soroteca_estantes_descarte() r`)).r
    expect(lista.estantes).toEqual([expect.objectContaining({ codigo: 'E79002', tubos: 2, vencidos: 2, vencendo: 0, pendentes: 0, local_equipamento_nome: 'Geladeira 01' })])

    const r = (await descartarEstante(est, 'Prazo de retenção vencido', 'Nome Digitado', null, 'reaproveitar')).r
    expect(r).toMatchObject({ tubos: 2, codigo: 'E79002', origem: 'Geladeira 01 > Prateleira 1', destino: 'reaproveitar' })
    const desc = await amostras({ situacao: 'descartada' })
    expect(desc.map(a => a.ultimo_endereco).sort()).toEqual([
      'Geladeira 01 > Prateleira 1 > Estante E79002 > A01', 'Geladeira 01 > Prateleira 1 > Estante E79002 > B03'])
    expect(desc.every(a => a.status === 'descartada' && a.descartada_em)).toBe(true)
    // vaga da prateleira livre; estante vazia, mesmo código, pronta para receber tubos
    expect((await resumoDe(g)).ocupadas).toBe(0)
    expect(await resumoDe(est)).toMatchObject({ ativo: true, situacao: 'em_preenchimento', ocupadas: 0, codigo: 'E79002' })
    const rast = (await uma(`SELECT soroteca_rastreio($1) r`, [desc[0].id])).r
    expect(rast.movimentos.at(-1)).toMatchObject({ tipo: 'descarte', motivo: 'Prazo de retenção vencido', responsavel_nome: 'Admin', observacao: 'Descarte da estante E79002' })
    expect((await historicoEstante(est)).at(-1)).toMatchObject({ tipo: 'descartada', tubos: 2, responsavel_nome: 'Admin', destino: 'reaproveitar' })
    const o3 = await pedido('3-01', [exame('e3', BIO)])
    await armazenar([item(o3, 1, ['e3'], est, 1, 1)])
    expect((await amostras({ equipamento_id: est })).length).toBe(1)
    // nada é apagado: os tubos descartados continuam na consulta
    expect((await amostras({ situacao: 'todas' })).length).toBe(3)
  })

  it('tubo pendente ou no prazo só com "Descartar mesmo assim" e justificativa; inativar tira das listas e reativar volta', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    const conf = (await uma(`SELECT soroteca_estante_conferir($1) r`, [est])).r
    expect(conf.tubos).toEqual([expect.objectContaining({ codigo_amostra: buildSampleCode('1-01', 1, 15), pendentes: ['Exame e1'] })])
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Estante danificada', 'Pedro Lima', 'caiu da bancada', 'inativar', false)`, [est])).toMatch(/Descartar mesmo assim/)
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Prazo de retenção vencido', 'Pedro Lima', NULL, 'inativar', true)`, [est])).toMatch(/Explique/)
    expect((await amostras())[0].status).toBe('armazenada')
    expect((await descartarEstante(est, 'Estante danificada', 'Pedro Lima', 'caiu da bancada', 'inativar', true)).r).toMatchObject({ tubos: 1, destino: 'inativar' })
    expect(await resumoDe(est)).toMatchObject({ ativo: false, situacao: 'em_preenchimento', local_prateleira_id: null })
    expect((await uma(`SELECT soroteca_estantes_descarte() r`)).r.estantes).toEqual([])
    expect(await erro(`SELECT soroteca_estante_abrir($1)`, [est])).toMatch(/inativa/)
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Outro', 'Pedro', 'estante quebrada', 'inativar', false)`, [est])).toMatch(/já está inativa/)
    await uma(`SELECT soroteca_estante_reativar($1)`, [est])
    expect(await resumoDe(est)).toMatchObject({ ativo: true, situacao: 'em_preenchimento' })
    expect((await historicoEstante(est)).map(m => m.tipo)).toEqual(['criada', 'descartada', 'reativada'])
  })

  it('estante vazia só inativa; motivo "Outro" pede descrição; só quem descarta pode descartar ou reativar', async () => {
    await como(ADM)
    const est = await equipamento('E00009')
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Prazo de retenção vencido', 'Ana', NULL, 'reaproveitar', false)`, [est])).toMatch(/vazia/)
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Outro', 'Ana', NULL, 'inativar', false)`, [est])).toMatch(/Explique o motivo/)
    await como(ARM)
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Outro', 'Ana', 'velha', 'inativar', false)`, [est])).toMatch(/Sem permissão/)
    await como(ADM)
    expect((await descartarEstante(est, 'Outro', 'Ana', 'estante aposentada', 'inativar')).r.tubos).toBe(0)
    expect((await historicoEstante(est)).at(-1)).toMatchObject({ tipo: 'inativada', tubos: 0, destino: 'inativar' })
    await como(ARM)
    expect(await erro(`SELECT soroteca_estante_reativar($1)`, [est])).toMatch(/Sem permissão/)
    await como(ADM2)
    expect(await erro(`SELECT soroteca_estante_reativar($1)`, [est])).toMatch(/não encontrada|Sem permissão/)
  })
})

describe('Soroteca — folha de descarte (S06)', () => {
  const VELHO = { collectedAt: '2026-01-10T12:00:00.000Z' }
  const folha = async (descarte: string | null, amostra: string | null = null) =>
    (await uma(`SELECT soroteca_descarte_folha($1, $2) r`, [descarte, amostra])).r

  it('descarte por estante gera folha com estante, origem, tubos marcados e reimpressão pela amostra e pelo histórico', async () => {
    const o = await pedido('1-01', [exame('e1', BIO, VELHO)])
    const o2 = await pedido('2-01', [exame('e2', BIO)])
    await como(ADM)
    const est = await equipamento('E79002')
    const g = await geladeira('Geladeira 01', 2, 1)
    const [p1] = await rows(`SELECT id FROM soroteca_prateleira WHERE equipamento_id = $1 ORDER BY ordem`, [g])
    await armazenar([item(o, 1, ['e1'], est, 1, 1), item(o2, 1, ['e2'], est, 2, 5)])
    await db.query(`INSERT INTO lab_exam_results(company_id, order_id, exam_ref, status, released_at) VALUES($1, $2, $3, 'released', now())`, [C, o, `${o}:e1`])
    await guardarLiberada(est, g, p1.id)
    // resultado do tubo B05 reaberto depois de guardada: volta a ficar pendente
    await db.query(`DELETE FROM lab_exam_results WHERE exam_ref = $1`, [`${o2}:e2`])
    const r = (await uma(`SELECT soroteca_estante_descartar($1, 'Prazo de retenção vencido', 'Pedro Lima', 'rotina semanal', 'reaproveitar', true) r`, [est])).r
    const f = await folha(r.descarte_id)
    expect(f).toMatchObject({ tipo: 'estante', estante_codigo: 'E79002', estante_origem: 'Geladeira 01 > Prateleira 1', motivo: 'Prazo de retenção vencido',
      observacao: 'rotina semanal', responsavel_nome: 'Admin', usuario_nome: 'Admin', tubos: 2 })
    expect(f.itens.map((i: any) => [i.posicao, i.codigo_amostra, i.patient_name, i.bancada_nome, i.pendente, i.no_prazo])).toEqual([
      ['A01', buildSampleCode('1-01', 1, 15), 'Maria Teste', 'Bioquímica', false, false],
      ['B05', buildSampleCode('2-01', 1, 15), 'Maria Teste', 'Bioquímica', true, true],
    ])
    expect(f.itens[0].coletada_em).toBeTruthy()
    expect(f.itens[0].validade).toBeTruthy()
    // reimpressão: pela Rastreabilidade (amostra) e pelo histórico da estante
    const id1 = (await amostras({ situacao: 'descartada' }))[0].id
    expect((await folha(null, id1)).id).toBe(r.descarte_id)
    const hist = (await uma(`SELECT soroteca_estante_historico($1) r`, [est])).r
    expect(hist[0]).toMatchObject({ tipo: 'descartada', descarte_id: r.descarte_id, tubos: 2 })
    // a folha não muda nem some
    await db.exec(`RESET ROLE`)
    expect(await erro(`UPDATE soroteca_descarte_item SET pendente = false`)).toMatch(/não pode ser alterada/)
    expect(await erro(`DELETE FROM soroteca_descarte`)).toMatch(/não pode ser alterada/)
  })

  it('descarte em lote e manual geram folha com o endereço de cada tubo; outra empresa não vê', async () => {
    const o = await pedido('1-01', [exame('e1', BIO, VELHO)])
    const o2 = await pedido('2-01', [exame('e2', BIO, VELHO)])
    await como(ADM)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 3), item(o2, 1, ['e2'], est, 1, 4)])
    const [a1, a2] = (await amostras()).sort((x, y) => x.coluna - y.coluna)
    const lote = (await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', 'Ana', NULL, 'lote') r`, [a1.id])).r
    expect(lote.tubos).toBe(1)
    const fl = await folha(lote.descarte_id)
    expect(fl).toMatchObject({ tipo: 'lote', estante_codigo: null, tubos: 1, responsavel_nome: 'Admin', motivo: 'Prazo de retenção vencido' })
    expect(fl.itens[0]).toMatchObject({ posicao: 'A03', endereco: 'Estante E79002 > A03', pendente: true, no_prazo: false })
    const man = (await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Amostra danificada', 'Ana', 'Tubo trincado na centrífuga', 'manual') r`, [a2.id])).r
    expect((await folha(man.descarte_id)).tipo).toBe('manual')
    // já descartada: nada a descartar, sem folha nova
    expect((await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', 'Ana', NULL, 'lote') r`, [a2.id])).r).toEqual({ tubos: 0, descarte_id: null })
    // função antiga continua respondendo e também gera folha
    expect(await erro(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'x', 'Ana', NULL, 'outro')`, [a2.id])).toMatch(/Tipo de descarte inválido/)
    await como(ADM2)
    expect(await erro(`SELECT soroteca_descarte_folha($1, NULL)`, [lote.descarte_id])).toMatch(/não encontrada|Sem permissão/)
  })
})

describe('Soroteca — remover e retirar tubo, responsável logado (S06-A)', () => {
  const prats = async (eq: string) => (await rows(`SELECT id FROM soroteca_prateleira WHERE equipamento_id = $1 ORDER BY ordem`, [eq]))
  const DESC = '00000000-0000-4000-8000-000000000018'
  const comDescarte = () => db.exec(`
    INSERT INTO profiles VALUES('${DESC}','${C}','biochemist','Dora Descarte');
    INSERT INTO access_profiles VALUES('p_desc','${C}','{"soroteca":["soroteca.ver","soroteca.descartar"]}', true, 'Descarte');
    INSERT INTO company_sectors(id, allowed_profile_ids) VALUES('00000000-0000-4000-8000-0000000000f4','{p_desc}');
    INSERT INTO sector_users VALUES('${DESC}','00000000-0000-4000-8000-0000000000f4');`)
  const remover = (id: string) => uma(`SELECT soroteca_remover_tubo($1) r`, [id])
  const tipos = async (id: string) => ((await uma(`SELECT soroteca_rastreio($1) r`, [id])).r.movimentos as any[]).map(m => m.tipo)

  it('tubo de estante em preenchimento sai só com confirmação, sem justificativa, e a posição fica livre', async () => {
    const o = await pedido('78-00', [exame('e1', BIO)])
    await como(ARM)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    const a = (await amostras())[0]
    expect(a.finalizada).toBe(false)
    expect((await remover(a.id)).r).toEqual({ codigo: buildSampleCode('78-00', 1, 15), posicao: 'A01' })
    expect((await amostras({ situacao: 'armazenada' })).length).toBe(0)
    expect((await amostras({ situacao: 'todas' }))[0]).toMatchObject({ status: 'retirada', ultimo_endereco: 'Estante E79002 > A01' })
    expect(await uma(`SELECT tipo, usuario_id, usuario_nome FROM soroteca_movimento WHERE tipo = 'remocao'`)).toEqual({ tipo: 'remocao', usuario_id: ARM, usuario_nome: 'Pedro Lima' })
    // a mesma posição recebe outro tubo
    const o2 = await pedido('79-00', [exame('e2', BIO)])
    await armazenar([item(o2, 1, ['e2'], est, 1, 1)])
    await como(VER)
    expect(await erro(`SELECT soroteca_remover_tubo($1)`, [a.id])).toMatch(/Sem permissão/)
  })

  it('finalizado não sai pela Entrada; reaberta: antigos seguem travados e os novos podem ser removidos', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    const o2 = await pedido('2-01', [exame('e2', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01', 1, 2)
    const [p1] = await prats(g)
    await como(ARM)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    await guardarLiberada(est, g, p1.id)
    const antigo = (await amostras())[0]
    expect(antigo.finalizada).toBe(true)
    expect(await erro(`SELECT soroteca_remover_tubo($1)`, [antigo.id])).toMatch(/já finalizado: retire pela Consulta/)
    await uma(`SELECT soroteca_estante_abrir($1)`, [est])
    expect(await erro(`SELECT soroteca_remover_tubo($1)`, [antigo.id])).toMatch(/já finalizado: retire pela Consulta/)
    await armazenar([item(o2, 1, ['e2'], est, 1, 2)])
    const novo = (await amostras()).find(x => x.coluna === 2)
    expect(novo.finalizada).toBe(false)
    await remover(novo.id)
    expect((await amostras({ situacao: 'armazenada' })).map(x => x.id)).toEqual([antigo.id])
    // finalizar de novo trava o que estiver na estante
    await armazenar([item(o2, 1, ['e2'], est, 1, 2)])
    await guardarLiberada(est, g, p1.id)
    expect((await amostras()).every(x => x.finalizada)).toBe(true)
  })

  it('retirar tubo finalizado: só quem descarta, motivo da lista e justificativa de 10+ caracteres; devolvido volta à estante aberta', async () => {
    await comDescarte()
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01', 2, 1)
    const [, p2] = await prats(g)
    await como(ARM)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 2, 5)])
    await guardarLiberada(est, g, p2.id)
    const id = (await amostras())[0].id
    expect(await erro(`SELECT soroteca_retirar($1, 'Repetição de exame', 'Refazer a dosagem')`, [id])).toMatch(/Sem permissão/)
    await como(DESC)
    expect(await erro(`SELECT soroteca_retirar($1, 'Repetição de exame', '  curta  ')`, [id])).toMatch(/pelo menos 10 caracteres/)
    expect(await erro(`SELECT soroteca_retirar($1, 'Qualquer', 'Refazer a dosagem')`, [id])).toMatch(/Motivo da retirada inválido/)
    await db.query(`SELECT soroteca_retirar($1, 'Repetição de exame', 'Refazer a dosagem')`, [id])
    const r = (await amostras({ situacao: 'todas' }))[0]
    expect(r).toMatchObject({ status: 'retirada', linha: null, finalizada: false, ultimo_endereco: 'Geladeira 01 > Prateleira 2 > Estante E79002 > B05' })
    expect(await uma(`SELECT motivo, observacao, usuario_id, responsavel_nome FROM soroteca_movimento WHERE tipo = 'retirada'`))
      .toEqual({ motivo: 'Repetição de exame', observacao: 'Refazer a dosagem', usuario_id: DESC, responsavel_nome: 'Dora Descarte' })
    // devolução: bipado de novo entra na estante aberta, sem erro, e o histórico mostra retirada e depois a nova entrada
    await como(ARM)
    await uma(`SELECT soroteca_estante_abrir($1)`, [est])
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    expect((await amostras())[0]).toMatchObject({ status: 'armazenada', linha: 1, coluna: 1, finalizada: false })
    expect(await tipos(id)).toEqual(['entrada', 'retirada', 'entrada'])
  })

  it('descarte nos três tipos grava o usuário logado mesmo se outro nome for enviado; Config. não grava responsável padrão', async () => {
    await comDescarte()
    const o = await pedido('1-01', [exame('e1', BIO, { collectedAt: '2026-01-10T12:00:00.000Z' })])
    const o2 = await pedido('2-01', [exame('e2', BIO, { collectedAt: '2026-01-10T12:00:00.000Z' })])
    const o3 = await pedido('3-01', [exame('e3', BIO, { collectedAt: '2026-01-10T12:00:00.000Z' })])
    await como(ARM)
    const est = await equipamento('E79002')
    const est2 = await equipamento('E79003')
    await armazenar([item(o, 1, ['e1'], est, 1, 1), item(o2, 1, ['e2'], est, 1, 2), item(o3, 1, ['e3'], est2, 1, 1)])
    const [a1, a2] = (await amostras({ equipamento_id: est })).sort((x, y) => x.coluna - y.coluna)
    await como(DESC)
    const lote = (await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', 'Fulano Forjado', NULL, 'lote') r`, [a1.id])).r
    const man = (await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', 'Fulano Forjado', NULL, 'manual') r`, [a2.id])).r
    const porEst = (await uma(`SELECT soroteca_estante_descartar($1, 'Prazo de retenção vencido', 'Fulano Forjado', 'rotina', 'reaproveitar', true) r`, [est2])).r
    for (const d of [lote.descarte_id, man.descarte_id, porEst.descarte_id]) {
      expect(await uma(`SELECT responsavel_nome, usuario_id, usuario_nome FROM soroteca_descarte WHERE id = $1`, [d]))
        .toEqual({ responsavel_nome: 'Dora Descarte', usuario_id: DESC, usuario_nome: 'Dora Descarte' })
      expect((await uma(`SELECT soroteca_descarte_folha($1, NULL) r`, [d])).r.responsavel_nome).toBe('Dora Descarte')
    }
    expect((await rows(`SELECT DISTINCT responsavel_nome FROM soroteca_movimento WHERE tipo = 'descarte'`)).map(x => x.responsavel_nome)).toEqual(['Dora Descarte'])
    expect((await rows(`SELECT responsavel_nome FROM soroteca_estante_movimento WHERE tipo = 'descartada'`))[0].responsavel_nome).toBe('Dora Descarte')
    // Config.: o responsável padrão deixa de ser gravado; registros antigos continuam com o nome que já tinham
    await como(ADM)
    await db.exec(`RESET ROLE`)
    await db.query(`INSERT INTO soroteca_config(company_id, aviso_dias, responsavel_descarte) VALUES($1, 7, 'Nome Antigo')`, [C])
    await db.query(`SELECT soroteca_config_salvar(5, 'Outro Nome', '{}'::jsonb)`)
    expect(await uma(`SELECT aviso_dias, responsavel_descarte FROM soroteca_config WHERE company_id = $1`, [C])).toEqual({ aviso_dias: 5, responsavel_descarte: 'Nome Antigo' })
  })

  it('impressão de etiqueta e folha fica registrada no nome do usuário logado (1ª impressão e reimpressão)', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ARM)
    const est = await equipamento('E79002')
    expect((await uma(`SELECT soroteca_impressao_registrar('etiqueta', $1) r`, [est])).r).toEqual({ reimpressao: false })
    await como(ADM)
    expect((await uma(`SELECT soroteca_impressao_registrar('etiqueta', $1) r`, [est])).r).toEqual({ reimpressao: true })
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    const d = (await uma(`SELECT soroteca_descartar_amostras(ARRAY[(SELECT id FROM soroteca_amostra)], 'Prazo de retenção vencido', NULL, NULL, 'manual') r`)).r.descarte_id
    await uma(`SELECT soroteca_impressao_registrar('folha_descarte', $1)`, [d])
    expect(await rows(`SELECT tipo, alvo_codigo, reimpressao, usuario_id, usuario_nome FROM soroteca_impressao ORDER BY created_at, tipo, reimpressao`)).toEqual([
      { tipo: 'etiqueta', alvo_codigo: 'E79002', reimpressao: false, usuario_id: ARM, usuario_nome: 'Pedro Lima' },
      { tipo: 'etiqueta', alvo_codigo: 'E79002', reimpressao: true, usuario_id: ADM, usuario_nome: 'Admin' },
      { tipo: 'folha_descarte', alvo_codigo: 'manual', reimpressao: false, usuario_id: ADM, usuario_nome: 'Admin' },
    ])
    await como(ADM2)
    await db.exec(`INSERT INTO soroteca_modulo(company_id, ativo) VALUES('${C2}', true)`)
    expect(await erro(`SELECT soroteca_impressao_registrar('etiqueta', $1)`, [est])).toMatch(/não encontrado/)
    await db.exec(`RESET ROLE`)
    expect(await erro(`DELETE FROM soroteca_impressao`)).toMatch(/não pode ser alterada/)
  })
})

describe('Soroteca — rastreabilidade da estante (S06-C)', () => {
  const DESC = '00000000-0000-4000-8000-000000000019'
  const comDescarte = () => db.exec(`
    INSERT INTO profiles VALUES('${DESC}','${C}','biochemist','Dora Descarte');
    INSERT INTO access_profiles VALUES('p_desc2','${C}','{"soroteca":["soroteca.ver","soroteca.descartar","soroteca.armazenar"]}', true, 'Descarte');
    INSERT INTO company_sectors(id, allowed_profile_ids) VALUES('00000000-0000-4000-8000-0000000000f5','{p_desc2}');
    INSERT INTO sector_users VALUES('${DESC}','00000000-0000-4000-8000-0000000000f5');`)
  const rastreio = async (id: string, filtros: object = {}, limite = 50, offset = 0) =>
    (await uma(`SELECT soroteca_estante_rastreio($1, $2::jsonb, $3, $4) r`, [id, JSON.stringify(filtros), limite, offset])).r
  const prat = async (eq: string, ordem = 1) => (await uma(`SELECT id FROM soroteca_prateleira WHERE equipamento_id = $1 AND ordem = $2`, [eq, ordem])).id as string

  it('mostra quem criou a estante e quem colocou, removeu, retirou e devolveu cada tubo, com finalizar, reabrir, descartar, inativar e reativar', async () => {
    await comDescarte()
    const o = await pedido('63-00', [exame('e1', BIO)])
    const o2 = await pedido('64-00', [exame('e2', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01', 2, 2)
    const p2 = await prat(g, 2)
    await como(ARM)
    const est = await equipamento('E00001', 4, 16)
    await uma(`SELECT soroteca_impressao_registrar('etiqueta', $1)`, [est])
    await armazenar([item(o, 1, ['e1'], est, 1, 2)])
    await armazenar([item(o2, 1, ['e2'], est, 1, 3)])
    const [a1, a2] = (await amostras({ equipamento_id: est })).sort((x, y) => x.coluna - y.coluna)
    await uma(`SELECT soroteca_remover_tubo($1)`, [a2.id])
    await guardarLiberada(est, g, p2)
    await como(ADM)
    await uma(`SELECT soroteca_impressao_registrar('etiqueta', $1)`, [est])
    await como(DESC)
    await db.query(`SELECT soroteca_retirar($1, 'Repetição de exame', 'Refazer a dosagem de glicose')`, [a1.id])
    await uma(`SELECT soroteca_estante_abrir($1)`, [est])
    await armazenar([item(o, 1, ['e1'], est, 1, 2)])
    const desc = (await uma(`SELECT soroteca_estante_descartar($1, 'Prazo de retenção vencido', NULL, 'Fim do prazo de guarda', 'reaproveitar', true) r`, [est])).r
    await uma(`SELECT soroteca_estante_descartar($1, 'Estante danificada', NULL, 'Rachadura na base', 'inativar', false)`, [est])
    await db.query(`SELECT soroteca_estante_reativar($1)`, [est])

    await como(VER)
    const r = await rastreio(est)
    expect(r.estante).toMatchObject({ codigo: 'E00001', linhas: 4, colunas: 16, bancada_nome: 'Bioquímica', ativo: true, situacao: 'em_preenchimento', tubos: 0, criada_por: 'Pedro Lima' })
    // do mais novo para o mais antigo, sempre com usuário
    const linha = (e: any) => [e.tipo, e.usuario_nome, e.codigo_amostra ?? null, e.posicao ?? e.de_posicao ?? null]
    expect(r.eventos.map(linha)).toEqual([
      ['reativada', 'Dora Descarte', null, null],
      ['inativada', 'Dora Descarte', null, null],
      ['descartada', 'Dora Descarte', null, null],
      ['tubo_devolvido', 'Dora Descarte', a1.codigo_amostra, 'A02'],
      ['reaberta', 'Dora Descarte', null, null],
      ['tubo_retirado', 'Dora Descarte', a1.codigo_amostra, 'A02'],
      ['etiqueta', 'Admin', null, null],
      ['finalizada', 'Pedro Lima', null, null],
      ['tubo_removido', 'Pedro Lima', a2.codigo_amostra, 'A03'],
      ['tubo_colocado', 'Pedro Lima', a2.codigo_amostra, 'A03'],
      ['tubo_colocado', 'Pedro Lima', a1.codigo_amostra, 'A02'],
      ['etiqueta', 'Pedro Lima', null, null],
      ['criada', 'Pedro Lima', null, null],
    ])
    expect(r.total).toBe(13)
    const ev = (tipo: string) => r.eventos.find((e: any) => e.tipo === tipo)
    expect(ev('tubo_colocado')).toMatchObject({ patient_name: 'Maria Teste' })
    expect(ev('tubo_retirado')).toMatchObject({ motivo: 'Repetição de exame', observacao: 'Refazer a dosagem de glicose', recuperado: false })
    expect(ev('finalizada')).toMatchObject({ equipamento_nome: 'Geladeira 01', prateleira_nome: 'Prateleira 2', tubos: 1 })
    expect(ev('reaberta')).toMatchObject({ equipamento_nome: 'Geladeira 01', prateleira_nome: 'Prateleira 2' })
    expect(ev('descartada')).toMatchObject({ tubos: 1, motivo: 'Prazo de retenção vencido', destino: 'reaproveitar', descarte_id: desc.descarte_id })
    expect(r.eventos.filter((e: any) => e.tipo === 'etiqueta').map((e: any) => e.reimpressao)).toEqual([true, false])
    expect([...r.usuarios].sort()).toEqual(['Admin', 'Dora Descarte', 'Pedro Lima'])
  })

  it('filtra por tipo, usuário e período e pagina de 50 em 50', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ARM)
    const est = await equipamento('E00002', 8, 10)
    for (let i = 0; i < 55; i++) await uma(`SELECT soroteca_impressao_registrar('etiqueta', $1)`, [est])
    await como(ADM)
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    const p1 = await rastreio(est)
    expect(p1.total).toBe(57)
    expect(p1.eventos).toHaveLength(50)
    const p2 = await rastreio(est, {}, 50, 50)
    expect(p2.eventos).toHaveLength(7)
    expect(p2.eventos.at(-1).tipo).toBe('criada')
    expect((await rastreio(est, { tipos: ['tubo_colocado'] })).eventos.map((e: any) => e.usuario_nome)).toEqual(['Admin'])
    expect((await rastreio(est, { usuario: 'Admin' })).total).toBe(1)
    expect((await rastreio(est, { de: '2000-01-01', ate: '2000-12-31' })).total).toBe(0)
  })

  it('estante antiga: criação e saída de tubo recuperadas dos registros que já existiam; outra empresa e quem não vê não acessam', async () => {
    const o = await pedido('5-01', [exame('e1', BIO)])
    await db.exec(`RESET ROLE`)
    const est = (await uma(`INSERT INTO soroteca_equipamento(company_id, nome, tipo, codigo, situacao, linhas, colunas, ativo, created_by, created_at)
      VALUES($1, 'Estante E00009', 'estante', 'E00009', 'em_preenchimento', 2, 8, true, $2, '2026-01-05T10:00:00Z') RETURNING id`, [C, ARM])).id
    await db.query(`INSERT INTO soroteca_prateleira(company_id, equipamento_id, nome, linhas, colunas, ordem) VALUES($1, $2, '', 2, 8, 1)`, [C, est])
    await como(ARM)
    await armazenar([item(o, 1, ['e1'], est, 2, 3)])
    const a = (await amostras())[0]
    await db.exec(`RESET ROLE`)
    // movimento gravado antes desta versão: só o nome da estante, sem a estante de origem
    await db.query(`INSERT INTO soroteca_movimento(company_id, amostra_id, tipo, de_equipamento_nome, de_linha, de_coluna, motivo, usuario_nome)
      VALUES($1, $2, 'retirada', 'Estante E00009', 2, 3, 'Solicitação médica', 'Pedro Lima')`, [C, a.id])
    await como(VER)
    const r = await rastreio(est)
    expect(r.eventos.map((e: any) => [e.tipo, e.recuperado])).toEqual([['tubo_retirado', true], ['tubo_colocado', false], ['criada', true]])
    expect(r.estante).toMatchObject({ criada_por: 'Pedro Lima', criada_em: '2026-01-05T10:00:00+00:00' })
    await como(NADA)
    expect(await erro(`SELECT soroteca_estante_rastreio($1)`, [est])).toMatch(/Sem permissão/)
    await db.exec(`INSERT INTO soroteca_modulo(company_id, ativo) VALUES('${C2}', true)`)
    await como(ADM2)
    expect(await erro(`SELECT soroteca_estante_rastreio($1)`, [est])).toMatch(/Estante não encontrada/)
  })

  it('ninguém edita nem apaga o histórico, nem administrador do banco', async () => {
    await comDescarte()
    const o = await pedido('7-01', [exame('e1', BIO)])
    await como(DESC)
    const est = await equipamento('E00003')
    await uma(`SELECT soroteca_impressao_registrar('etiqueta', $1)`, [est])
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    await uma(`SELECT soroteca_estante_descartar($1, 'Estante danificada', NULL, 'Quebrou a base da estante', 'reaproveitar', true)`, [est])
    await db.exec(`RESET ROLE`)
    for (const t of ['soroteca_movimento', 'soroteca_estante_movimento', 'soroteca_impressao', 'soroteca_descarte', 'soroteca_descarte_item']) {
      expect(await erro(`UPDATE ${t} SET company_id = company_id WHERE company_id = $1`, [C])).toMatch(/não pode ser alterada/)
      expect(await erro(`DELETE FROM ${t} WHERE company_id = $1`, [C])).toMatch(/não pode ser alterada/)
      expect(await erro(`TRUNCATE ${t} CASCADE`)).toMatch(/não pode ser alterada/)
    }
    await db.exec(`SET ROLE authenticated`)
    expect(await erro(`DELETE FROM soroteca_estante_movimento WHERE company_id = '${C}'`)).not.toBe('')
    expect(await erro(`UPDATE soroteca_movimento SET observacao = 'x' WHERE company_id = '${C}'`)).not.toBe('')
    await db.exec(`RESET ROLE`)
    expect(Number((await uma(`SELECT count(*) n FROM soroteca_estante_movimento WHERE estante_id = $1`, [est])).n)).toBe(2)
  })
})

describe('Soroteca — ajustes de descarte e Finalizar (S07)', () => {
  const prats = async (eq: string) => (await rows(`SELECT id FROM soroteca_prateleira WHERE equipamento_id = $1 ORDER BY ordem`, [eq]))
  const DESC = '00000000-0000-4000-8000-000000000017'
  const comDescarte = () => db.exec(`
    INSERT INTO profiles VALUES('${DESC}','${C}','biochemist','Dora Descarte');
    INSERT INTO access_profiles VALUES('p_desc7','${C}','{"soroteca":["soroteca.ver","soroteca.descartar","soroteca.armazenar"]}', true, 'Descarte');
    INSERT INTO company_sectors(id, allowed_profile_ids) VALUES('00000000-0000-4000-8000-0000000000f7','{p_desc7}');
    INSERT INTO sector_users VALUES('${DESC}','00000000-0000-4000-8000-0000000000f7');`)
  const liberar = (o: string, e: string) =>
    db.query(`INSERT INTO lab_exam_results(company_id, order_id, exam_ref, status, released_at) VALUES($1, $2, $3, 'released', now())`, [C, o, `${o}:${e}`])

  it('Finalizar recusa estante com tubo parcial ou em análise; libera quando tudo foi liberado ou o tubo pendente saiu', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', BIO)])
    const o2 = await pedido('2-01', [exame('e3', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01', 1, 2)
    const [p1] = await prats(g)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1', 'e2'], est, 1, 1), item(o2, 1, ['e3'], est, 1, 2)])
    const finalizar = () => erro(`SELECT soroteca_estante_guardar($1, $2, $3)`, [est, g, p1.id])
    expect(await finalizar()).toMatch(/E79002 tem 2 amostra\(s\) com exame pendente/)
    await liberar(o, 'e1') // tubo 1 parcial
    expect(await finalizar()).toMatch(/tem 2 amostra\(s\) com exame pendente/)
    await liberar(o, 'e2') // tubo 1 liberado; tubo 2 em análise
    expect(await finalizar()).toMatch(/tem 1 amostra\(s\) com exame pendente/)
    const pendente = (await amostras({ equipamento_id: est })).find(a => a.coluna === 2)
    await uma(`SELECT soroteca_remover_tubo($1)`, [pendente.id])
    expect(await finalizar()).toBe('')
  })

  it('justificativa de 10+ caracteres obrigatória quando o motivo não é "Prazo de retenção vencido" (estante, lote e manual)', async () => {
    await comDescarte()
    const VELHO = { collectedAt: '2026-01-10T12:00:00.000Z' }
    const o = await pedido('1-01', [exame('e1', BIO, VELHO)])
    const o2 = await pedido('2-01', [exame('e2', BIO, VELHO)])
    await como(DESC)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 1), item(o2, 1, ['e2'], est, 1, 2)])
    const [a1, a2] = (await amostras({ equipamento_id: est })).sort((x, y) => x.coluna - y.coluna)
    for (const tipo of ['lote', 'manual']) {
      expect(await erro(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Amostra danificada', NULL, 'curta', $2)`, [a1.id, tipo])).toMatch(/mínimo 10 caracteres/)
      expect(await erro(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Outro', NULL, NULL, $2)`, [a1.id, tipo])).toMatch(/mínimo 10 caracteres/)
    }
    expect(await erro(`SELECT soroteca_estante_descartar($1, 'Estante danificada', NULL, 'curta', 'reaproveitar', true)`, [est])).toMatch(/mínimo 10 caracteres/)
    expect((await amostras({ situacao: 'armazenada' })).length).toBe(2)
    // prazo vencido: observação opcional
    expect((await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', NULL, NULL, 'lote') r`, [a1.id])).r.tubos).toBe(1)
    expect((await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Amostra danificada', NULL, 'Tubo trincado na centrífuga', 'manual') r`, [a2.id])).r.tubos).toBe(1)
  })

  it('descarte em lote não aceita tubo retirado (em reprocessamento); manual continua aceitando', async () => {
    await comDescarte()
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const g = await geladeira('Geladeira 01', 1, 2)
    const [p1] = await prats(g)
    await como(DESC)
    const est = await equipamento('E79002')
    await armazenar([item(o, 1, ['e1'], est, 1, 1)])
    await guardarLiberada(est, g, p1.id)
    const id = (await amostras())[0].id
    await db.query(`SELECT soroteca_retirar($1, 'Repetição de exame', 'Refazer a dosagem')`, [id])
    expect(await erro(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', NULL, NULL, 'lote')`, [id])).toMatch(/retirado.*não entra no descarte em lote/)
    expect((await amostras({ situacao: 'retirada' })).length).toBe(1)
    expect((await uma(`SELECT soroteca_descartar_amostras(ARRAY[$1]::uuid[], 'Prazo de retenção vencido', NULL, NULL, 'manual') r`, [id])).r.tubos).toBe(1)
  })
})
