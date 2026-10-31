import { describe,it,expect } from 'vitest'
import { documentValues,effectiveTemplates,renderDocument,sanitizeDocument,validateDocument,type DocumentTemplate } from './documentTemplates'
const t=(id:string,overrides:Partial<DocumentTemplate>={}):DocumentTemplate=>({id,company_id:null,name:'Modelo',type:'termo',body_html:'<p>{{paciente_nome}}</p>',default_format:'A4',signature_mode:'paciente',is_active:true,is_system_default:true,source_template_id:null,...overrides})
describe('modelos de documentos',()=>{
  it('personalização substitui padrão sem duplicar',()=>expect(effectiveTemplates([t('1'),t('2'),t('3',{company_id:'empresa',is_system_default:false,source_template_id:'1'})]).map(t=>t.id)).toEqual(['2','3']))
  it('restauração torna padrão disponível',()=>expect(effectiveTemplates([t('1')]).map(t=>t.id)).toEqual(['1']))
  it('variável ausente sai como linha',()=>expect(renderDocument('<p>{{paciente_rg}}</p>',{})).toBe('<p>______</p>'))
  it('rejeita variável desconhecida',()=>expect(()=>validateDocument('<p>{{xyz}}</p>')).toThrow('Campo {{xyz}} não existe'))
  it('escapa dados pessoais',()=>expect(renderDocument('<p>{{paciente_nome}}</p>',{paciente_nome:'<img src=x onerror=alert(1)>'})).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>'))
  it('remove script handlers e estilos',()=>expect(sanitizeDocument('<p onclick="alert(1)" style="position:fixed; text-align: center"><script>alert(1)</script>Seguro</p>')).toBe('<p style="text-align: center;">Seguro</p>'))
  it('emissão usa São Paulo e português',()=>{const v=documentValues({}, {}, {cidade:'TOUROS'}, {},new Date('2026-10-31T01:00:00Z'));expect(v.local_data_extenso).toBe('TOUROS, sexta-feira, 30 de outubro de 2026');expect(v.hora_impressao).toBe('22:00')})
  it('nascimento e idade respeitam aniversário',()=>{const v=documentValues({}, {birth_date:'1990-10-31'}, {}, {},new Date('2026-10-30T15:00:00Z'));expect(v.paciente_data_nascimento).toBe('31/10/1990');expect(v.paciente_idade).toBe('35 anos')})
  it('lista usa código interno nunca TUSS',()=>expect(documentValues({lab_guides:[{exams:[{code:'HEM',name:'Hemograma',tussCode:'40304361'}]}]}, {}, {},{}).lista_exames).toBe('HEM — Hemograma'))
  it('horários não registrados ficam ausentes',()=>{const v=documentValues({created_at:'2026-10-30T12:00:00Z'}, {}, {},{});expect(v.atendimento_hora_inicio).toBe('');expect(v.atendimento_hora_fim).toBe('')})
})