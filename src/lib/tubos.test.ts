import { describe, it, expect } from 'vitest'
import { tuboAutomatico, materialSemTubo, tuboDoExame } from '@/lib/tubos'

const legado = (nome: string) => ({ nome, legado: true, recipiente_id: null })

describe('aviso de material sem tubo', () => {
  it('Soro antigo usa o tubo GEL automático e não conta como sem tubo', () => {
    expect(tuboAutomatico(legado('Soro'))?.sigla).toBe('GEL')
    expect(materialSemTubo(legado('Soro'))).toBe(false)
  })
  it('Sangue total com EDTA antigo usa EDTA automático', () => {
    expect(tuboAutomatico(legado('Sangue total com EDTA'))?.sigla).toBe('EDTA')
  })
  it('Líquor antigo continua sem tubo (na etiqueta sairia TUBO NÃO DEFINIDO)', () => {
    expect(tuboAutomatico(legado('Líquor'))).toBeNull()
    expect(materialSemTubo(legado('Líquor'))).toBe(true)
    expect(tuboDoExame({ material: 'Líquor' })).toBe('indef')
  })
  it('material novo (não antigo) sem tubo continua com aviso', () => {
    expect(materialSemTubo({ nome: 'Soro', legado: false, recipiente_id: null })).toBe(true)
  })
})
