import { describe, it, expect } from 'vitest'
import {
  corDoTat, alertaDoPendente, montarExames, indicadoresDoPeriodo, ordenarBacklog, tatMinutos, valorCritico,
  janelaDoPeriodo, inicioDoDiaSP, type LinhaPainelRpc,
} from './painelOperacional'

const AGORA = new Date('2026-11-14T16:00:00Z').getTime()
const minAtras = (m: number) => new Date(AGORA - m * 60_000).toISOString()
const linha = (p: Partial<LinhaPainelRpc>): LinhaPainelRpc => ({
  order_id: 'o1', protocol: '1-01', patient_name: 'P', is_urgent: false, order_status: 'collection_done',
  exam_id: 'e1', exam_name: 'Glicose', workbench_id: 'b1', bancada_tipo: 'interna', collected_at: minAtras(10),
  recollection_at: null, result_status: null, typed_at: null, released_at: null, ...p,
})
const BANCADAS = new Set(['b1'])

describe('metas de TAT', () => {
  it('urgência: verde < 30, amarelo 30–60, vermelho > 60', () => {
    expect(corDoTat(29, 'urgente')).toBe('verde')
    expect(corDoTat(30, 'urgente')).toBe('amarelo')
    expect(corDoTat(60, 'urgente')).toBe('amarelo')
    expect(corDoTat(61, 'urgente')).toBe('vermelho')
  })
  it('rotina: verde < 60, amarelo 60–120, vermelho > 120', () => {
    expect(corDoTat(59, 'rotina')).toBe('verde')
    expect(corDoTat(60, 'rotina')).toBe('amarelo')
    expect(corDoTat(121, 'rotina')).toBe('vermelho')
  })
  it('alertas: urgência > 30 próximo, > 60 atrasado; rotina > 60 próximo, > 120 atrasado', () => {
    expect(alertaDoPendente(30, 'urgente')).toBeNull()
    expect(alertaDoPendente(31, 'urgente')).toBe('proximo')
    expect(alertaDoPendente(61, 'urgente')).toBe('atrasado')
    expect(alertaDoPendente(61, 'rotina')).toBe('proximo')
    expect(alertaDoPendente(121, 'rotina')).toBe('atrasado')
  })
})

describe('exames do painel', () => {
  it('descarta apoio e sem coleta, mas mantém coleta futura com aviso e TAT zerado', () => {
    const futura = new Date(AGORA + 3_600_000).toISOString()
    const ex = montarExames([
      linha({ exam_id: 'a', bancada_tipo: 'apoio' }),
      linha({ exam_id: 'b', collected_at: futura }),
      linha({ exam_id: 'c', collected_at: null }),
      linha({ exam_id: 'd' }),
    ], AGORA, BANCADAS)
    expect(ex.map(e => e.examId)).toEqual(['b', 'd'])
    expect(ex[0].coletaAlteradaEm).toBe(futura)
    expect(tatMinutos(ex[0], AGORA)).toBe(0)
    expect(ex[1].coletaAlteradaEm).toBeNull()
  })
  it('TAT = liberação − coleta para liberados; rotina no prazo até 120 min', () => {
    const ex = montarExames([
      linha({ exam_id: 'a', collected_at: minAtras(100), result_status: 'released', released_at: minAtras(50) }),
      linha({ exam_id: 'b', collected_at: minAtras(200), result_status: 'released', released_at: minAtras(10) }),
    ], AGORA, BANCADAS)
    const ind = indicadoresDoPeriodo(ex, 'rotina', AGORA - 8 * 3_600_000, AGORA, AGORA)
    expect(ind.liberados).toHaveLength(2)
    expect(ind.tatMedio).toBe((50 + 190) / 2)
    expect(ind.noPrazoPct).toBe(50)
  })
  it('recoleta pedida depois da coleta tira o exame dos pendentes e conta como rejeição', () => {
    const ex = montarExames([linha({ collected_at: minAtras(90), recollection_at: minAtras(30) })], AGORA, BANCADAS)
    expect(ex[0].aguardandoRecoleta).toBe(true)
    const ind = indicadoresDoPeriodo(ex, 'rotina', AGORA - 8 * 3_600_000, AGORA, AGORA)
    expect(ind.rejeicoes).toHaveLength(1)
    expect(ind.baseTat).toHaveLength(0)
  })
  it('backlog: urgências atrasadas → urgências no prazo → rotina atrasada → rotina no prazo', () => {
    const ex = montarExames([
      linha({ exam_id: 'rotinaOk', collected_at: minAtras(20) }),
      linha({ exam_id: 'rotinaAtr', collected_at: minAtras(130) }),
      linha({ exam_id: 'urgOk', is_urgent: true, collected_at: minAtras(10) }),
      linha({ exam_id: 'urgAtr', is_urgent: true, collected_at: minAtras(70) }),
    ], AGORA, BANCADAS)
    expect(ordenarBacklog(ex, AGORA).map(e => e.examId)).toEqual(['urgAtr', 'urgOk', 'rotinaAtr', 'rotinaOk'])
  })
})

describe('período', () => {
  it('Hoje começa à meia-noite de São Paulo e compara com ontem', () => {
    const j = janelaDoPeriodo('hoje', AGORA)
    expect(new Date(inicioDoDiaSP(AGORA)).toISOString()).toBe('2026-11-14T03:00:00.000Z')
    expect(j.anteriorFim).toBe(AGORA - 24 * 3_600_000)
  })
  it('Turno atual = últimas 8 horas', () => {
    expect(janelaDoPeriodo('turno', AGORA).inicio).toBe(AGORA - 8 * 3_600_000)
  })
})

describe('valor crítico', () => {
  it('lê <, >, faixa e vários limites', () => {
    expect(valorCritico('2,4', '< 2,5')).toBe(true)
    expect(valorCritico('2,6', '< 2,5')).toBe(false)
    expect(valorCritico('8', '2,5 - 7,0')).toBe(true)
    expect(valorCritico('5', '2,5 a 7,0')).toBe(false)
    expect(valorCritico('600', '< 40; > 500')).toBe(true)
    expect(valorCritico('texto', '< 40')).toBe(false)
  })
})

describe('status dos aparelhos', () => {
  it('conectado até 5 min, aguardando de 5 a 30 min, erro acima de 30 min', async () => {
    const { statusDoAparelho } = await import('./painelOperacional')
    expect(statusDoAparelho(minAtras(2), AGORA)).toBe('conectado')
    expect(statusDoAparelho(minAtras(5), AGORA)).toBe('conectado')
    expect(statusDoAparelho(minAtras(18), AGORA)).toBe('aguardando')
    expect(statusDoAparelho(minAtras(30), AGORA)).toBe('aguardando')
    expect(statusDoAparelho(minAtras(65), AGORA)).toBe('erro')
  })
  it('aparelho que nunca mandou resultado fica sem comunicação', async () => {
    const { statusDoAparelho, haQuantoTempo } = await import('./painelOperacional')
    expect(statusDoAparelho(null, AGORA)).toBe('sem_comunicacao')
    expect(haQuantoTempo(null, AGORA)).toBe('nunca')
    expect(haQuantoTempo(minAtras(65), AGORA)).toBe('há 1h 05min')
  })
})
