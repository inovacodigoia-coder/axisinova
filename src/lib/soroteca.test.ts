import { describe, expect, it } from 'vitest'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'
import {
  alertaValidade, bloqueioDoTubo, capacidadePrateleiras, enderecoAmostra, enderecoPosicao, erroPrateleiras, letraLinha, linhaDoTempo, prioridadeDescarte, primeiraLivre, rotuloPosicao, statusResultado,
  erroCodigoEstante, estanteDoCodigo, estantesNaPrateleira, proximaPosicaoEstante, sugerirCodigoEstante, tubosDoPedido, type AmostraSoroteca, type EquipamentoSoroteca, type PedidoLocalizado, type RastreioSoroteca,
} from './soroteca'

const AGORA = new Date('2026-11-15T12:00:00Z').getTime()
const h = (horas: number) => new Date(AGORA + horas * 3_600_000).toISOString()

describe('posições da grade', () => {
  it('linhas A…Z e depois AA…AZ; coluna com dois dígitos', () => {
    expect(letraLinha(1)).toBe('A')
    expect(letraLinha(26)).toBe('Z')
    expect(letraLinha(27)).toBe('AA')
    expect(rotuloPosicao(1, 5)).toBe('A05')
    expect(rotuloPosicao(2, 16)).toBe('B16')
  })

  it('primeira posição livre segue linha por linha', () => {
    expect(primeiraLivre(2, 3, new Set(['1:1', '1:2']))).toEqual({ linha: 1, coluna: 3 })
    expect(primeiraLivre(2, 2, new Set(['1:1', '1:2', '2:1', '2:2']))).toBeNull()
  })

  const prat = (id: string, ordem: number, linhas = 1, colunas = 2) => ({ id, nome: `Prateleira ${ordem}`, linhas, colunas, ordem, ocupadas: 0 })
  const eq = (id: string, wb: string | null, prateleiras = [prat(`${id}-p1`, 1)]): EquipamentoSoroteca =>
    ({ id, nome: id, tipo: 'geladeira', temperatura: null, workbench_id: wb, bancada_nome: null, ativo: true, ocupadas: 0, capacidade: 0, prateleiras })

  it('estante: próxima posição livre A01 → A02 … e nenhuma quando cheia', () => {
    const est = eq('E79002', null, [prat('g1', 1, 2, 2)])
    const a = (linha: number, coluna: number) => ({ status: 'armazenada', prateleira_id: 'g1', linha, coluna }) as AmostraSoroteca
    expect(proximaPosicaoEstante(est, [])).toEqual({ prateleira_id: 'g1', linha: 1, coluna: 1 })
    expect(proximaPosicaoEstante(est, [a(1, 1)], [{ linha: 1, coluna: 2 }])).toEqual({ prateleira_id: 'g1', linha: 2, coluna: 1 })
    expect(proximaPosicaoEstante(est, [a(1, 1), a(1, 2), a(2, 1), a(2, 2)])).toBeNull()
  })

  it('código da estante: sugere E + 5 dígitos depois do maior e recusa o que parece etiqueta de tubo', () => {
    expect(sugerirCodigoEstante([])).toBe('E00001')
    expect(sugerirCodigoEstante([{ codigo: 'E79002' }, { codigo: 'X1' }, { codigo: 'e00010' }])).toBe('E79003')
    expect(erroCodigoEstante('E79002')).toBeNull()
    expect(erroCodigoEstante('E 1')).toMatch(/de 2 a 30/)
    expect(erroCodigoEstante('ABCDEFGH1')).toMatch(/etiqueta de um tubo/)
  })

  it('bipe acha a estante pelo código (sem diferenciar maiúsculas) e lista as guardadas na prateleira', () => {
    const e1 = { ...eq('a', null), tipo: 'estante', codigo: 'E79002', situacao: 'armazenada', local_prateleira_id: 'p9' } as EquipamentoSoroteca
    const e2 = { ...eq('b', null), tipo: 'estante', codigo: 'E79001', situacao: 'armazenada', local_prateleira_id: 'p9' } as EquipamentoSoroteca
    const e3 = { ...eq('c', null), tipo: 'estante', codigo: 'E79003', situacao: 'em_preenchimento', local_prateleira_id: null } as EquipamentoSoroteca
    expect(estanteDoCodigo([e1, e2, e3], ' e79002 ')?.id).toBe('a')
    expect(estanteDoCodigo([eq('geladeira', null)], 'geladeira')).toBeNull()
    expect(estantesNaPrateleira([e1, e2, e3], 'p9').map(e => e.codigo)).toEqual(['E79001', 'E79002'])
  })

  it('endereço completo: Equipamento > Prateleira > posição', () => {
    expect(enderecoPosicao('Geladeira 01', 'Prateleira 2', 2, 5)).toBe('Geladeira 01 > Prateleira 2 > B05')
    expect(enderecoPosicao('Geladeira 01', null, 1, 1)).toBe('Geladeira 01 > A01')
    expect(enderecoAmostra({ status: 'retirada', equipamento_nome: null, prateleira_nome: null, linha: null, coluna: null })).toBeNull()
    expect(enderecoAmostra({ status: 'armazenada', equipamento_nome: 'Estante E79002', prateleira_nome: '', linha: 2, coluna: 5,
      local_nome: 'Geladeira 01', local_prateleira_nome: 'Prateleira 2' })).toBe('Geladeira 01 > Prateleira 2 > Estante E79002 > B05')
    expect(enderecoAmostra({ status: 'armazenada', equipamento_nome: 'Estante E79002', prateleira_nome: '', linha: 1, coluna: 1 })).toBe('Estante E79002 > A01')
  })

  it('capacidade é a soma das prateleiras; nomes repetidos e grades inválidas são recusados', () => {
    expect(capacidadePrateleiras([{ linhas: 10, colunas: 16 }, { linhas: 2, colunas: 5 }])).toBe(170)
    expect(erroPrateleiras([{ nome: 'Prateleira 1', linhas: 10, colunas: 16 }])).toBeNull()
    expect(erroPrateleiras([])).toMatch(/pelo menos uma/)
    expect(erroPrateleiras([{ nome: 'Fundo', linhas: 2, colunas: 2 }, { nome: ' fundo', linhas: 1, colunas: 1 }])).toMatch(/mesmo nome/)
    expect(erroPrateleiras([{ nome: 'Topo', linhas: 53, colunas: 2 }])).toMatch(/entre 1 e 52/)
    expect(erroPrateleiras([{ nome: 'Topo', linhas: 2, colunas: 100 }])).toMatch(/entre 1 e 99/)
  })
})

describe('cores e prazos', () => {
  it('azul só com todos liberados, amarelo parcial, vermelho nenhum', () => {
    expect(statusResultado(3, 3)).toBe('liberado')
    expect(statusResultado(3, 1)).toBe('parcial')
    expect(statusResultado(3, 0)).toBe('em_analise')
    expect(statusResultado(0, 0)).toBe('em_analise')
  })

  it('descarte: urgente vencida há mais de 24 h, atenção até 7 dias, planejado 8–30 dias', () => {
    expect(prioridadeDescarte(h(-25), 7, AGORA)).toBe('urgente')
    expect(prioridadeDescarte(h(-23), 7, AGORA)).toBe('atencao')
    expect(prioridadeDescarte(h(7 * 24), 7, AGORA)).toBe('atencao')
    expect(prioridadeDescarte(h(8 * 24), 7, AGORA)).toBe('planejado')
    expect(prioridadeDescarte(h(30 * 24), 7, AGORA)).toBe('planejado')
    expect(prioridadeDescarte(h(31 * 24), 7, AGORA)).toBeNull()
  })

  it('validade vermelha se vencida, laranja se vence dentro do aviso', () => {
    expect(alertaValidade(h(-1), 7, AGORA)).toBe('vencida')
    expect(alertaValidade(h(6 * 24), 7, AGORA)).toBe('vencendo')
    expect(alertaValidade(h(8 * 24), 7, AGORA)).toBeNull()
  })
})

describe('tubos do pedido', () => {
  const pedido = (exams: any[], resultados: Record<string, string> = {}): PedidoLocalizado => ({
    order_id: 'o1', protocolo: '322-01', empresa_seq: 15, patient_id: null, patient_name: 'Maria', patient_birth: null, is_urgent: false,
    created_at: h(-10), lab_guides: [{ id: 'g', exams }], tubo_indice: null, resultados, guardados: [],
  })
  const ex = (id: string, material: string, extra: object = {}) =>
    ({ id, name: `Exame ${id}`, material, bancadaId: 'BIO', bancadaNome: 'Bioquímica', bancadaTipo: 'interna', collected: true, collectedAt: h(-2), ...extra })

  it('código e código de barras iguais aos da etiqueta, status sem os exames de apoio', () => {
    const tubos = tubosDoPedido(pedido([ex('e1', 'Soro'), ex('e2', 'Soro', { bancadaTipo: 'apoio' }), ex('e3', 'Sangue total EDTA')], { e1: 'released' }), AGORA)
    expect(tubos.map(t => t.codigo)).toEqual([buildSampleCode('322-01', 1, 15), buildSampleCode('322-01', 2, 15)])
    const gel = tubos.find(t => t.exameIds.includes('e1'))!
    expect(gel.hash).toBe(generateSampleHash(gel.codigo))
    expect(gel.temApoio).toBe(true)
    expect(gel.total).toBe(1)
    expect(gel.status).toBe('liberado')
  })

  it('cartão do tubo: exames internos com liberado/pendente e bancadas sem repetir', () => {
    const [t] = tubosDoPedido(pedido([ex('e1', 'Soro'), ex('e4', 'Soro', { bancadaNome: 'Imunologia' }), ex('e5', 'Soro'), ex('e2', 'Soro', { bancadaTipo: 'apoio' })],
      { e1: 'released', e5: 'cancelled' }), AGORA)
    expect(t.exames).toEqual([{ id: 'e1', nome: 'Exame e1', liberado: true }, { id: 'e4', nome: 'Exame e4', liberado: false }])
    expect(t.bancadas).toEqual(['Bioquímica', 'Imunologia'])
  })

  it('tubo só de apoio ou não coletado não pode ser guardado', () => {
    const [apoio] = tubosDoPedido(pedido([ex('a1', 'Soro', { bancadaTipo: 'apoio' })]), AGORA)
    expect(bloqueioDoTubo(apoio)).toMatch(/apoio/)
    const [futuro] = tubosDoPedido(pedido([ex('f1', 'Soro', { collectedAt: h(24) })]), AGORA)
    expect(bloqueioDoTubo(futuro)).toMatch(/não coletado/)
  })
})

describe('linha do tempo', () => {
  it('ordena por data e mostra o status a cada liberação', () => {
    const r = {
      amostra: {} as any,
      coleta: { quando: h(-10), responsavel: 'Ana Costa' },
      exames: [
        { exam_id: 'a', nome: 'Glicose', status: 'released', liberado_em: h(-6), liberado_por: null },
        { exam_id: 'b', nome: 'Colesterol', status: 'released', liberado_em: h(-4), liberado_por: null },
        { exam_id: 'c', nome: 'LDL', status: 'pending', liberado_em: null, liberado_por: null },
      ],
      movimentos: [
        { tipo: 'entrada', quando: h(-9), equipamento_nome: 'Geladeira 01', prateleira_nome: 'Prateleira 2', linha: 2, coluna: 7, status_resultado: 'em_analise', usuario_nome: 'Pedro Lima' },
        { tipo: 'retirada', quando: h(-2), de_equipamento_nome: 'Geladeira 01', de_linha: 2, de_coluna: 7, motivo: 'Consulta externa', usuario_nome: 'Maria' },
      ],
      laboratorio: null,
    } as unknown as RastreioSoroteca
    const ev = linhaDoTempo(r)
    expect(ev.map(e => e.tipo)).toEqual(['coleta', 'entrada', 'liberacao', 'liberacao', 'consulta'])
    expect(ev[1].titulo).toBe('Armazenada em Geladeira 01 > Prateleira 2 > B07')
    expect(ev[2].linhas[0]).toBe('Status: Parcial (1 de 3 exames liberados)')
    expect(ev[3].linhas[0]).toBe('Status: Parcial (2 de 3 exames liberados)')
  })
})

describe('descarte de estante', () => {
  it('situação: vencida só com todos vencidos; vencendo se algum venceu ou vence no aviso; vazia sem tubos', async () => {
    const { situacaoDescarteEstante } = await import('./soroteca')
    expect(situacaoDescarteEstante({ tubos: 3, vencidos: 3, vencendo: 0 })).toBe('vencida')
    expect(situacaoDescarteEstante({ tubos: 3, vencidos: 1, vencendo: 0 })).toBe('vencendo')
    expect(situacaoDescarteEstante({ tubos: 3, vencidos: 0, vencendo: 1 })).toBe('vencendo')
    expect(situacaoDescarteEstante({ tubos: 3, vencidos: 0, vencendo: 0 })).toBe('no_prazo')
    expect(situacaoDescarteEstante({ tubos: 0, vencidos: 0, vencendo: 0 })).toBe('vazia')
  })

  it('tubo pede "Descartar mesmo assim" com exame pendente, sem prazo ou dentro do prazo', async () => {
    const { riscoDescarteTubo } = await import('./soroteca')
    expect(riscoDescarteTubo({ validade: h(-1), pendentes: [] }, AGORA)).toEqual([])
    expect(riscoDescarteTubo({ validade: h(-1), pendentes: ['Glicose', 'Ureia'] }, AGORA)).toEqual(['exame pendente: Glicose, Ureia'])
    expect(riscoDescarteTubo({ validade: null, pendentes: [] }, AGORA)).toEqual(['sem prazo de retenção'])
    expect(riscoDescarteTubo({ validade: '2026-11-20T12:00:00Z', pendentes: [] }, AGORA)).toEqual(['dentro do prazo (até 20/11/2026)'])
  })

  it('consulta mostra o último endereço do tubo descartado', async () => {
    const { localizacaoTexto } = await import('./soroteca')
    const base = { equipamento_nome: null, prateleira_nome: null, linha: null, coluna: null }
    expect(localizacaoTexto({ ...base, status: 'descartada', ultimo_endereco: 'Geladeira 01 > Prateleira 2 > Estante E79002 > B05' }))
      .toBe('Descartada · estava em Geladeira 01 > Prateleira 2 > Estante E79002 > B05')
    expect(localizacaoTexto({ ...base, status: 'retirada', ultimo_endereco: null })).toBe('Retirada')
  })
})

describe('mensagens de erro da Soroteca', () => {
  it('mensagem crua do banco nunca aparece; a mensagem própria em português passa', async () => {
    const { mensagemErro } = await import('@/hooks/useSoroteca')
    expect(mensagemErro({ message: 'DELETE requires a WHERE clause', code: '21000' })).not.toMatch(/WHERE/)
    expect(mensagemErro({ message: 'DELETE requires a WHERE clause' })).not.toMatch(/WHERE/)
    expect(mensagemErro({ message: 'A estante E79002 está cheia', code: 'P0001' })).toBe('A estante E79002 está cheia')
    expect(mensagemErro({ message: 'Amostra não encontrada', code: 'P0002' })).toBe('Amostra não encontrada')
    expect(mensagemErro({ message: 'duplicate key value violates unique constraint', code: '23505' })).toBe('Essa posição acabou de ser ocupada. Bipe de novo.')
  })
})
