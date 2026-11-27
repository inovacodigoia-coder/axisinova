import { describe, expect, it } from 'vitest'
import {
  achatarExamesAnalise,
  dataEstaNoPeriodo,
  filtrarPendenciasAnalise,
  filtrarExamesDigitacao,
  formatarAtrasoReal,
  horasAtrasoReal,
  pendenciasDeDiasAnteriores,
  pendenciasPorDia,
  type ExameFilaAnalise,
} from './pendenciasAnalise'

const agora = new Date(2026, 10, 26, 13, 0, 0)
const exame = (partial: Partial<ExameFilaAnalise>): ExameFilaAnalise => ({
  id: partial.orderId || 'pedido-1',
  examId: 'e1',
  orderId: 'pedido-1',
  protocol: '1-01',
  registeredAt: '2026-11-26T13:00:00.000Z',
  status: 'pending',
  orderStatus: 'in_analysis',
  ...partial,
})

describe('período da Digitação de Resultados', () => {
  it('ao abrir a digitação em 27/11/2026 exclui pacientes de 24/11, mesmo pendentes ou liberados', () => {
    const hoje = new Date(2026, 10, 27, 13, 27);
    const exams = [
      exame({ id: 'hoje', registeredAt: '2026-11-27T12:00:00Z' }),
      exame({ id: 'antigo', registeredAt: '2026-11-24T12:00:00Z' }),
      exame({ id: 'liberado-antigo', registeredAt: '2026-11-24T12:00:00Z', status: 'released' }),
      exame({ id: 'ontem', registeredAt: '2026-11-26T12:00:00Z' }),
    ];
    expect(filtrarExamesDigitacao(exams, { period: 'hoje' }, hoje).map(e => e.id)).toEqual(['hoje']);
  });

  it('coleta ou atualização de hoje não transforma atendimento de 24/11 em atendimento de hoje', () => {
    const item = exame({ registeredAt: '2026-11-24T12:00:00Z', collectedAt: '2026-11-27T12:00:00Z', updatedAt: '2026-11-27T12:00:00Z' });
    expect(filtrarExamesDigitacao([item], { period: 'hoje' }, new Date(2026, 10, 27, 13))).toEqual([]);
  });

  it('trocar de período para Hoje remove também os pacientes antigos já recebidos pelo modal', () => {
    const exams = [exame({ id: '24', registeredAt: '2026-11-24' }), exame({ id: '27', registeredAt: '2026-11-27' })];
    const hoje = new Date(2026, 10, 27, 13);
    const anteriores = filtrarExamesDigitacao(exams, { period: '7d' }, hoje);
    expect(anteriores.map(e => e.id)).toEqual(['24', '27']);
    expect(filtrarExamesDigitacao(anteriores, { period: 'hoje' }, hoje).map(e => e.id)).toEqual(['27']);
  });

  it('mantém o intervalo personalizado na janela de digitação', () => {
    const exams = [exame({ id: '24', registeredAt: '2026-11-24' }), exame({ id: '27', registeredAt: '2026-11-27' })];
    expect(filtrarExamesDigitacao(exams, { period: 'custom', dateFrom: new Date(2026, 10, 24), dateTo: new Date(2026, 10, 24) }).map(e => e.id)).toEqual(['24']);
  });

  it('preserva acesso explícito às pendências anteriores e busca direta sem misturar na fila Hoje', () => {
    const exams = [exame({ registeredAt: '2026-11-24' })];
    expect(filtrarExamesDigitacao(exams, { period: 'Pendências anteriores', ignorarPeriodo: true })).toEqual(exams);
    expect(filtrarExamesDigitacao(exams, { period: 'hoje', ignorarPeriodo: true })).toEqual(exams);
  });

  it('Hoje inclui somente exames do dia, inclusive quando ainda estão pendentes', () => {
    expect(dataEstaNoPeriodo('2026-11-26T03:00:00.000Z', 'hoje', undefined, undefined, agora)).toBe(true)
    expect(dataEstaNoPeriodo('2026-11-25T23:59:00.000Z', 'hoje', undefined, undefined, agora)).toBe(false)
  })

  it('os demais períodos continuam incluindo as datas correspondentes', () => {
    expect(dataEstaNoPeriodo('2026-11-20T12:00:00.000Z', '7d', undefined, undefined, agora)).toBe(true)
    expect(dataEstaNoPeriodo('2026-11-19T12:00:00.000Z', '7d', undefined, undefined, agora)).toBe(false)
  })
})

describe('pendências de dias anteriores', () => {
  it('lista somente pendentes antigos e mantém os de hoje na fila principal', () => {
    const antigo = exame({ id: 'antigo', registeredAt: '2026-11-24T12:00:00.000Z' })
    const hoje = exame({ id: 'hoje' })
    const liberado = exame({ id: 'liberado', registeredAt: '2026-11-24T12:00:00.000Z', status: 'released' })
    const digitado = exame({ id: 'digitado', registeredAt: '2026-11-25T12:00:00.000Z', status: 'digitized' })
    expect(pendenciasDeDiasAnteriores([hoje, liberado, digitado, antigo], agora).map(item => item.id)).toEqual(['antigo', 'digitado'])
  })

  it('filtra por bancada, origem, busca sem acento e dia escolhido no mapa', () => {
    const exams = [
      exame({ id: '1', patientName: 'João', name: 'Sódio', workbenchId: 'bio', originId: 'ubs', registeredAt: '2026-11-24T10:00:00.000Z' }),
      exame({ id: '2', patientName: 'Maria', name: 'Hemograma', workbenchId: 'hema', originId: 'hospital', registeredAt: '2026-11-25T10:00:00.000Z' }),
    ]
    expect(filtrarPendenciasAnalise(exams, { workbenches: ['bio'], origins: ['ubs'], search: 'sodio', day: '2026-11-24' }).map(item => item.id)).toEqual(['1'])
    expect(filtrarPendenciasAnalise(exams, { workbenches: ['hema'] }).map(item => item.id)).toEqual(['2'])
  })

  it('agrupa a quantidade real por dia do atendimento', () => {
    const exams = [
      exame({ id: '1', registeredAt: '2026-11-24T10:00:00.000Z' }),
      exame({ id: '2', registeredAt: '2026-11-24T15:00:00.000Z' }),
      exame({ id: '3', registeredAt: '2026-11-25T15:00:00.000Z' }),
    ]
    expect(pendenciasPorDia(exams)).toEqual([
      { dia: '2026-11-24', quantidade: 2 },
      { dia: '2026-11-25', quantidade: 1 },
    ])
  })
})

describe('atraso real', () => {
  it('conta da data do pedido, sem usar a previsão de entrega, e mostra dias e horas', () => {
    const item = exame({ registeredAt: '2026-11-20T10:00:00.000Z', expectedDeliveryDate: '2026-11-24T10:00:00.000Z' })
    const reference = new Date(2026, 10, 26, 13, 0, 0)
    expect(horasAtrasoReal(item, reference)).toBe(147)
    expect(formatarAtrasoReal(147)).toBe('6 dias 3 h')
  })

  it('com coleta programada conta da Data Coleta informada no cadastro', () => {
    const item = exame({
      registeredAt: '2026-11-20T10:00:00.000Z',
      collectedAt: '2026-11-25T13:00:00.000Z',
      coletaProgramada: true,
      expectedDeliveryDate: '2026-11-24T10:00:00.000Z',
    })
    expect(horasAtrasoReal(item, agora)).toBe(24)
    expect(horasAtrasoReal(exame({ registeredAt: '2026-11-25T13:00:00.000Z' }), agora)).toBe(24)
    expect(formatarAtrasoReal(0)).toBe('No prazo')
  })
})

describe('fonte compartilhada da fila', () => {
  it('preserva a previsão do pedido para exames antigos sem previsão própria', () => {
    const [item] = achatarExamesAnalise([{
      id: 'p1', protocol: '1-01', status: 'collection_done', registeredAt: '2026-11-20T10:00:00.000Z', deliveryDate: '2026-11-22T10:00:00.000Z',
      labGuides: [{ exams: [{ id: 'e1', name: 'EAS', collected: true }] }],
    }], [])
    expect(item.orderDeliveryDate).toBe('2026-11-22T10:00:00.000Z')
    expect(item.status).toBe('pending')
  })
})
