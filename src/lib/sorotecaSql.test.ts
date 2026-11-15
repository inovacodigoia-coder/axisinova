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
const equipamento = async (nome: string, linhas = 4, colunas = 5, wb: string | null = BIO) =>
  (await uma(`SELECT soroteca_equipamento_salvar(NULL, $1, 'geladeira', '2-8°C', $2, $3, $4, true) id`, [nome, wb, linhas, colunas])).id as string
const armazenar = (itens: object[]) => uma(`SELECT soroteca_armazenar($1::jsonb) r`, [JSON.stringify(itens)])
const item = (order: string, idx: number, exames: string[], eq: string, linha: number, coluna: number) =>
  ({ order_id: order, tubo_indice: idx, exame_ids: exames, equipamento_id: eq, linha, coluna, tubo_nome: 'Tubo gel' })
const amostras = async (f: object = {}) => (await uma(`SELECT soroteca_amostras($1::jsonb) r`, [JSON.stringify(f)])).r.amostras as any[]

beforeEach(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE companies(id uuid PRIMARY KEY, sequence_id int);
    CREATE TABLE profiles(id uuid PRIMARY KEY, company_id uuid, role text, full_name text);
    CREATE FUNCTION get_user_company_id(u uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT company_id FROM profiles WHERE id=u $$;
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
    const eq = await equipamento('Geladeira 01')
    await como(NADA)
    expect(await erro(`SELECT soroteca_resumo()`)).toMatch(/Sem permissão/)
    await como(VER)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toEqual({ ver: true, armazenar: false, descartar: false, configurar: false })
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/Sem permissão/)
    await como(ARM)
    expect((await uma(`SELECT soroteca_acesso() a`)).a.ver).toBe(true)
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    expect(await erro(`SELECT soroteca_descartar(ARRAY[(SELECT id FROM soroteca_amostra)], 'Validade vencida', 'Pedro')`)).toMatch(/Sem permissão/)
    expect(await erro(`SELECT soroteca_equipamento_salvar(NULL, 'X', 'freezer', NULL, NULL, 2, 2, true)`)).toMatch(/Sem permissão/)
  })

  it('perfis antigos do módulo recebem as permissões equivalentes', async () => {
    const p = await uma(`SELECT permissions->'soroteca' s FROM access_profiles WHERE id='p_old'`)
    expect([...p.s].sort()).toEqual(['soroteca.armazenar', 'soroteca.ver'])
  })

  it('outra empresa não usa equipamento nem pedido alheio', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('Geladeira 01')
    await como(ADM2)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/Pedido não encontrado/)
  })
})

describe('Soroteca — armazenar, mover, retirar e descartar', () => {
  it('validade = coleta + retenção da bancada (Hematologia 3 dias, Bioquímica 7)', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', HEM)])
    await como(ADM)
    const eq = await equipamento('Geladeira 01')
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
    const eq = await equipamento('Geladeira 01')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    expect(new Date((await amostras())[0].validade).toISOString()).toBe('2026-11-25T12:00:00.000Z')
    const cfg = (await uma(`SELECT soroteca_config_ler() c`)).c
    expect(cfg.aviso_dias).toBe(10)
    expect(cfg.bancadas.find((b: any) => b.nome === 'Hematologia').dias).toBe(3)
  })

  it('posição ocupada bloqueia e o lote inteiro volta atrás', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', HEM)])
    await como(ADM)
    const eq = await equipamento('Geladeira 01')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    const msg = await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 2, ['e2'], eq, 2, 1), item(o, 2, ['e2'], eq, 1, 1)])])
    expect(msg).toMatch(/já está ocupada pela amostra 1-01-1-15/)
    expect((await amostras()).length).toBe(1)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 2, ['e2'], eq, 9, 1)])])).toMatch(/fora da grade/)
  })

  it('tubo só de apoio, não coletado ou com exame de outro pedido não entra', async () => {
    const o = await pedido('1-01', [exame('a1', BIO, { bancadaTipo: 'apoio' }), exame('n1', BIO, { collected: false, collectedAt: null }), exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('Geladeira 01')
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
    const eq = await equipamento('Geladeira 01')
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
    const eq = await equipamento('Geladeira 01')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)]) // bipe repetido não duplica
    await armazenar([item(o, 1, ['e1'], eq, 2, 3)])
    const id = (await amostras())[0].id
    expect(await erro(`SELECT soroteca_retirar($1, 'Outro', '')`, [id])).toMatch(/Descreva o motivo/)
    await db.query(`SELECT soroteca_retirar($1, 'Consulta externa', 'Pedido do médico')`, [id])
    expect((await amostras())[0]).toMatchObject({ status: 'retirada', linha: null })
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    const r = (await uma(`SELECT soroteca_rastreio($1) r`, [id])).r
    expect(r.movimentos.map((m: any) => m.tipo)).toEqual(['entrada', 'movimentacao', 'retirada', 'entrada'])
    expect(r.movimentos[1]).toMatchObject({ de_linha: 1, de_coluna: 1, linha: 2, coluna: 3 })
    expect(r.movimentos[2].motivo).toBe('Consulta externa')
    expect(r.coleta.responsavel).toBe('Ana Costa')
  })

  it('descarte pede responsável, libera a posição e a amostra não volta nem é apagada', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('Geladeira 01')
    await armazenar([item(o, 1, ['e1'], eq, 1, 1)])
    const id = (await amostras())[0].id
    expect(await erro(`SELECT soroteca_descartar(ARRAY[$1]::uuid[], 'Validade vencida', '  ')`, [id])).toMatch(/responsável/)
    expect((await uma(`SELECT soroteca_descartar(ARRAY[$1]::uuid[], 'Validade vencida', 'Pedro Lima', 'rotina') n`, [id])).n).toBe(1)
    expect((await amostras({ situacao: 'descartada' }))[0]).toMatchObject({ status: 'descartada', equipamento_id: null })
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/já foi descartada/)
    expect((await uma(`SELECT soroteca_resumo() r`)).r.descartadas_mes).toBe(1)
    await db.exec(`RESET ROLE`)
    expect(await erro(`DELETE FROM soroteca_amostra`)).toMatch(/não pode ser excluída/)
    expect(await erro(`UPDATE soroteca_movimento SET motivo = 'x'`)).toMatch(/não pode ser alterada/)
  })

  it('equipamento não encolhe nem inativa com amostras guardadas', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await equipamento('Geladeira 01')
    await armazenar([item(o, 1, ['e1'], eq, 3, 4)])
    expect(await erro(`SELECT soroteca_equipamento_salvar($1, 'Geladeira 01', 'geladeira', NULL, NULL, 2, 5, true)`, [eq])).toMatch(/fora da nova grade/)
    expect(await erro(`SELECT soroteca_equipamento_salvar($1, 'Geladeira 01', 'geladeira', NULL, NULL, 4, 5, false)`, [eq])).toMatch(/antes de inativar/)
    expect(await erro(`SELECT soroteca_equipamento_salvar(NULL, 'geladeira 01 ', 'geladeira', NULL, NULL, 4, 5, true)`)).toMatch(/Já existe/)
  })
})

describe('Soroteca — prateleiras', () => {
  const gravar = async (id: string | null, prateleiras: object[], nome = 'Geladeira 01') =>
    (await uma(`SELECT soroteca_equipamento_gravar($1, $2, 'geladeira', '2-8°C', $3, $4::jsonb, true) id`, [id, nome, BIO, JSON.stringify(prateleiras)])).id as string
  const prats = async (eq: string) => (await rows(`SELECT id, nome, linhas, colunas, ordem FROM soroteca_prateleira WHERE equipamento_id = $1 ORDER BY ordem`, [eq]))
  const naPrat = (order: string, idx: number, exames: string[], eq: string, prat: string | null, linha: number, coluna: number) =>
    ({ ...item(order, idx, exames, eq, linha, coluna), prateleira_id: prat })

  it('capacidade do equipamento é a soma das prateleiras e A01 existe em cada uma', async () => {
    const o = await pedido('1-01', [exame('e1', BIO), exame('e2', HEM)])
    await como(ADM)
    const eq = await gravar(null, [{ nome: 'Prateleira 1', linhas: 2, colunas: 3 }, { nome: 'Fundo', linhas: 1, colunas: 2 }])
    const [p1, p2] = await prats(eq)
    expect(p2).toMatchObject({ nome: 'Fundo', ordem: 2 })
    const e = (await uma(`SELECT soroteca_resumo() r`)).r.equipamentos[0]
    expect(e.capacidade).toBe(8)
    expect(e.prateleiras.map((p: any) => p.nome)).toEqual(['Prateleira 1', 'Fundo'])
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([item(o, 1, ['e1'], eq, 1, 1)])])).toMatch(/Escolha a prateleira/)
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([naPrat(o, 1, ['e1'], eq, p2.id, 2, 1)])])).toMatch(/fora da grade de Geladeira 01 > Fundo/)
    await armazenar([naPrat(o, 1, ['e1'], eq, p1.id, 1, 1), naPrat(o, 2, ['e2'], eq, p2.id, 1, 1)])
    const l = await amostras()
    expect(l.map(a => a.prateleira_nome).sort()).toEqual(['Fundo', 'Prateleira 1'])
    const r = (await uma(`SELECT soroteca_resumo() r`)).r.equipamentos[0]
    expect(r.prateleiras.map((p: any) => p.ocupadas)).toEqual([1, 1])
  })

  it('mover entre prateleiras fica no histórico com a prateleira de origem e retirada libera', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await gravar(null, [{ nome: 'Prateleira 1', linhas: 2, colunas: 2 }, { nome: 'Prateleira 2', linhas: 2, colunas: 2 }])
    const [p1, p2] = await prats(eq)
    await armazenar([naPrat(o, 1, ['e1'], eq, p1.id, 1, 1)])
    expect(await erro(`SELECT soroteca_armazenar($1::jsonb)`, [JSON.stringify([naPrat(o, 1, ['e1'], eq, p2.id, 1, 1)])])).toBe('')
    const id = (await amostras())[0].id
    await db.query(`SELECT soroteca_retirar($1, 'Consulta externa', '')`, [id])
    expect((await amostras())[0]).toMatchObject({ status: 'retirada', prateleira_id: null })
    const m = (await uma(`SELECT soroteca_rastreio($1) r`, [id])).r.movimentos
    expect(m[0]).toMatchObject({ tipo: 'entrada', prateleira_nome: 'Prateleira 1', linha: 1, coluna: 1 })
    expect(m[1]).toMatchObject({ tipo: 'movimentacao', prateleira_nome: 'Prateleira 2', de_prateleira_nome: 'Prateleira 1' })
    expect(m[2]).toMatchObject({ tipo: 'retirada', de_prateleira_nome: 'Prateleira 2' })
  })

  it('prateleira com amostra não pode ser apagada nem encolher; vazia pode', async () => {
    const o = await pedido('1-01', [exame('e1', BIO)])
    await como(ADM)
    const eq = await gravar(null, [{ nome: 'Prateleira 1', linhas: 3, colunas: 3 }, { nome: 'Prateleira 2', linhas: 2, colunas: 2 }])
    const [p1, p2] = await prats(eq)
    await armazenar([naPrat(o, 1, ['e1'], eq, p1.id, 3, 3)])
    expect(await erro(`SELECT soroteca_equipamento_gravar($1, 'Geladeira 01', 'geladeira', NULL, NULL, $2::jsonb, true)`,
      [eq, JSON.stringify([{ id: p2.id, nome: 'Prateleira 2', linhas: 2, colunas: 2 }])])).toMatch(/Prateleira 1 tem 1 amostra/)
    expect(await erro(`SELECT soroteca_equipamento_gravar($1, 'Geladeira 01', 'geladeira', NULL, NULL, $2::jsonb, true)`,
      [eq, JSON.stringify([{ id: p1.id, nome: 'Prateleira 1', linhas: 2, colunas: 3 }])])).toMatch(/Prateleira 1 tem 1 amostra|fora da nova grade/)
    await gravar(eq, [{ id: p1.id, nome: 'Topo', linhas: 3, colunas: 3 }, { nome: 'Nova', linhas: 1, colunas: 1 }])
    expect((await prats(eq)).map(p => p.nome)).toEqual(['Topo', 'Nova'])
    expect((await amostras())[0].prateleira_nome).toBe('Topo')
    expect(await erro(`SELECT soroteca_equipamento_gravar($1, 'Geladeira 01', 'geladeira', NULL, NULL, $2::jsonb, true)`,
      [eq, JSON.stringify([{ id: p1.id, nome: 'Topo', linhas: 3, colunas: 3 }, { nome: 'topo ', linhas: 1, colunas: 1 }])])).toMatch(/mesmo nome/)
    expect(await erro(`SELECT soroteca_equipamento_gravar($1, 'Geladeira 01', 'geladeira', NULL, NULL, '[]'::jsonb, true)`, [eq])).toMatch(/pelo menos uma prateleira/)
    expect(await erro(`SELECT soroteca_equipamento_salvar($1, 'Geladeira 01', 'geladeira', NULL, NULL, 4, 4, true)`, [eq])).toMatch(/várias prateleiras/)
  })
})

describe('Soroteca — módulo por empresa', () => {
  const TI = '00000000-0000-4000-8000-000000000016'
  const desligar = () => db.exec(`UPDATE soroteca_modulo SET ativo = false WHERE company_id = '${C}'`)

  it('desativado: some para os perfis da empresa, mas TI/Administração e o administrador continuam vendo', async () => {
    await db.exec(`
      INSERT INTO profiles VALUES('${TI}','${C}','biochemist','Tiago TI');
      INSERT INTO access_profiles VALUES('p_ti','${C}','{"soroteca":["soroteca.ver"]}', true, 'TI – Administração');
      INSERT INTO company_sectors(id, allowed_profile_ids) VALUES('00000000-0000-4000-8000-0000000000f3','{p_ti}');
      INSERT INTO sector_users VALUES('${TI}','00000000-0000-4000-8000-0000000000f3');`)
    await desligar()
    await como(VER)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: false, modulo_ativo: false, pode_ativar: false })
    expect(await erro(`SELECT soroteca_resumo()`)).toMatch(/Sem permissão/)
    await como(ARM)
    expect((await uma(`SELECT soroteca_acesso() a`)).a.armazenar).toBe(false)
    await como(TI)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: true, pode_ativar: true, modulo_ativo: false })
    await como(ADM)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: true, pode_ativar: true })
  })

  it('só TI/Administração ativa ou desativa, e vale só para a própria empresa', async () => {
    await desligar()
    await como(ARM)
    expect(await erro(`SELECT soroteca_modulo_definir(true)`)).toMatch(/Só TI\/Administração/)
    await como(ADM)
    await db.query(`SELECT soroteca_modulo_definir(true)`)
    await como(VER)
    expect((await uma(`SELECT soroteca_acesso() a`)).a).toMatchObject({ ver: true, modulo_ativo: true })
    await como(ADM2)
    expect((await uma(`SELECT soroteca_modulo_ativo() a`)).a).toBe(false)
  })
})
