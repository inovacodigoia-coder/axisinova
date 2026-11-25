import type { Profile } from '@/types/permissions.types'

export type PerfilMenu = Pick<Profile, 'code' | 'permissions'> | null

/** O perfil administrativo padrão mantém a visão completa; os demais perfis são restritivos. */
export function perfilTemVisaoAdministrativa(role: string | undefined, perfil: PerfilMenu): boolean {
  const administrador = role === 'super_admin' || role === 'company_admin'
  return administrador && (!perfil || perfil.code === 9000)
}

/** Permissões especiais ficam em grupos próprios, como soroteca, lab e financeiro. */
export function perfilTemPermissaoEspecial(
  role: string | undefined,
  perfil: PerfilMenu,
  grupo: string,
  codigos: string[],
): boolean {
  if (perfilTemVisaoAdministrativa(role, perfil)) return true
  if (!perfil) return false
  const permissoes = (perfil.permissions as Record<string, unknown>)[grupo]
  return Array.isArray(permissoes) && codigos.some(codigo => permissoes.includes(codigo))
}

/** Um setor pode restringir um item, mas não pode reativar algo negado pelo perfil. */
export function itemComumVisivelNoPerfil(perfilPermite: boolean, overrideDoSetor?: boolean): boolean {
  return perfilPermite && overrideDoSetor !== false
}

export type AcaoSorotecaMenu = 'ver' | 'armazenar' | 'descartar' | 'configurar'

export function acaoSorotecaDaRota(path: string): AcaoSorotecaMenu {
  if (path === '/app/soroteca/entrada') return 'armazenar'
  if (path === '/app/soroteca/descarte') return 'descartar'
  if (path === '/app/soroteca/estrutura' || path === '/app/soroteca/configuracoes') return 'configurar'
  return 'ver'
}
