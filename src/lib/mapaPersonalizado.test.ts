import { describe, expect, it } from 'vitest'
import { agruparPorBancada, ordenarPacientes } from './mapaPersonalizado'

const bancadas = [
  { id: 'uri', name: 'Urinálise', reportOrder: 10 },
  { id: 'bio', name: 'Bioquímica I', reportOrder: 1 },
  { id: 'hem', name: 'Hematologia II', reportOrder: 2 },
]

describe('mapa personalizado', () => {
  it('segue a ordem das bancadas e não a ordem do pedido', () => {
    const grupos = agruparPorBancada(
      [
        { sigla: 'SUMA', nome: 'Sumário de Urina', workbenchId: 'uri' },
        { sigla: 'HEMO', nome: 'Hemograma', workbenchId: 'hem' },
        { sigla: 'GLIC', nome: 'Glicose', workbenchId: 'bio' },
      ],
      bancadas,
    )
    expect(grupos.map(g => `${g.numero} ${g.bancadaNome}`)).toEqual(['01 BIOQUÍMICA I', '02 HEMATOLOGIA II', '10 URINÁLISE'])
  })

  it('mantém a ordem do pedido dentro da mesma bancada', () => {
    const [bio] = agruparPorBancada(
      [
        { sigla: 'TRIG', nome: 'Triglicerídeos', workbenchId: 'bio' },
        { sigla: 'COL', nome: 'Colesterol', workbenchId: 'bio' },
        { sigla: 'UREI', nome: 'Ureia', workbenchId: 'bio' },
      ],
      bancadas,
    )
    expect(bio.exames.map(e => e.sigla)).toEqual(['TRIG', 'COL', 'UREI'])
  })

  it('bancada sem ordem cadastrada vai para o fim, sem número', () => {
    const grupos = agruparPorBancada(
      [
        { sigla: 'ABO', nome: 'Grupo sanguíneo', workbenchId: 'x', bancadaNome: 'Hematologia I' },
        { sigla: 'GLIC', nome: 'Glicose', workbenchId: 'bio' },
      ],
      bancadas,
    )
    expect(grupos.map(g => [g.numero, g.bancadaNome])).toEqual([['01', 'BIOQUÍMICA I'], ['', 'HEMATOLOGIA I']])
  })

  it('ordena pacientes pelo nome e depois pelo pedido', () => {
    const lista = ordenarPacientes([
      { paciente: 'LUKAS JOBI', codigo: '12-08' },
      { paciente: 'ÁLVARO SILVA', codigo: '3-08' },
      { paciente: 'JESICA COSTA', codigo: '10-09' },
      { paciente: 'JESICA COSTA', codigo: '2-09' },
    ])
    expect(lista.map(p => `${p.paciente} ${p.codigo}`)).toEqual([
      'ÁLVARO SILVA 3-08',
      'JESICA COSTA 2-09',
      'JESICA COSTA 10-09',
      'LUKAS JOBI 12-08',
    ])
  })
})
