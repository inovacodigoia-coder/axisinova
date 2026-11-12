import { describe, it, expect } from 'vitest'
import { decideInstrumentResult } from '../../supabase/functions/_shared/resultOverwrite'

const NOW = new Date('2026-11-04T15:00:00Z')

const instrumentValue = (over: Partial<{ value: string; source: string; result_datetime: string; updated_at: string }> = {}) => ({
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
    expect(d).toEqual({ kind: 'overwritten', reopened: false })
  })

  it('1b. sem valor anterior → created', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: null,
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'created' })
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
    expect(d).toEqual({ kind: 'overwritten', reopened: false })
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

  it('5. liberado com reteste solicitado → sobrescreve e reabre', () => {
    const d = decideInstrumentResult({
      examStatus: 'released',
      retestRequested: true,
      current: instrumentValue(),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', reopened: true })
  })

  it('6. depois do reteste, novo resultado sem novo pedido → regra de não liberado', () => {
    // exame reaberto (digitized), reteste consumido
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ value: '7.10', result_datetime: '2026-11-04T14:30:00Z' }),
      incomingResultDatetime: '2026-11-04T14:40:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'overwritten', reopened: false })
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
    expect(d).toEqual({ kind: 'overwritten', reopened: false })
  })

  it('valor atual vazio → created (não há o que sobrescrever)', () => {
    const d = decideInstrumentResult({
      examStatus: 'digitized',
      retestRequested: false,
      current: instrumentValue({ value: '  ' }),
      incomingResultDatetime: '2026-11-04T14:30:00Z',
      now: NOW,
    })
    expect(d).toEqual({ kind: 'created' })
  })

  it('liberado sem reteste + campo vazio → recusa (não desfaz a liberação)', () => {
    const d = decideInstrumentResult({ examStatus: 'released', retestRequested: false, current: null, incomingResultDatetime: '2026-11-04T14:30:00Z', now: NOW })
    expect(d).toEqual({ kind: 'refused_released' })
    const vazio = decideInstrumentResult({ examStatus: 'released', retestRequested: false, current: instrumentValue({ value: '' }), incomingResultDatetime: null, now: NOW })
    expect(vazio).toEqual({ kind: 'refused_released' })
  })

  it('liberado com reteste + campo vazio → grava e reabre', () => {
    const d = decideInstrumentResult({ examStatus: 'released', retestRequested: true, current: null, incomingResultDatetime: null, now: NOW })
    expect(d).toEqual({ kind: 'created', reopened: true })
  })
})
