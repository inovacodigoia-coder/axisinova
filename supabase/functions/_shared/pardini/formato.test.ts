import { assert, assertFalse } from 'jsr:@std/assert'
import { formatoIdentico } from './resultado.ts'
const a = [{ chave: '1', nome: 'Ureia', unidade: 'mg/dL', tipo: 'numerico', casas: 0 }, { chave: '2', nome: 'Obs', unidade: '', tipo: 'alfanumerico', casas: null }]
Deno.test('formato idêntico mapeia sozinho', () => { assert(formatoIdentico(a, a.map((x, i) => ({ ...x, chave: 'n' + i, nome: x.nome.toUpperCase() })))) })
Deno.test('1 unidade diferente retém', () => { assertFalse(formatoIdentico(a, [{ ...a[0], unidade: 'mmol/L' }, a[1]])) })
Deno.test('ordem diferente retém', () => { assertFalse(formatoIdentico(a, [a[1], a[0]])) })
