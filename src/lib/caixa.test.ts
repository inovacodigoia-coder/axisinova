import {expect,it} from 'vitest'
import {valorPorExtenso} from './caixa'
it('recibo descreve reais e centavos sem perder centavos',()=>{expect(valorPorExtenso(140.50)).toBe('cento e quarenta reais e cinquenta centavos');expect(valorPorExtenso(1.01)).toBe('um real e um centavo');expect(valorPorExtenso(1000000)).toBe('um milhão de reais')})