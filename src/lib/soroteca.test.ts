import { describe, expect, it } from 'vitest'
import { buildSampleCode, generateSampleHash } from '@/utils/orderHash'
import {
  alertaValidade, bloqueioDoTubo, capacidadePrateleiras, enderecoAmostra, enderecoPosicao, erroPrateleiras, letraLinha, linhaDoTempo, prioridadeDescarte, primeiraLivre, rotuloPosicao, statusResultado,
  sugerirPosicao, tubosDoPedido, type AmostraSoroteca, type EquipamentoSoroteca, type PedidoLocalizado, type RastreioSoroteca,
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

  it('sugestão vai para o equipamento da bancada do tubo e pula reservas do lote', () => {
    const guardada = { status: 'armazenada', equipamento_id: 'bio', prateleira_id: 'bio-p1', linha: 1, coluna: 1 } as AmostraSoroteca
    const eqs = [eq('hem', 'HEM'), eq('bio', 'BIO')]
    expect(sugerirPosicao(eqs, [guardada], 'BIO')).toEqual({ equipamento_id: 'bio', prateleira_id: 'bio-p1', linha: 1, coluna: 2 })
    expect(sugerirPosicao(eqs, [guardada], 'BIO', [{ equipamento_id: 'bio', prateleira_id: 'bio-p1', linha: 1, coluna: 2 }]))
      .toEqual({ equipamento_id: 'hem', prateleira_id: 'hem-p1', linha: 1, coluna: 1 })
  })

  it('com a 1ª prateleira cheia, sugere A01 da próxima prateleira (na ordem cadastrada)', () => {
    const e = eq('g', 'BIO', [prat('p2', 2), prat('p1', 1, 1, 1)])
    const cheia = { status: 'armazenada', equipamento_id: 'g', prateleira_id: 'p1', linha: 1, coluna: 1 } as AmostraSoroteca
    expect(sugerirPosicao([e], [cheia], 'BIO')).toEqual({ equipamento_id: 'g', prateleira_id: 'p2', linha: 1, coluna: 1 })
  })

  it('endereço completo: Equipamento > Prateleira > posição', () => {
    expect(enderecoPosicao('Geladeira 01', 'Prateleira 2', 2, 5)).toBe('Geladeira 01 > Prateleira 2 > B05')
    expect(enderecoPosicao('Geladeira 01', null, 1, 1)).toBe('Geladeira 01 > A01')
    expect(enderecoAmostra({ status: 'retirada', equipamento_nome: null, prateleira_nome: null, linha: null, coluna: null })).toBeNull()
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
