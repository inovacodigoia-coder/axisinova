import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Liberação do módulo "Parceiros (Integração via API)" por empresa.
 * Persistido na tabela `companies` (colunas partner_api_*), controlado pelo Super Admin.
 */
export interface PartnerApiEntitlement {
  enabled: boolean
  maxPartners: number
  releasedAt: string | null
  releasedBy: string | null
  note: string
}

export const DEFAULT_ENTITLEMENT: PartnerApiEntitlement = {
  enabled: false,
  maxPartners: 1,
  releasedAt: null,
  releasedBy: null,
  note: '',
}

let entitlements: Record<string, PartnerApiEntitlement> = {}
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

interface Row {
  partner_api_enabled: boolean | null
  partner_api_max_partners: number | null
  partner_api_released_at: string | null
  partner_api_released_by: string | null
  partner_api_note: string | null
}

function fromRow(r: Row): PartnerApiEntitlement {
  return {
    enabled: !!r.partner_api_enabled,
    maxPartners: r.partner_api_max_partners ?? 1,
    releasedAt: r.partner_api_released_at,
    releasedBy: r.partner_api_released_by,
    note: r.partner_api_note || '',
  }
}

export async function loadPartnerApiEntitlement(companyId: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('partner_api_enabled, partner_api_max_partners, partner_api_released_at, partner_api_released_by, partner_api_note')
    .eq('id', companyId)
    .maybeSingle()
  if (error || !data) return
  entitlements[companyId] = fromRow(data as unknown as Row)
  emit()
}

export function getPartnerApiEntitlement(companyId?: string | null): PartnerApiEntitlement {
  if (companyId && entitlements[companyId]) return entitlements[companyId]
  return DEFAULT_ENTITLEMENT
}

export function usePartnerApiEntitlement(companyId?: string | null): PartnerApiEntitlement {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (companyId) void loadPartnerApiEntitlement(companyId)
  }, [companyId])

  if (companyId && all[companyId]) return all[companyId]
  return DEFAULT_ENTITLEMENT
}

export async function setPartnerApiEntitlement(companyId: string, patch: Partial<PartnerApiEntitlement>) {
  if (!companyId) return
  const base = entitlements[companyId] ?? DEFAULT_ENTITLEMENT
  const next = { ...base, ...patch }
  entitlements[companyId] = next
  emit()

  const row: Record<string, unknown> = {}
  if (patch.enabled !== undefined) row.partner_api_enabled = patch.enabled
  if (patch.maxPartners !== undefined) row.partner_api_max_partners = patch.maxPartners
  if (patch.releasedAt !== undefined) row.partner_api_released_at = patch.releasedAt
  if (patch.releasedBy !== undefined) row.partner_api_released_by = patch.releasedBy
  if (patch.note !== undefined) row.partner_api_note = patch.note
  if (Object.keys(row).length === 0) return

  const { error } = await supabase.from('companies').update(row).eq('id', companyId)
  if (error) {
    await loadPartnerApiEntitlement(companyId)
    throw new Error(error.message)
  }
}
