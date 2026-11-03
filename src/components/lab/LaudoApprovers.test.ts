import { describe, it, expect } from 'vitest'
import { approversOf } from './LaudoDocument'

describe('Aprovado por — cada exame mantém quem liberou', () => {
  it('pedido com dois bioquímicos lista os dois, cada um com seus exames', () => {
    const r = approversOf([
      { name: 'Hemograma', approvedBy: 'LARA', approvedAt: '2026-11-02T18:47:00Z' },
      { name: 'Creatinina', approvedBy: 'ALAN', approvedAt: '2026-11-02T19:57:00Z' },
      { name: 'TGO', approvedBy: 'ALAN', approvedAt: '2026-11-02T19:58:00Z' },
    ])
    expect(r.map((a) => a.name)).toEqual(['LARA', 'ALAN'])
    expect(r[0].exams).toEqual(['Hemograma'])
    expect(r[1].exams).toEqual(['Creatinina', 'TGO'])
  })
})
