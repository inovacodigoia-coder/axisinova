import { describe, it, expect } from 'vitest'
import { renderModelo, MODELOS_PADRAO, RESPOSTAS_PADRAO, variaveisDesconhecidas, comCabecalho, textoCiclo, AUTOMACOES_PADRAO, descreverQuando, temMarcadorOrientacao } from './whatsappModelo'

// Os mesmos 3 casos foram conferidos contra public.whatsapp_render_modelo no banco.
export const CASOS = [
  {
    texto: MODELOS_PADRAO[1],
    dados: { paciente: 'Danielle Beatriz', tipo: 'Consulta', primeiraVez: true, medico: 'Dra. Juliana Prado', dataHora: '2026-10-06T13:40:00Z' },
    esperado: 'Olá, Danielle! Tudo bem? Passando para confirmar seu agendamento: consulta (1ª vez) com Dra. Juliana Prado em terça, 06/10/2026 às 10:40. Tudo certo?',
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
  {
    texto: 'Agendado por {responsavel}.',
    dados: { paciente: 'Ana', tipo: 'Consulta', primeiraVez: false, medico: '', dataHora: null, responsavel: ' *Alex_sandro* ~Souza ' },
    esperado: 'Agendado por Alexsandro Souza.',
  },
  {
    texto: RESPOSTAS_PADRAO.resposta_confirmar,
    dados: { paciente: 'Ana', tipo: 'Consulta', primeiraVez: false, medico: '', dataHora: '2026-10-07T13:00:00Z' },
    esperado: 'Ana seu agendamento foi confirmado com sucesso.\n\nAgradecemos a sua confiança e ficamos à disposição caso precise alterar o horário ou obter mais informações.\n\nTenha um excelente dia! Até QUARTA! 💚🙏',
  },
  {
    texto: 'Até {dia_semana}, {primeiro_nome}.',
    dados: { paciente: 'Bia Lima', tipo: 'Exame', primeiraVez: false, medico: '', dataHora: '2026-10-11T02:05:00Z' },
    esperado: 'Até SÁBADO, Bia.',
  },
]

describe('renderModelo', () => {
  CASOS.forEach((c, i) => it(`caso ${i + 1}`, () => expect(renderModelo(c.texto, c.dados)).toBe(c.esperado)))
  it('cabeçalho', () => expect(comCabecalho('Alex*', 'Oi')).toBe('*Alex*:\nOi'))
  it('agradece ao paciente com cabeçalho do responsável', () => {
    const corpo = renderModelo(RESPOSTAS_PADRAO.resposta_confirmar, { paciente: 'Alex Souza', dataHora: '2026-10-09T12:00:00Z' })
    expect(comCabecalho('Alexsandro de Souza', `\n${corpo}`)).toBe('*Alexsandro de Souza*:\n\nAlex seu agendamento foi confirmado com sucesso.\n\nAgradecemos a sua confiança e ficamos à disposição caso precise alterar o horário ou obter mais informações.\n\nTenha um excelente dia! Até SEXTA! 💚🙏')
  })
  it('detecta variável errada', () => expect(variaveisDesconhecidas('Oi {pacient} {tipo}')).toEqual(['{pacient}']))
})

// Etapa 11A — conferidos contra whatsapp_render_modelo + aviso no banco.
export const CASOS_CICLO = [
  {
    texto: AUTOMACOES_PADRAO.pos_atendimento.texto, aviso: true,
    dados: { paciente: 'Danielle Beatriz', tipo: 'Consulta', primeiraVez: false, medico: 'Dra. Juliana Prado', dataHora: '2026-10-06T13:40:00Z' },
    esperado: 'Olá, Danielle! Foi um prazer atender você hoje. Se precisar de algo, estamos à disposição. Cuide-se! 💚\n\nPara não receber mais mensagens automáticas, responda SAIR.',
  },
  {
    texto: 'Oi {primeiro_nome}, obrigado pelo {tipo} com {medico}.', aviso: true,
    dados: { paciente: 'Carlos Souza', tipo: 'Exame', primeiraVez: false, medico: 'Dr. Ricardo Menezes', dataHora: null },
    esperado: 'Oi Carlos, obrigado pelo exame com Dr. Ricardo Menezes.\n\nPara não receber mais mensagens automáticas, responda SAIR.',
  },
]

describe('automações de ciclo', () => {
  it.each(CASOS_CICLO)('pós-atendimento com aviso de saída %#', (c) => {
    expect(textoCiclo(c.texto, c.dados, c.aviso)).toBe(c.esperado)
  })
  it('descreve quando envia', () => {
    expect(descreverQuando('pos_atendimento', 120)).toBe('2 horas depois de finalizar o atendimento')
    expect(descreverQuando('pre_atendimento', 1440, '18:00:00')).toBe('no dia anterior ao atendimento, às 18:00')
    expect(descreverQuando('pre_atendimento', 1440)).toBe('1 dia antes do atendimento')
  })
  it('bloqueia texto com marcador de orientação', () => {
    expect(temMarcadorOrientacao(AUTOMACOES_PADRAO.pre_atendimento.texto)).toBe(true)
    expect(temMarcadorOrientacao(AUTOMACOES_PADRAO.pos_atendimento.texto)).toBe(false)
  })
})
