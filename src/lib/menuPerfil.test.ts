import { describe, expect, it } from 'vitest'
import type { Profile } from '@/types/permissions.types'
import {
  acaoSorotecaDaRota,
  itemComumVisivelNoPerfil,
  perfilTemPermissaoEspecial,
  perfilTemVisaoAdministrativa,
} from './menuPerfil'

const perfil = (code: number, permissions: Record<string, string[]>): Profile => ({
  id: String(code),
  code,
  name: 'Perfil de teste',
  companyId: 'empresa-teste',
  permissions,
  isActive: true,
  createdBy: 'admin',
  createdAt: '',
  updatedAt: '',
})

describe('visibilidade do menu pelo perfil ativo', () => {
  it('mantém a visão completa no perfil administrativo padrão', () => {
    const administrador = perfil(9000, {})
    expect(perfilTemVisaoAdministrativa('company_admin', administrador)).toBe(true)
    expect(perfilTemPermissaoEspecial('company_admin', administrador, 'soroteca', ['soroteca.ver'])).toBe(true)
  })

  it('oculta a Soroteca quando o administrador troca para um perfil sem essa permissão', () => {
    const bioquimico = perfil(2000, { lab: ['lab.painel_operacional'] })
    expect(perfilTemVisaoAdministrativa('company_admin', bioquimico)).toBe(false)
    expect(perfilTemPermissaoEspecial('company_admin', bioquimico, 'soroteca', ['soroteca.ver'])).toBe(false)
    expect(perfilTemPermissaoEspecial('company_admin', bioquimico, 'lab', ['lab.painel_operacional'])).toBe(true)
  })

  it('não concede visão administrativa a um usuário comum usando o perfil de código 9000', () => {
    const administrador = perfil(9000, {})
    expect(perfilTemVisaoAdministrativa('receptionist', administrador)).toBe(false)
    expect(perfilTemPermissaoEspecial('receptionist', administrador, 'soroteca', ['soroteca.ver'])).toBe(false)
  })

  it('mostra a Soroteca somente com soroteca.ver no perfil selecionado', () => {
    const semAcesso = perfil(2000, { serotheque: ['view'] })
    const comAcesso = perfil(2000, { soroteca: ['soroteca.ver'] })
    expect(perfilTemPermissaoEspecial('company_admin', semAcesso, 'soroteca', ['soroteca.ver'])).toBe(false)
    expect(perfilTemPermissaoEspecial('company_admin', comAcesso, 'soroteca', ['soroteca.ver'])).toBe(true)
  })

  it('usa a permissão específica de cada item da Soroteca', () => {
    expect(acaoSorotecaDaRota('/app/soroteca')).toBe('ver')
    expect(acaoSorotecaDaRota('/app/soroteca/consulta')).toBe('ver')
    expect(acaoSorotecaDaRota('/app/soroteca/rastreabilidade')).toBe('ver')
    expect(acaoSorotecaDaRota('/app/soroteca/entrada')).toBe('armazenar')
    expect(acaoSorotecaDaRota('/app/soroteca/descarte')).toBe('descartar')
    expect(acaoSorotecaDaRota('/app/soroteca/estrutura')).toBe('configurar')
    expect(acaoSorotecaDaRota('/app/soroteca/configuracoes')).toBe('configurar')
  })

  it('não permite que a liberação do setor contorne uma negação do perfil', () => {
    expect(itemComumVisivelNoPerfil(false, true)).toBe(false)
    expect(itemComumVisivelNoPerfil(true, false)).toBe(false)
    expect(itemComumVisivelNoPerfil(true, true)).toBe(true)
  })
})
