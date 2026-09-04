import { useSyncExternalStore } from 'react'

/**
 * Liberação do módulo "Parceiros (Integração via API)" por empresa.
 * Etapa 3: mock local (sem persistência real).
 */
export interface PartnerApiEntitlement {
  enabled: boolean
  maxPartners: number
  releasedAt: string | null
  releasedBy: string | null
  note: string
}

const CURRENT_KEY = '__current__'

export const DEFAULT_ENTITLEMENT: PartnerApiEntitlement = {
  enabled: true,
  maxPartners: 5,
  releasedAt: null,
  releasedBy: null,
  note: '',
}

let entitlements: Record<string, PartnerApiEntitlement> = {
  [CURRENT_KEY]: { ...DEFAULT_ENTITLEMENT },
}

const listeners = new Set<() => void>()

function emit() {
  entitlements = { ...entitlements }
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot() {
  return entitlements
}

export function getPartnerApiEntitlement(companyId?: string | null): PartnerApiEntitlement {
  if (companyId && entitlements[companyId]) return entitlements[companyId]
  return entitlements[CURRENT_KEY] ?? DEFAULT_ENTITLEMENT
}

export function usePartnerApiEntitlement(companyId?: string | null): PartnerApiEntitlement {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  if (companyId && all[companyId]) return all[companyId]
  return all[CURRENT_KEY] ?? DEFAULT_ENTITLEMENT
}

export function setPartnerApiEntitlement(companyId: string, patch: Partial<PartnerApiEntitlement>) {
  const base = entitlements[companyId] ?? entitlements[CURRENT_KEY] ?? DEFAULT_ENTITLEMENT
  const next = { ...base, ...patch }
  entitlements[companyId] = next
  // Espelha no "atual" para que a tela da empresa (mock) reflita a decisão do Super Admin.
  entitlements[CURRENT_KEY] = next
  emit()
}
