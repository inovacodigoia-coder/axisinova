import { describe, expect, it } from 'vitest'
import {
  FALHA_CORPO_GRANDE, LIMITES_PEDIDO, dataDoCalendario, lerCorpoLimitado, lerProtocolo, limparCorpo, limparTexto, validarCampos,
} from '../../supabase/functions/_shared/pedidoParceiroValidacao'
import { consultarPedidoParceiro, referenciaValida } from '../../supabase/functions/_shared/parceiroAcesso'
import { verificarPostParceiro } from '../../supabase/functions/_shared/apiProtecao'

const AGORA = new Date('2026-11-18T12:00:00Z')

/** Pedido do exemplo do /docs, que precisa continuar passando. */
const pedidoValido = () => ({
  protocolo_parceiro: 'PED-2026-00871',
  paciente: {
    nome: 'Maria Aparecida Souza', cpf: '123.456.789-09', data_nascimento: '1985-04-17', sexo: 'F',
    telefone: '(84) 99999-1234', nome_social: null, rg: '1234567', etnia: null, estado_civil: 'Casada',
    email: 'maria@email.com', gestante: false, peso_kg: 68.5, altura_m: 1.62,
    endereco: { cep: '59000-000', logradouro: 'Rua das Flores', numero: '120' },
    alergias: ['Dipirona'], medicacoes_continuas: ['Losartana 50mg'], observacoes_gerais: 'Paciente com jejum confirmado.',
  },
  exames: [{ codigo: 'VDRL' }, { codigo: 'FR' }],
  medico_solicitante: { nome: 'Dr. Rafael Andrade', conselho: 'CRM', uf: 'RN', numero_inscricao: '12345', telefone: '(84) 3222-0000', email: 'rafael@clinica.com' },
  convenio: { nome: 'Unimed', numero_carteira: '0123456789', validade: '2027-12-31', numero_guia: '987654' },
})

const corpo = (texto: string, contentLength?: number) => {
  const bytes = new TextEncoder().encode(texto)
  let i = 0
  return {
    headers: { get: (n: string) => (n === 'content-length' && contentLength !== undefined ? String(contentLength) : null) },
    // entrega em pedaços de 16 KB, como a rede
    body: new ReadableStream<Uint8Array>({
      pull(c) { if (i >= bytes.length) return c.close(); c.enqueue(bytes.slice(i, i + 16384)); i += 16384 },
    }),
  }
}

const valida = (b: unknown) => validarCampos(limparCorpo(b).ok ? (limparCorpo(b) as { valor: unknown }).valor : b, AGORA)

describe('(a) tamanho do corpo', () => {
  it('acima de 256 KB é recusado pelos bytes lidos, mesmo sem ou com Content-Length falso', async () => {
    const grande = JSON.stringify({ x: 'a'.repeat(LIMITES_PEDIDO.corpoBytes) })
    expect((await lerCorpoLimitado(corpo(grande))).ok).toBe(false)
    expect((await lerCorpoLimitado(corpo(grande, 100))).ok).toBe(false)
    expect((await lerCorpoLimitado(corpo('{}', 300 * 1024))).ok).toBe(false)
    expect(FALHA_CORPO_GRANDE).toMatchObject({ status: 413, error: 'PAYLOAD_TOO_LARGE' })
  })
  it('até 256 KB é lido inteiro, com acentos', async () => {
    const r = await lerCorpoLimitado(corpo(JSON.stringify({ nome: 'João ' + 'b'.repeat(200000) })))
    expect(r.ok && JSON.parse(r.texto).nome.startsWith('João ')).toBe(true)
  })
})

describe('(b) exames', () => {
  it('51 exames retornam 422 TOO_MANY_EXAMS; 50 passam', () => {
    const b = pedidoValido()
    b.exames = Array.from({ length: 51 }, (_, i) => ({ codigo: `E${i}` }))
    expect(valida(b)).toMatchObject({ status: 422, error: 'TOO_MANY_EXAMS' })
    b.exames = b.exames.slice(0, 50)
    expect(valida(b)).toBeNull()
  })
  it('código com mais de 20 caracteres é recusado com a posição', () => {
    const b = pedidoValido()
    b.exames = [{ codigo: 'VDRL' }, { codigo: 'X'.repeat(21) }]
    expect(valida(b)).toMatchObject({ error: 'VALIDATION_ERROR', campo: 'exames[1].codigo' })
  })
})

describe('(c) protocolo_parceiro', () => {
  it('com espaço ou símbolo é inválido; ausente continua opcional', () => {
    for (const p of ['PED 1', 'PED#1', 'PED/1', "PED'1", 'x'.repeat(65), { a: 1 }]) expect(lerProtocolo({ protocolo_parceiro: p }).ok, String(p)).toBe(false)
    expect(lerProtocolo({})).toEqual({ ok: true, valor: null })
    expect(lerProtocolo({ protocolo_parceiro: ' PED-2026_01.A ' })).toEqual({ ok: true, valor: 'PED-2026_01.A' })
  })
  it('um protocolo aceito no POST é consultável no GET', async () => {
    const r = lerProtocolo({ protocolo_parceiro: 'PED-2026_01.A' })
    expect(r.ok).toBe(true)
    const ref = (r as { valor: string }).valor
    expect(referenciaValida(ref)).toBe(true)
    const linha = { id: 'po', company_id: 'e', partner_id: 'p', protocolo_parceiro: ref, attendance_order_id: null, status: 'received', created_at: '2026-11-18T10:00:00Z', payload: {} }
    const db = { from: () => { const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q, then: (ok: any) => Promise.resolve({ data: [linha] }).then(ok) }; return q } }
    const res = await consultarPedidoParceiro(db, { companyId: 'e', partnerId: 'p', ref })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ protocolo_parceiro: ref, status: 'AGUARDANDO_AUTORIZACAO' })
  })
})

describe('(d) tamanho dos campos', () => {
  const casos: [string, (b: any) => void][] = [
    ['paciente.nome', b => { b.paciente.nome = 'a'.repeat(201) }],
    ['paciente.nome_social', b => { b.paciente.nome_social = 'a'.repeat(201) }],
    ['paciente.observacoes_gerais', b => { b.paciente.observacoes_gerais = 'a'.repeat(2001) }],
    ['atendimento.observacao_atendimento', b => { b.atendimento = { observacao_atendimento: 'a'.repeat(2001) } }],
    ['atendimento.leito', b => { b.atendimento = { leito: 'a'.repeat(201) } }],
    ['paciente.endereco.bairro', b => { b.paciente.endereco.bairro = 'a'.repeat(201) }],
    ['paciente.rg', b => { b.paciente.rg = 'a'.repeat(201) }],
    ['paciente.alergias', b => { b.paciente.alergias = Array.from({ length: 51 }, (_, i) => `A${i}`) }],
    ['paciente.medicacoes_continuas[0]', b => { b.paciente.medicacoes_continuas = ['a'.repeat(201)] }],
    ['paciente.peso_kg', b => { b.paciente.peso_kg = 501 }],
    ['paciente.altura_m', b => { b.paciente.altura_m = '2,9' }],
    ['atendimento.peso_kg', b => { b.atendimento = { peso_kg: 0.1 } }],
  ]
  for (const [campo, mexe] of casos) {
    it(`${campo} acima do limite retorna 422 com o nome do campo`, () => {
      const b = pedidoValido(); mexe(b)
      expect(valida(b)).toMatchObject({ status: 422, error: 'VALIDATION_ERROR', campo })
    })
  }
  it('no limite exato passa; vírgula decimal continua aceita', () => {
    const b: any = pedidoValido()
    b.paciente.nome = 'a'.repeat(200); b.paciente.observacoes_gerais = 'a'.repeat(2000)
    b.paciente.peso_kg = '0,2'; b.paciente.altura_m = '2,8'; b.atendimento = { peso_kg: '500', altura_m: 0.2 }
    b.paciente.alergias = 'Dipirona; Penicilina, Látex'
    expect(valida(b)).toBeNull()
  })
})

describe('(e) formato', () => {
  const casos: [string, (b: any) => void][] = [
    ['paciente.email', b => { b.paciente.email = 'maria@' }],
    ['paciente.email', b => { b.paciente.email = 'maria email.com' }],
    ['medico_solicitante.email', b => { b.medico_solicitante.email = 'a@b' }],
    ['paciente.telefone', b => { b.paciente.telefone = '1234-567' }],
    ['paciente.telefone', b => { b.paciente.telefone = '+55 (84) 99999-12345' }],
    ['paciente.data_nascimento', b => { b.paciente.data_nascimento = '30/02/1990' }],
    ['paciente.data_nascimento', b => { b.paciente.data_nascimento = '1990-02-30' }],
    ['paciente.data_nascimento', b => { b.paciente.data_nascimento = '2026-11-19' }],
    ['paciente.data_nascimento', b => { b.paciente.data_nascimento = '31/12/1899' }],
    ['paciente.data_nascimento', b => { b.paciente.data_nascimento = '17-04-1985' }],
    ['convenio.validade', b => { b.convenio.validade = '31/02/2027' }],
  ]
  for (const [campo, mexe] of casos) {
    it(`${campo} inválido retorna 422`, () => {
      const b = pedidoValido(); mexe(b)
      expect(valida(b)).toMatchObject({ status: 422, error: 'VALIDATION_ERROR', campo })
    })
  }
  it('datas reais, bissexto e formato brasileiro passam; data_nascimento continua opcional', () => {
    expect(dataDoCalendario('29/02/2024')).toEqual({ ano: 2024, mes: 2, dia: 29 })
    expect(dataDoCalendario('2023-02-29')).toBeNull()
    const b: any = pedidoValido()
    b.paciente.data_nascimento = '01/01/1900'; b.paciente.telefone = '84 3222-0000'; b.convenio.validade = '2027-12-31T00:00:00Z'
    expect(valida(b)).toBeNull()
    delete b.paciente.data_nascimento
    expect(valida(b)).toBeNull()
  })
})

describe('(f) texto livre', () => {
  it('remove controle e direção de texto, apara, e mantém quebras só nas observações', () => {
    expect(limparTexto('  Ma\u0000ria\u202E Sou\u0007za\u2066 \u007F ')).toBe('Maria Souza')
    expect(limparTexto('linha 1\r\nlinha 2\n\u000Blinha 3', true)).toBe('linha 1\nlinha 2\nlinha 3')
    const r = limparCorpo({ paciente: { nome: ' João\nda Silva ', observacoes_gerais: ' Jejum\n12h\u0001 ' }, atendimento: { observacao_atendimento: 'a\nb' }, exames: [' VDRL\u200E'] }) as { valor: any }
    expect(r.valor.paciente).toEqual({ nome: 'João da Silva', observacoes_gerais: 'Jejum\n12h' })
    expect(r.valor.atendimento.observacao_atendimento).toBe('a\nb')
  })
  it('não faz escape nem remove HTML', () => {
    expect(limparTexto('<b>Dor & febre</b>')).toBe('<b>Dor & febre</b>')
  })
  it('JSON profundo demais é recusado', () => {
    let o: any = 'x'
    for (let i = 0; i < 40; i++) o = { o }
    expect(limparCorpo(o).ok).toBe(false)
  })
})

describe('(h) pedido válido', () => {
  it('o exemplo do /docs continua passando sem mudanças nos campos', () => {
    const b = pedidoValido()
    const r = limparCorpo(b) as { ok: true; valor: unknown }
    expect(r.valor).toEqual(b)
    expect(validarCampos(r.valor, AGORA)).toBeNull()
  })
})

describe('(i) erro nunca repete o valor enviado', () => {
  it('nenhuma mensagem de validação contém o conteúdo', () => {
    const marca = 'SEGREDO_DO_PACIENTE'
    const mexidas: ((b: any) => void)[] = [
      b => { b.paciente.email = `${marca}@` },
      b => { b.paciente.telefone = `${marca}1` },
      b => { b.paciente.data_nascimento = `${marca}` },
      b => { b.paciente.nome_social = marca.repeat(20) },
      b => { b.paciente.peso_kg = marca },
      b => { b.exames = [{ codigo: marca + marca }] },
      b => { b.paciente.alergias = [marca.repeat(20)] },
    ]
    for (const mexe of mexidas) {
      const b = pedidoValido(); mexe(b)
      const f = valida(b)
      expect(f).not.toBeNull()
      expect(JSON.stringify(f)).not.toContain(marca)
    }
  })
})

describe('teto da fila no servidor da API', () => {
  it('QUEUE_FULL vira 429 com escopo; erro de banco deixa passar', async () => {
    const cheio = { rpc: async () => ({ data: { permitido: false, retry_after: 0, error_code: 'QUEUE_FULL', escopo: 'parceiro', limite: 500 }, error: null }) }
    expect(await verificarPostParceiro(cheio, 'p', 'e')).toMatchObject({ permitido: false, errorCode: 'QUEUE_FULL', escopo: 'parceiro', limite: 500 })
    const quebrado = { rpc: async () => ({ data: null, error: { message: 'timeout' } }) }
    const spy = console.error; console.error = () => {}
    expect((await verificarPostParceiro(quebrado, 'p', 'e')).permitido).toBe(true)
    console.error = spy
  })
  it('uma única chamada ao banco por POST para limite + fila', async () => {
    let chamadas = 0
    const db = { rpc: async (fn: string) => { chamadas++; expect(fn).toBe('api_partner_post_pre'); return { data: { permitido: true, retry_after: 0 }, error: null } } }
    await verificarPostParceiro(db, 'p', 'e')
    expect(chamadas).toBe(1)
  })
})
