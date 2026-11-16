import { describe, it, expect } from 'vitest'
import { decideInstrumentResult } from '../../supabase/functions/_shared/resultOverwrite'

const NOW = new Date('2026-11-04T15:00:00Z')

const instrumentValue = (over: Partial<{ value: string; source: string; instrument_value: string | null; result_datetime: string | null; updated_at: string }> = {}) => ({
  value: '7.09',
  source: 'instrument',
  result_datetime: '2026-11-04T14:00:00Z',
  updated_at: '2026-11-04T14:00:00Z',
  ...over,
})

describe('decideInstrumentResult — regra de resultado novo do aparelho', () => {
  it('1. exame pendente + resultado novo → sobrescreve', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: false })
  })

  it('1b. sem valor anterior → created', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: null,
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'created', retest: false })
  })

  it('2. result_datetime mais antigo que o valor atual → ignored_older', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T13:00:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'ignored_older' })
  })

  it('3. valor digitado à mão mais recente que o aparelho → ignored_older', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ source: 'manual', result_datetime: null, updated_at: '2026-11-04T14:45:00Z' }),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'ignored_older' })
  })

  it('3b. aparelho mais recente que o digitado → sobrescreve', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ source: 'manual', result_datetime: null, updated_at: '2026-11-04T14:45:00Z' }),
      incomingResultDatetime: '2026-11-04T14:50:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: false })
  })

  it('4. liberado sem reteste → recusa (exame_liberado)', () => {
    const d = decideInstrumentResult({
      examStatus: 'released',
      retestRequested: false,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'refused_released' })
  })

  it('5. liberado com reteste antigo pendurado → recusa (laudo liberado não muda sozinho)', () => {
    const d = decideInstrumentResult({
      examStatus: 'released',
      retestRequested: true,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'refused_released' })
  })

  it('5b. desliberado com reteste → grava, consome o reteste e continua não liberado', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: true,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: true })
  })

  it('6. depois do reteste, novo resultado sem novo pedido → regra de não liberado', () => {
    // exame desliberado (digitized), reteste consumido
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ value: '7.10', result_datetime: '2026-11-04T14:30:00Z' }),
      incomingResultDatetime: '2026-11-04T14:40:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: false })
    // liberado de novo sem reteste → recusa
    const d2 = decideInstrumentResult({
      examStatus: 'released',
      retestRequested: false,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T14:50:00Z',
      now: NOW,
    })
    expect(d2).toEqual({ kind: 'refused_released' })
  })

  it('7. sem result_datetime enviado → usa o agora (sobrescreve valor mais antigo)', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue(),
      incomingResultDatetime: null,
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: false })
  })

  it('valor atual vazio → created (não há o que sobrescrever)', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ value: '  ' }),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'created', retest: false })
  })

  it('liberado sem reteste + campo vazio → recusa (não desfaz a liberação)', () => {
    const d = decideInstrumentResult({ examStatus: 'released', retestRequested: false, current: null, incomingResultDatetime: '2026-11-04T14:30:00Z', now: NOW })
    expect(d).toEqual({ kind: 'refused_released' })
    const vazio = decideInstrumentResult({ examStatus: 'released', retestRequested: false, current: instrumentValue({ value: '' }), incomingResultDatetime: null, now: NOW })
    expect(vazio).toEqual({ kind: 'refused_released' })
  })

  it('liberado com reteste + campo vazio → recusa', () => {
    const d = decideInstrumentResult({ examStatus: 'released', retestRequested: true, current: null, incomingResultDatetime: null, now: NOW })
    expect(d).toEqual({ kind: 'refused_released' })
  })

  it('não liberado com reteste + campo vazio → grava e consome o reteste', () => {
    const d = decideInstrumentResult({ examStatus: 'digitized', retestRequested: true, current: null, incomingResultDatetime: null, now: NOW })
    expect(d).toEqual({ kind: 'created', retest: true })
  })

  it('3c. valor do aparelho corrigido à mão depois → resultado antigo reenviado não apaga a correção', () => {
    // aparelho 14:00 = 7.09; técnico corrigiu para 7.50 às 14:45; chega reenvio de 14:30
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ value: '7.50', instrument_value: '7.09', updated_at: '2026-11-04T14:45:00Z' }),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'ignored_older' })
  })

  it('3d. valor corrigido à mão + aparelho rodou depois da correção → sobrescreve', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ value: '7.50', instrument_value: '7.09', updated_at: '2026-11-04T14:45:00Z' }),
      incomingResultDatetime: '2026-11-04T14:50:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: false })
  })

  it('3e. valor do aparelho intacto, só salvo de novo depois → vale o horário do aparelho', () => {
    // salvar a tela sem mudar o valor não bloqueia uma repetição feita depois da 1ª leitura
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ instrument_value: '7.09', updated_at: '2026-11-04T14:45:00Z' }),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', retest: false })
  })
})
