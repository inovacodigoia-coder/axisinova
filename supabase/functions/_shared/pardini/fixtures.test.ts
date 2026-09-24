// Testes do conector Pardini com respostas reais gravadas (sem chamar o Pardini).
// Rodar: deno test --node-modules-dir=none -A supabase/functions/_shared/pardini/fixtures.test.ts
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { contarTag, conteudoUtil, decodificar } from './xml.ts'
import { importar, parseResultados } from './resultado.ts'
import { parseAdmitido, parseListaErro, parsePendencias, parseRastreabilidade } from './parsers.ts'

const dir = new URL('./fixtures/', import.meta.url)
const ler = (n: string) => decodificar(Deno.readFileSync(new URL(n, dir)))

Deno.test('fixture_resultado_reduzido: 3 pedidos, acentos, 2.500 = 2500, hemograma completo, referência do cromo', () => {
  const util = conteudoUtil(ler('fixture_resultado_reduzido.xml'))
  const peds = parseResultados(util)
  assertEquals(peds.length, 3)
  assertEquals(contarTag(util, 'Pedido'), 3)
  const micro = peds[0].supers[0]
  assertEquals(micro.exameNome, 'MICROALBUMINÚRIA')
  assert(!/Ã[\x80-\xBF©¡³ª§š‰‡]/.test(util), 'acentos quebrados')
  assert(util.includes('IMUNOFIXAÇÃO') && util.includes('MANGANÊS'))
  assertEquals(micro.conteudo.inf_adicional, ['VOLUME URINÁRIO: 2500 mL'])
  assertEquals(micro.conteudo.analitos[0].valor, '12')
  const hg = peds[1].supers.find((s) => s.codExmApoio === 'S|HG|1')!
  assertEquals(new Set(hg.conteudo.analitos.map((a) => a.nome)).size, 21)
  assertEquals(hg.conteudo.analitos.length, 33) // 9 itens simples + 12 com % e /mm3
  const v = (nome: string, un: string) => hg.conteudo.analitos.find((a) => a.nome === nome && a.unidade === un)!.valor
  assertEquals(v('Hemacias', '/mm3'), '3610000')
  assertEquals(v('Hemoglobina', 'g/dl'), '10.3')
  assertEquals(v('Plaquetas', '/mm3'), '265000')
  assertEquals(v('Linfocitos Atipicos', '%'), '')
  const cromo = peds[2].supers.find((s) => s.codExmApoio === 'S|CROMO|3')!
  assertEquals(cromo.conteudo.referencia_texto, 'VALOR DE REFERÊNCIA: ATÉ 3,4 mcg/L')
  assertEquals(cromo.conteudo.analitos[0].valor, 'INFERIOR A 0,5 mcg/L')
  assertEquals(peds[2].supers.length, 4)
})

Deno.test('resposta dividida em vários CDATA (]]]]><![CDATA[>) não perde pedidos', () => {
  const env = ler('fixture_resultado_reduzido.xml')
  const i = env.indexOf('<![CDATA[') + 9, f = env.lastIndexOf(']]>')
  const dividido = env.slice(0, i) + env.slice(i, f).replace(/<Nota>/g, '<Nota><![CDATA[x]]]]><![CDATA[>').replace(/<\/Nota>/g, '</Nota>') + env.slice(f)
  assertEquals(parseResultados(conteudoUtil(dividido)).length, 3)
})

// Banco em memória, só o necessário para `importar`
function bancoFalso(t: Record<string, any[]>) {
  const rpc: any[] = []
  const from = (tab: string) => {
    let rows = () => (t[tab] ??= [])
    const f: ((r: any) => boolean)[] = []
    let op: 'select' | 'update' | 'insert' = 'select', patch: any = null
    const q: any = {
      select: () => q, order: () => q, limit: () => q,
      eq: (c: string, v: any) => (f.push((r) => r[c] === v), q),
      not: (c: string, _o: string, v: string) => { const l = v.replace(/[()]/g, '').split(','); f.push((r) => !l.includes(r[c])); return q },
      update: (p: any) => (op = 'update', patch = p, q),
      insert: (p: any) => { rows().push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...p }); return Promise.resolve({ error: null }) },
      run: () => { const l = rows().filter((r) => f.every((g) => g(r))); if (op === 'update') l.forEach((r) => Object.assign(r, patch)); return l },
      maybeSingle: () => Promise.resolve({ data: q.run()[0] ?? null }),
      single: () => Promise.resolve({ data: q.run()[0] ?? null }),
      then: (ok: any) => ok({ data: q.run(), error: null }),
    }
    return q
  }
  return { admin: { from, rpc: (n: string, a: any) => { rpc.push({ n, ...a }); return Promise.resolve({ data: true }) } }, rpc }
}

Deno.test('fixture_resultado_RETIFICADO_derivado: anterior vira substituído, valor 14, exame volta à validação', async () => {
  const pe = { id: 'pe1', company_id: 'c1', apoio_id: 'lab1', exame_id: 'ex1', codigo_apoio: 'U-24|M-ALB', sequencial: 1, cod_ped_apoio: 'B0T2MA2', status: 'liberado_local' }
  const t: Record<string, any[]> = {
    apoio_pedido_exame: [pe],
    apoio_depara_exame: [{ id: 'dp1', apoio_id: 'lab1', exame_id: 'ex1', ativo: true, codigo_formato: '8392' }],
    apoio_depara_analito: [{ depara_exame_id: 'dp1', codigo_formato: '8392', chave_analito: '1/1/1/1', parametro_id: 'par1', ignorar: false }],
    apoio_resultado_versao: [],
  }
  const { admin, rpc } = bancoFalso(t)
  const ctx: any = { admin, lab: { id: 'lab1', company_id: 'c1' }, senha: '' }
  pe.status = 'transmitido'
  await importar(ctx, parseResultados(conteudoUtil(ler('fixture_resultado_reduzido.xml'))))
  pe.status = 'liberado_local'
  const r = await importar(ctx, parseResultados(conteudoUtil(ler('fixture_resultado_RETIFICADO_derivado.xml'))))
  assertEquals(r.novos, 1)
  const vs = t.apoio_resultado_versao
  assertEquals(vs.length, 2)
  assertEquals(vs[0].situacao, 'substituido')
  assertEquals(vs[1].retificacao, 'S')
  assertEquals(vs[1].conteudo.analitos[0].valor, '14')
  assertEquals(vs[1].situacao, 'importado')
  // Exame liberado + retificação: a volta para a Validação é do gatilho apoio_resultado_retificado_trg
  // (dispara no insert com retificacao='S'); o importador não força status por cima de liberado_local.
  assert(!rpc.some((x) => x.n === 'apoio_integ_status' && x._motivo === 'Resultado retificado recebido'))
})

for (const f of ['envio_resposta.xml', 'consulta_lote_resposta.xml']) {
  Deno.test(`${f}: CodPedApoio B0U2FK8, 1 recipiente, 222728429601, EPL começando com N`, () => {
    const a = parseAdmitido(conteudoUtil(ler(f)))!
    assertEquals(a.codLoteApoio, '183701')
    assertEquals(a.pedidos.length, 1)
    assertEquals(a.pedidos[0].codPedApoio, 'B0U2FK8')
    assertEquals(a.pedidos[0].recipientes.length, 1)
    const r = a.pedidos[0].recipientes[0]
    assertEquals(r.codBarApoio, '222728429601')
    assert(r.etiquetaEpl.startsWith('N\n'), JSON.stringify(r.etiquetaEpl.slice(0, 10)))
    assert(r.etiquetaEpl.includes('P1'))
    assertEquals(r.exames, [{ codExmApoio: 'S|U|1', codExmLab: 'URE' }])
  })
}

Deno.test('getPendenciaTecnica: nenhuma pendência criada', () => {
  assertEquals(parsePendencias(ler('getPendenciaTecnica.xml')), [])
})

Deno.test('fixture_rastreabilidade_reduzida: status 42/85/101/140 e exames por exame', () => {
  const mapa: Record<string, string> = { '42': 'transmitido', '85': 'em_analise', '101': 'em_analise', '140': 'liberado_apoio' }
  const am = parseRastreabilidade(ler('fixture_rastreabilidade_reduzida.xml'))
  assertEquals(am.length, 6)
  assertEquals(am.slice(0, 4).map((a) => mapa[a.codStatus]), ['transmitido', 'transmitido', 'em_analise', 'em_analise'])
  assertEquals(am[1].etqCodBar, '222615416902')
  assertEquals(am[4].codStatus, '')
  assertEquals(am[4].exames, [{ codExm: 'U-24|M-ALB|1', codStatus: '140', descricao: 'Resultado Liberado', quando: '2026-09-17T16:52:10Z' }])
  assertEquals(mapa[am[5].exames[0].codStatus], 'liberado_apoio')
  assertEquals(am[5].exames[0].codExm, 'S|CARIOG|4')
})

Deno.test('fixture_lista_erros_reduzida: 9 erros, href resolvido, categorias', () => {
  const e = parseListaErro(ler('fixture_lista_erros_reduzida.xml'))
  assertEquals(e.length, 9)
  const cat = Object.fromEntries(e.map((x) => [x.codigo, x.categoria]))
  assertEquals([cat['10023'], cat['10217']], ['duplicidade', 'duplicidade'])
  assertEquals([cat['10035'], cat['10213'], cat['10214']], ['comercial', 'comercial', 'comercial'])
  assertEquals(e.find((x) => x.codigo === '10151')!.mensagem, 'Não foram informadas nem a Idade nem a Data de Nascimento do paciente.')
})

Deno.test('modelo: chave igual à do resultado, nome, unidade e tamanho', async () => {
  const { parseModelos } = await import('./parsers.ts')
  const xml = await Deno.readTextFile(new URL('./fixtures/fixture_resultado_reduzido.xml', import.meta.url))
  const ms = parseModelos(xml)
  const hg = ms.find((m) => m.codExmApoio === 'S|HG|1')!
  if (!hg || hg.itens[0].chave !== '1/1/1/1' || hg.itens[0].nome !== 'Hemacias' || hg.itens[0].unidade !== '/mm3' || hg.itens[0].tamanho !== 10) throw new Error(JSON.stringify(hg?.itens[0]))
  if (new Set(hg.itens.map((i) => i.chave)).size !== hg.itens.length || hg.itens.length < 10) throw new Error('chaves repetidas')
  const mic = ms.find((m) => m.codExmApoio === 'U-24|M-ALB|1')!
  if (mic.itens.length !== 1 || mic.itens[0].unidade !== 'mg/24 h') throw new Error(JSON.stringify(mic.itens)) // InfAdicional não entra
})
