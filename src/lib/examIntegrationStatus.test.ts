import { describe, it, expect } from 'vitest'
import { examIntegrationStatus } from '../../supabase/functions/_shared/examIntegrationStatus'

describe('estado do exame para o servidor do laboratório', () => {
  it('sequência liberar → desliberar → reteste → resultado novo → liberar', () => {
    const passos = [
      { status: 'released', retest_requested: false },
      { status: 'digitized', retest_requested: false },
      { status: 'digitized', retest_requested: true },
      { status: 'digitized', retest_requested: false },
      { status: 'released', retest_requested: false },
    ].map(examIntegrationStatus)
    expect(passos).toEqual(['released', 'resulted', 'retest_requested', 'resulted', 'released'])
  })

  it('dado antigo liberado + reteste sai como released', () => {
    expect(examIntegrationStatus({ status: 'released', retest_requested: true })).toBe('released')
  })
})
