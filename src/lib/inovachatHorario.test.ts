import { describe, expect, it } from 'vitest'
import { DIAS_PADRAO, FORA_HORARIO_PADRAO, horarioTexto, renderForaHorario } from './inovachatHorario'

describe('horário de atendimento', () => {
  it('resume o padrão igual ao SQL', () => {
    expect(horarioTexto(DIAS_PADRAO)).toBe('Segunda a sexta, das 08:00 às 18:00')
  })
  it('separa dias com horários diferentes', () => {
    expect(horarioTexto([{ d: 1, a: true, i: '08:00', f: '18:00' }, { d: 6, a: true, i: '08:00', f: '12:00' }]))
      .toBe('Segunda, das 08:00 às 18:00; sábado, das 08:00 às 12:00')
  })
  it('remove vírgula sem nome do contato', () => {
    expect(renderForaHorario(FORA_HORARIO_PADRAO, { nome_contato: '', empresa: 'X', horario: 'H' })).toMatch(/^Olá! Recebemos/)
  })
})
