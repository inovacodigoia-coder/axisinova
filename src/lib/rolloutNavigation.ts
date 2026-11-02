export function rolloutNavigationAllowed(path: string, almoxEnabled: boolean, overrides?: Record<string, boolean>): boolean {
  if (path === '/app/estoque/solicitacoes' || path === '/app/farmacia/solicitacoes') {
    return almoxEnabled && overrides?.[path] === true
  }
  if (path.startsWith('/app/estoque') || path === '/app/farmacia/estoque') return almoxEnabled
  return true
}