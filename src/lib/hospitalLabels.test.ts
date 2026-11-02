import { describe, it, expect, vi } from 'vitest'
import { dispatchHospitalPdf, missingPrintType, validCompanionLimit } from './hospitalLabels'
import { imprimirDireto } from './impressaoLocal'
vi.mock('./impressaoLocal',()=>({imprimirDireto:vi.fn()}))
describe('regras de impressão hospitalar',()=>{
  it('limite inteiro mínimo 1',()=>{expect(validCompanionLimit(1)).toBe(true);expect(validCompanionLimit(0)).toBe(false);expect(validCompanionLimit(1.5)).toBe(false)})
  it('tipo ausente é distinto de falha no servidor',()=>{expect(missingPrintType(new Error('Tipo etiqueta_paciente não configurado'))).toBe(true);expect(missingPrintType(new Error('Servidor indisponível'))).toBe(false)})
  it('aguarda confirmação local antes de indicar sucesso',async()=>{vi.mocked(imprimirDireto).mockResolvedValueOnce({ok:true,mensagem:'OK'});expect(await dispatchHospitalPdf('etiqueta_paciente',new Blob())).toBe('confirmado')})
  it('erro de conexão não dispara fallback ou sucesso',async()=>{vi.mocked(imprimirDireto).mockRejectedValueOnce(new Error('Conexão recusada'));await expect(dispatchHospitalPdf('etiqueta_acompanhante',new Blob())).rejects.toThrow('Conexão recusada')})
  it('tipo ausente abre impressão do navegador sem reenviar ao servidor',async()=>{
    vi.mocked(imprimirDireto).mockRejectedValueOnce(new Error('Tipo etiqueta_acompanhante não configurado'))
    const frame=document.createElement('iframe')
    const print=vi.fn();Object.defineProperty(frame,'contentWindow',{value:{focus:vi.fn(),print}})
    const create=document.createElement.bind(document)
    const spy=vi.spyOn(document,'createElement').mockImplementation((tag:any)=>tag==='iframe'?frame:create(tag))
    URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn()
    const promise=dispatchHospitalPdf('etiqueta_acompanhante',new Blob())
    await vi.waitFor(()=>expect(frame.onload).toBeTypeOf('function'))
    frame.dispatchEvent(new Event('load'))
    expect(await promise).toBe('navegador');expect(print).toHaveBeenCalledTimes(1);frame.remove();spy.mockRestore()
  })
})