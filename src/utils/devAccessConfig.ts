// Config for the "Acessos para teste" panel shown on the login page.
// Source of truth is the backend (system_settings.dev_access_panel) so that the
// super admin toggle applies to every browser and to the published site.
// localStorage is kept only as an offline cache to avoid flicker.

import { supabase } from '@/integrations/supabase/client'

export interface DevAccessCredential {
  id: string
  label: string
  email: string
  password: string
}

export interface DevAccessConfig {
  enabled: boolean
  credentials: DevAccessCredential[]
}

const STORAGE_KEY = 'axisinova:dev-access-config'
const SETTINGS_KEY = 'dev_access_panel'

// No credentials are shipped in the bundle. The panel stays empty/disabled
// unless a super admin configures it in the backend.
export const DEFAULT_DEV_CREDENTIALS: DevAccessCredential[] = []

export const DEFAULT_DEV_ACCESS_CONFIG: DevAccessConfig = {
  enabled: false,
  credentials: DEFAULT_DEV_CREDENTIALS,
}

function normalize(parsed: Partial<DevAccessConfig> | null | undefined): DevAccessConfig {
  return {
    enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : false,
    credentials: Array.isArray(parsed?.credentials) ? parsed!.credentials! : DEFAULT_DEV_CREDENTIALS,
  }
}

/** Synchronous read from the local cache (may be stale — always refresh with fetchDevAccessConfig). */
export function loadDevAccessConfig(): DevAccessConfig {
  if (typeof window === 'undefined') return DEFAULT_DEV_ACCESS_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DEV_ACCESS_CONFIG
    return normalize(JSON.parse(raw))
  } catch {
    return DEFAULT_DEV_ACCESS_CONFIG
  }
}

/** Authoritative read from the backend. Falls back to the local cache when offline. */
export async function fetchDevAccessConfig(): Promise<DevAccessConfig> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error) throw error
    if (!data) return loadDevAccessConfig()

    const config = normalize(data.value as unknown as Partial<DevAccessConfig>)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch {}
    return config
  } catch {
    return loadDevAccessConfig()
  }
}

/** Persists to the backend (super admin only) and updates the local cache. */
export async function saveDevAccessConfig(config: DevAccessConfig): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: SETTINGS_KEY, value: config as any }, { onConflict: 'key' })

  if (error) throw error

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch {}
  window.dispatchEvent(new CustomEvent('dev-access-config-changed'))
}

