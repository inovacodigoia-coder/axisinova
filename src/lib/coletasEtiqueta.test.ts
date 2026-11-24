import { describe, it, expect, vi } from 'vitest'
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }))
import { bancadaEtiquetaSeparada, etiquetasDosExames, examesDoTubo, refsEtiqueta, tubosDosExames } from '@/lib/tubos'
import { normalizarColetas, etiquetasExtrasDoExame } from '@/lib/coletasEtiqueta'

const totg = { examId: 'x1', code: 'TOTG', name: 'Curva Glicêmica', material: 'Soro', coletasEtiqueta: [{ nome: 'JEJUM' }, { nome: '120 MIN' }] }
const ureia = { examId: 'x2', code: 'UREIA', name: 'Ureia', material: 'Soro' }
const hemo = { examId: 'x3', code: 'HEMO', name: 'Hemograma', material: 'Sangue total EDTA' }

describe('Coletas em tempos diferentes (TOTG)', () => {
  it('TOTG 2 dosagens gera 1 etiqueta a mais', () => {
    expect(etiquetasExtrasDoExame(totg)).toBe(1)
    expect(etiquetasDosExames([totg])).toHaveLength(2)
  })

  it('a 1ª coleta vai no tubo comum junto com as outras amostras', () => {
    const lista = etiquetasDosExames([ureia, totg, hemo])
    // gel (ureia + totg jejum), edta, e a etiqueta própria de 120 min
    expect(lista).toHaveLength(3)
    expect(examesDoTubo([ureia, totg, hemo], lista[0]).map(e => e.code)).toEqual(['UREIA', 'TOTG'])
    expect(lista[2].extra?.coleta).toBe('120 MIN')
    expect(examesDoTubo([ureia, totg, hemo], lista[2]).map(e => e.code)).toEqual(['TOTG'])
  })

  it('as etiquetas extras vêm depois dos tubos comuns, sem mudar o número deles', () => {
    const comuns = tubosDosExames([ureia, totg, hemo]).map(t => t.type)
    expect(etiquetasDosExames([ureia, totg, hemo]).slice(0, comuns.length).map(t => t.type)).toEqual(comuns)
  })

  it('o nome da coleta sai ao lado do código do exame', () => {
    const exams = [ureia, totg]
    const [comum, extra] = etiquetasDosExames(exams)
    expect(refsEtiqueta(comum, exams, e => e.code)).toEqual(['UREIA', 'TOTG JEJUM'])
    expect(refsEtiqueta(extra, exams, e => e.code)).toEqual(['TOTG 120 MIN'])
  })

  it('quantidade definida no exame: 3 coletas = 2 etiquetas a mais', () => {
    const t3 = { ...totg, coletasEtiqueta: [{ nome: 'JEJUM' }, { nome: '60 MIN' }, { nome: '120 MIN' }] }
    expect(etiquetasDosExames([t3])).toHaveLength(3)
  })

  it('exame sem a opção (ou com só 1 coleta) não gera etiqueta a mais', () => {
    expect(etiquetasDosExames([ureia, hemo])).toHaveLength(2)
    expect(normalizarColetas([{ nome: 'JEJUM' }])).toEqual([])
  })
})

describe('Etiquetas da bancada Testes Rápidos', () => {
  const rapido = { examId: 'tr1', code: 'HIV', name: 'HIV', material: 'Soro', etiquetaSeparada: 'testes_rapidos' }
  it('classifica somente pela bancada, com ou sem acento', () => {
    expect(bancadaEtiquetaSeparada('Testes Rápidos')).toBe('testes_rapidos')
    expect(bancadaEtiquetaSeparada('TESTES RAPIDOS')).toBe('testes_rapidos')
    expect(bancadaEtiquetaSeparada('BIOQUÍMICA')).toBeUndefined()
  })
  it('não mistura teste rápido com exame comum e mantém os índices comuns', () => {
    const exams = [ureia, hemo, rapido]
    const tubes = etiquetasDosExames(exams)
    expect(tubes.map(t => t.type)).toEqual(['gel', 'edta', 'separado:testes_rapidos:gel'])
    expect(examesDoTubo(exams, tubes[0]).map(e => e.code)).toEqual(['UREIA'])
    expect(examesDoTubo(exams, tubes[2]).map(e => e.code)).toEqual(['HIV'])
    expect(tubes[2].baseType).toBe('gel')
  })
  it('testes rápidos do mesmo material compartilham apenas o tubo separado', () => {
    const exams = [ureia, rapido, { ...rapido, examId: 'tr2', code: 'SIF' }]
    const tubes = etiquetasDosExames(exams)
    expect(tubes).toHaveLength(2)
    expect(examesDoTubo(exams, tubes[1]).map(e => e.code)).toEqual(['HIV', 'SIF'])
  })
  it('pedido só de testes rápidos não ganha etiqueta vazia nem muda o índice do tubo', () => {
    const tubes = etiquetasDosExames([rapido])
    expect(tubes).toHaveLength(1)
    expect(tubes[0].type).toBe('gel')
    expect(examesDoTubo([rapido], tubes[0])).toEqual([rapido])
  })
  it('não reclassifica pedidos históricos pelo nome do exame ou bancada', () => {
    const antigo = { ...rapido, etiquetaSeparada: undefined, name: 'HIV Teste Rápido', bancadaNome: 'Testes Rápidos' }
    const tubes = etiquetasDosExames([ureia, antigo])
    expect(tubes).toHaveLength(1)
    expect(examesDoTubo([ureia, antigo], tubes[0]).map(e => e.code)).toEqual(['UREIA', 'HIV'])
  })
})
