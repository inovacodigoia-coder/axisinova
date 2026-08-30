import { NAV_SECTIONS } from '@/components/company/CompanySidebar'
import type { SystemModule, PermissionAction } from '@/types/permissions.types'

type CanAccess = (module: SystemModule, action?: PermissionAction) => boolean

/**
 * Retorna a primeira rota visível do menu para o perfil/setor ativo.
 * Se o Dashboard estiver liberado, ele continua sendo a rota inicial.
 */
export function getLandingRoute(
  canAccess: CanAccess,
  activeSector?: { moduleOverrides?: Record<string, boolean> } | null
): string {
  const isVisible = (item: { path: string; module: SystemModule | null }) => {
    const override = activeSector?.moduleOverrides?.[item.path]
    if (override !== undefined) return override
    return !item.module || canAccess(item.module, 'view')
  }

  const items = NAV_SECTIONS.flatMap(s => s.items)

  const dashboard = items.find(i => i.path === '/app/dashboard')
  if (dashboard && isVisible(dashboard)) return '/app/dashboard'

  const first = items.find(i => i.path !== '/app/dashboard' && isVisible(i))
  return first?.path || '/app/dashboard'
}
