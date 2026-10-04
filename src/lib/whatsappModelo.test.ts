import { describe, it, expect } from 'vitest'
import { renderModelo, MODELOS_PADRAO, variaveisDesconhecidas } from './whatsappModelo'

// Os mesmos 3 casos foram conferidos contra public.whatsapp_render_modelo no banco.
export const CASOS = [
  {
    texto: MODELOS_PADRAO[1],
    dados: { paciente: 'Danielle Beatriz', tipo: 'Consulta', primeiraVez: true, medico: 'Dra. Juliana Prado', dataHora: '2026-10-06T13:40:00Z' },
    esperado: 'Olá, Danielle! Tudo bem? Passando para confirmar seu agendamento: consulta (1ª vez) com Dra. Juliana Prado em terça, 06/10/2026 às 10:40. Responda SIM para confirmar ou NÃO caso precise remarcar.',
  },
  {
    texto: 'Oi {primeiro_nome}, seu {tipo} é {data_hora}.',
    dados: { paciente: '  Carlos Alberto Souza ', tipo: 'Exame', primeiraVez: false, medico: null, dataHora: '2026-10-11T02:05:00Z' },
    esperado: 'Oi Carlos, seu exame é sábado, 10/10/2026 às 23:05.',
  },
  {
    texto: '{paciente}, consulta com {medico} . Até {data_hora}!  {pacient}',
    dados: { paciente: 'Ana', tipo: 'Consulta', primeiraVez: false, medico: '', dataHora: '2026-10-05T12:00:00Z' },
    esperado: 'Ana, consulta com. Até segunda, 05/10/2026 às 09:00! {pacient}',
  },
]

describe('renderModelo', () => {
  CASOS.forEach((c, i) => it(`caso ${i + 1}`, () => expect(renderModelo(c.texto, c.dados)).toBe(c.esperado)))
  it('detecta variável errada', () => expect(variaveisDesconhecidas('Oi {pacient} {tipo}')).toEqual(['{pacient}']))
})
