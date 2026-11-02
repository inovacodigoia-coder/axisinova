import { describe, it, expect, vi } from 'vitest'
import { dispatchHospitalPdf, missingPrintType, validCompanionLimit } from './hospitalLabels'
import { imprimirDireto } from './impressaoLocal'
vi.mock('./impressaoLocal',()=>({imprimirDireto:vi.fn()}))
describe('regras de impressão hospitalar',()=>{
  it('limite inteiro mínimo 1',()=>{expect(validCompanionLimit(1)).toBe(true);expect(validCompanionLimit(0)).toBe(false);expect(validCompanionLimit(1.5)).toBe(false)})
  it('tipo ausente é distinto de falha no servidor',()=>{expect(missingPrintType(new Error('Tipo etiqueta_paciente não configurado'))).toBe(true);expect(missingPrintType(new Error('Servidor indisponível'))).toBe(false)})
  it('aguarda confirmação local antes de indicar sucesso',async()=>{vi.mocked(imprimirDireto).mockResolvedValueOnce({ok:true,mensagem:'OK'});expect(await dispatchHospitalPdf('etiqueta_paciente',new Blob(),true)).toBe('confirmado')})
  it('erro de conexão não dispara fallback ou sucesso',async()=>{vi.mocked(imprimirDireto).mockRejectedValueOnce(new Error('Conexão recusada'));await expect(dispatchHospitalPdf('etiqueta_acompanhante',new Blob(),true)).rejects.toThrow('Conexão recusada')})
})