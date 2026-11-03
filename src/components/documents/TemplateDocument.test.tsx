import {it,expect} from 'vitest'
import {render} from '@testing-library/react'
import {TemplateDocument} from './TemplateDocument'
import type {DocumentTemplate} from '@/lib/documentTemplates'

const header={laboratoryName:'LABORATÓRIO MUNICIPAL DE TOUROS'}
const values={
  paciente_nome:'MARIA DA SILVA',
  responsavel_nome:'JOÃO DA SILVA',
  responsavel_tecnico_nome:'ALAN KEVEN DA SILVA OLIVEIRA',
  responsavel_tecnico_registro:'CRF - 6327 - RN',
  local_data_extenso:'TOUROS, segunda-feira, 2 de novembro de 2026'
}
const modelo=(signature_mode:string):DocumentTemplate=>({id:'one',company_id:null,name:'Declaração de Comparecimento',type:'declaracao',body_html:'<p>Declaração</p>',default_format:'A4',signature_mode,is_active:true,is_system_default:true,source_template_id:null})

it('assinatura da empresa sai em branco, sem nome, cargo ou registro do responsável técnico',()=>{
  const {container}=render(<TemplateDocument template={modelo('empresa')} values={values} header={header} format="A4"/>)
  const footer=container.querySelector('.template-signatures')!
  expect(footer.textContent).not.toContain('ALAN KEVEN')
  expect(footer.textContent).not.toContain('CRF')
  expect(footer.textContent).not.toContain('Responsável da empresa')
  expect(footer.textContent).toContain('TOUROS, segunda-feira, 2 de novembro de 2026')
  expect(container.querySelectorAll('.border-t')).toHaveLength(1)
})

it('assinatura do paciente continua com nome e rótulo, ao lado da linha em branco da empresa',()=>{
  const {container}=render(<TemplateDocument template={modelo('paciente_empresa')} values={values} header={header} format="A4"/>)
  const footer=container.querySelector('.template-signatures')!
  expect(footer.textContent).toContain('MARIA DA SILVA')
  expect(footer.textContent).toContain('Paciente')
  expect(footer.textContent).not.toContain('ALAN KEVEN')
  expect(footer.textContent).not.toContain('CRF')
  expect(container.querySelectorAll('.border-t')).toHaveLength(2)
})
