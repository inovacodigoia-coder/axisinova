import { describe, it, expect } from 'vitest'
import {
  montarExamesRel, janelaRelatorio, kpisProducao, variacao, corTaxaRejeicao, corUrgNoPrazo, resumoRejeicoes,
  mapaCalor, topPedidos, resumoDoDia, comparativoSemana, ymdSP, horaSP, semaforoTat, intervaloResumo,
  type LinhaRelatorio,
} from './relatoriosGerenciais'

const INTERNAS = new Set(['b1', 'b2'])
// 14/11/2026 13:00 em São Paulo
const AGORA = new Date('2026-11-14T16:00:00Z').getTime()
const sp = (s: string) => new Date(`${s}-03:00`).toISOString()
const l = (p: Partial<LinhaRelatorio>): LinhaRelatorio => ({ o: 'o1', e: 'e1', x: 'Glicose', b: 'b1', c: sp('2026-11-14T08:00:00'), ...p })
const ex = (ls: LinhaRelatorio[]) => montarExamesRel(ls, INTERNAS)

describe('datas em São Paulo', () => {
  it('23h30 de SP ainda é o mesmo dia e a mesma hora local', () => {
    const t = new Date(sp('2026-11-13T23:30:00')).getTime()
    expect(ymdSP(t)).toBe('2026-11-13')
    expect(horaSP(t)).toBe(23)
  })
})

describe('períodos', () => {
  it('Este mês compara com o mesmo trecho do mês passado', () => {
    const j = janelaRelatorio('mes', AGORA)
    expect(new Date(j.inicio).toISOString()).toBe('2026-11-01T03:00:00.000Z')
    expect(new Date(j.anteriorInicio).toISOString()).toBe('2026-10-01T03:00:00.000Z')
    expect(j.anteriorFim - j.anteriorInicio).toBe(AGORA - j.inicio)
  })
  it('Mês anterior = outubro inteiro, comparado com setembro', () => {
    const j = janelaRelatorio('mes_anterior', AGORA)
    expect(ymdSP(j.inicio)).toBe('2026-10-01')
    expect(ymdSP(j.fim)).toBe('2026-10-31')
    expect(ymdSP(j.anteriorInicio)).toBe('2026-09-01')
  })
  it('Personalizado é limitado a 45 dias', () => {
    const j = janelaRelatorio('personalizado', AGORA, { de: '2026-08-01', ate: '2026-11-10' })
    expect(ymdSP(j.fim)).toBe('2026-09-14')
  })
})

describe('produção', () => {
  it('TAT = liberação − coleta; urgência no prazo até 60 min; apoio fica fora', () => {
    const exames = ex([
      l({ o: 'o1', e: 'e1', u: true, ca: sp('2026-11-14T09:00:00'), la: sp('2026-11-14T09:40:00') }), // 40 min
      l({ o: 'o2', e: 'e1', u: true, ca: sp('2026-11-14T09:00:00'), la: sp('2026-11-14T10:20:00') }), // 80 min
      l({ o: 'o3', e: 'e2', ca: sp('2026-11-14T08:00:00'), la: sp('2026-11-14T09:30:00') }), // rotina 90
      l({ o: 'o4', e: 'e3', b: 'apoio1', t: 'apoio', ca: sp('2026-11-14T08:00:00'), la: sp('2026-11-14T12:00:00') }),
    ]).filter(e => !e.apoio)
    const j = janelaRelatorio('hoje', AGORA)
    const k = kpisProducao(exames, j.inicio, j.fim)
    expect(k.urgRecebidas).toBe(2)
    expect(k.urgTat).toBe(60)
    expect(k.urgNoPrazoPct).toBe(50)
    expect(k.rotTat).toBe(90)
    expect(k.liberados).toBe(3)
    expect(k.porDia).toBe(3)
    expect(k.noPrazoPct).toBeCloseTo(66.67, 1) // rotina 90 ≤ 120 conta no prazo
  })
  it('% urgências no prazo: verde a partir de 90%, vermelho abaixo', () => {
    expect(corUrgNoPrazo(90)).toBe('verde')
    expect(corUrgNoPrazo(89.9)).toBe('vermelho')
  })
  it('variação: % para contagem, minutos para TAT, pp para taxa', () => {
    expect(variacao(120, 100, 'pct')).toEqual({ texto: '20,0%', direcao: 'sobe' })
    expect(variacao(45, 50, 'min')).toEqual({ texto: '5 min', direcao: 'desce' })
    expect(variacao(92, 90, 'pp')).toEqual({ texto: '2,0 pp', direcao: 'sobe' })
    expect(variacao(10, 0, 'pct')).toBeNull()
  })
  it('mapa de calor conta só liberações entre 06h e 22h', () => {
    const exames = ex([
      l({ e: 'a', ca: sp('2026-11-14T05:00:00'), la: sp('2026-11-14T05:30:00') }),
      l({ e: 'b', ca: sp('2026-11-14T09:00:00'), la: sp('2026-11-14T09:30:00') }),
      l({ e: 'c', ca: sp('2026-11-14T22:00:00'), la: sp('2026-11-14T22:59:00') }),
    ])
    const m = mapaCalor(exames, new Date(sp('2026-11-14T00:00:00')).getTime(), new Date(sp('2026-11-14T23:59:59')).getTime())
    expect(m.celulas[9 - 6][5]).toBe(1) // sábado 09h
    expect(m.celulas[22 - 6][5]).toBe(1)
    expect(m.celulas.flat().reduce((s, v) => s + v, 0)).toBe(2)
  })
  it('top exames mais pedidos ordena por quantidade', () => {
    const exames = ex([l({ o: '1', e: 'g' }), l({ o: '2', e: 'g' }), l({ o: '3', e: 'h', x: 'Ureia' })])
    const j = janelaRelatorio('hoje', AGORA)
    const t = topPedidos(exames, j.inicio, j.fim)
    expect(t.map(r => [r.exame, r.quantidade])).toEqual([['Glicose', 2], ['Ureia', 1]])
  })
})

describe('rejeições', () => {
  it('cores: vermelho > 1%, amarelo 0,6–1%, verde < 0,6%', () => {
    expect(corTaxaRejeicao(1.01)).toBe('vermelho')
    expect(corTaxaRejeicao(1)).toBe('amarelo')
    expect(corTaxaRejeicao(0.6)).toBe('amarelo')
    expect(corTaxaRejeicao(0.59)).toBe('verde')
  })
  it('taxa = recoletas no período ÷ exames coletados ou rejeitados no período; motivo mais frequente', () => {
    const exames = ex([
      l({ o: '1', ra: sp('2026-11-14T10:00:00'), rm: 'Amostra hemolisada' }),
      l({ o: '2', ra: sp('2026-11-14T11:00:00'), rm: 'Amostra hemolisada' }),
      l({ o: '3', ra: sp('2026-11-14T11:00:00') }),
      l({ o: '4', ca: sp('2026-11-14T09:00:00') }),
    ])
    const j = janelaRelatorio('hoje', AGORA)
    const r = resumoRejeicoes(exames, j.inicio, j.fim)
    expect(r.total).toBe(3)
    expect(r.taxa).toBe(75)
    expect(r.motivoTop).toEqual({ nome: 'Amostra hemolisada', total: 2 })
    expect(r.porMotivo.find(m => m.nome === 'Sem motivo informado')?.total).toBe(1)
  })
})

describe('resumo do dia', () => {
  it('conta pedidos urgência/rotina, hora de pico e críticos do dia', () => {
    const exames = ex([
      l({ o: 'A', e: '1', u: true, c: sp('2026-11-13T09:10:00'), ca: sp('2026-11-13T09:20:00'), la: sp('2026-11-13T09:50:00') }),
      l({ o: 'A', e: '2', u: true, c: sp('2026-11-13T09:10:00') }),
      l({ o: 'B', e: '1', c: sp('2026-11-13T09:40:00') }),
      l({ o: 'C', e: '1', c: sp('2026-11-13T15:00:00') }),
      l({ o: 'D', e: '1', c: sp('2026-11-14T09:00:00') }),
    ])
    const r = resumoDoDia(exames, '2026-11-13', [new Date(sp('2026-11-13T10:00:00')).getTime(), new Date(sp('2026-11-14T10:00:00')).getTime()])
    expect(r.pedidos).toBe(3)
    expect(r.pedidosUrg).toBe(1)
    expect(r.pedidosRot).toBe(2)
    expect(r.liberados).toBe(1)
    expect(r.urgTat).toBe(30)
    expect(r.urgNoPrazoPct).toBe(100)
    expect(r.horaPico).toEqual({ hora: 9, total: 2 })
    expect(r.criticos).toBe(1)
  })
  it('semana: de segunda até o dia, comparada com os mesmos dias da semana passada', () => {
    const exames = ex([
      l({ e: '1', ca: sp('2026-11-09T08:00:00'), la: sp('2026-11-09T09:00:00') }), // seg desta semana
      l({ e: '2', ca: sp('2026-11-03T08:00:00'), la: sp('2026-11-03T09:00:00') }), // ter da passada
      l({ e: '3', ca: sp('2026-11-06T08:00:00'), la: sp('2026-11-06T09:00:00') }), // sex da passada (fora)
    ])
    const c = comparativoSemana(exames, '2026-11-10') // terça
    expect(c.de).toBe('2026-11-09')
    expect(c.atual).toBe(1)
    expect(c.anterior).toBe(1)
  })
  it('busca do resumo começa no 1º dia do mês anterior', () => {
    expect(ymdSP(intervaloResumo('2026-11-13').de)).toBe('2026-10-01')
  })
  it('semáforo impresso em texto', () => {
    expect(semaforoTat(25, 'urgente')).toBe('(OK)')
    expect(semaforoTat(45, 'urgente')).toBe('(ATENÇÃO)')
    expect(semaforoTat(61, 'urgente')).toBe('(ATRASO)')
  })
})

describe('L-Lab-02-A: TAT por fase, analistas, hemólise e recoleta', () => {
  const ini = new Date(sp('2026-11-14T00:00:00')).getTime()
  const fim = AGORA

  it('TAT pré-analítico = recebido → coleta; analítico = coleta → liberação; cores 30/60 min', async () => {
    const { corTatFase } = await import('./relatoriosGerenciais')
    const k = kpisProducao(ex([
      l({ c: sp('2026-11-14T08:00:00'), ca: sp('2026-11-14T08:20:00'), la: sp('2026-11-14T09:00:00') }),
      l({ o: 'o2', c: sp('2026-11-14T08:00:00'), ca: sp('2026-11-14T08:40:00'), la: sp('2026-11-14T10:00:00') }),
    ]), ini, fim)
    expect(k.preTat).toBe(30)
    expect(k.analTat).toBe(60)
    expect(corTatFase(29)).toBe('verde')
    expect(corTatFase(30)).toBe('amarelo')
    expect(corTatFase(60)).toBe('amarelo')
    expect(corTatFase(61)).toBe('vermelho')
  })

  it('produtividade usa quem liberou; rejeições pelo nome de quem pediu a recoleta', async () => {
    const { produtividadeAnalistas } = await import('./relatoriosGerenciais')
    const linhas = produtividadeAnalistas(ex([
      l({ ca: sp('2026-11-14T08:00:00'), la: sp('2026-11-14T08:40:00'), lb: 'u1', u: true }),
      l({ o: 'o2', ca: sp('2026-11-14T08:00:00'), la: sp('2026-11-14T09:00:00'), lb: 'u1' }),
      l({ o: 'o3', ca: sp('2026-11-14T08:00:00'), la: sp('2026-11-14T09:00:00'), lb: 'u2' }),
      l({ o: 'o4', ra: sp('2026-11-14T10:00:00'), rm: 'Amostra hemolisada', rb: 'joão' }),
    ]), ini, fim, { u1: 'João', u2: 'Ana' })
    expect(linhas.map(a => [a.nome, a.liberados, a.tatMedio, a.urgencias, a.rejeicoes])).toEqual([
      ['João', 2, 50, 1, 1],
      ['Ana', 1, 60, 0, 0],
    ])
  })

  it('índice de hemólise por amostra e taxa de recoleta por pedido', () => {
    const r = resumoRejeicoes(ex([
      l({ o: 'o1', e: 'a', ca: sp('2026-11-14T08:00:00') }),
      l({ o: 'o1', e: 'b', ra: sp('2026-11-14T09:00:00'), rm: 'Amostra hemolisada' }),
      l({ o: 'o1', e: 'c', ra: sp('2026-11-14T09:00:00'), rm: 'Coágulo na amostra' }),
      l({ o: 'o2', e: 'a', ca: sp('2026-11-14T08:00:00') }),
    ]), ini, fim)
    expect(r.indiceHemolise).toBe(25) // 1 de 4 amostras
    expect(r.taxaRecoleta).toBe(50)   // 1 de 2 pedidos
  })

  it('cores: hemólise verde < 2%, amarelo 2–3%, vermelho > 3%; recoleta verde só abaixo de 0,5%', async () => {
    const { corIndiceHemolise, corTaxaRecoleta } = await import('./relatoriosGerenciais')
    expect(corIndiceHemolise(1.9)).toBe('verde')
    expect(corIndiceHemolise(2.1)).toBe('amarelo')
    expect(corIndiceHemolise(3.1)).toBe('vermelho')
    expect(corTaxaRecoleta(0.4)).toBe('verde')
    expect(corTaxaRecoleta(0.5)).toBe('vermelho')
  })
})
