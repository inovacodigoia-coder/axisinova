import { describe, it, expect } from 'vitest'
import { estadoDoPedido, alteracoesDoPedido, examesRemovidosComResultado } from './editarAtendimento'

const row = {
  weight: '70', height: '1,70', is_urgent: false, has_fever: true, is_fasting: true,
  fasting_start_hour: '22:00', fasting_type: '8 horas', hospital_id: null, bed: null,
  service_observation: 'obs', doctor_name: 'DR A', convenio_id: 'c1', convenio_name: 'SUS',
  lab_guides: [{ convenioId: 'c1', convenioName: 'SUS', exams: [{ examId: 'e1', name: 'Glicose', collectedAt: '2026-11-12T10:00:00Z' }] }],
}

describe('Editar atendimento', () => {
  it('abre com as informações gravadas no cadastro', () => {
    const s = estadoDoPedido(row)
    expect(s.weight).toBe('70')
    expect(s.hasFever).toBe(true)
    expect(s.fastingSince).toBe('Sim')
    expect(s.fastingStartHour).toBe('22:00')
    expect(s.observation).toBe('obs')
    expect(s.guides[0].plan).toBe('SUS')
    expect(s.guides[0].exams[0].collectedAt).toBe('2026-11-12T10:00:00Z')
  })

  it('sem mudança não salva nada', () => {
    expect(alteracoesDoPedido(row, estadoDoPedido(row))).toEqual({})
  })

  it('salva só o que mudou e limpa o horário do jejum quando tira o jejum', () => {
    const s = { ...estadoDoPedido(row), weight: '72', fastingSince: 'Não' }
    expect(alteracoesDoPedido(row, s)).toEqual({ weight: '72', is_fasting: false, fasting_start_hour: null, fasting_type: null })
  })

  it('não deixa tirar exame que já tem resultado digitado', () => {
    const antes = row.lab_guides
    expect(examesRemovidosComResultado(antes, [{ exams: [] }], [{ exam_ref: 'p1:e1' }])).toEqual(['Glicose'])
    expect(examesRemovidosComResultado(antes, [{ exams: [] }], [])).toEqual([])
    expect(examesRemovidosComResultado(antes, antes, [{ exam_ref: 'p1:e1' }])).toEqual([])
  })
})
