// Configuração global: ocultar os valores dos planos na landing page.
// Fonte da verdade é o backend (system_settings.landing_pricing_visibility),
// para que o toggle do super admin valha para todos os navegadores e o site publicado.
// localStorage é apenas cache offline para evitar flicker.

import { supabase } from '@/integrations/supabase/client'

const STORAGE_KEY = 'axisinova:pricing-visibility'
const SETTINGS_KEY = 'landing_pricing_visibility'

export interface PricingVisibilityConfig {
  hidden: boolean
}

export const DEFAULT_PRICING_VISIBILITY: PricingVisibilityConfig = { hidden: false }

function normalize(parsed: Partial<PricingVisibilityConfig> | null | undefined): PricingVisibilityConfig {
  return { hidden: typeof parsed?.hidden === 'boolean' ? parsed.hidden : false }
}

/** Leitura síncrona do cache local (pode estar desatualizado — sempre atualize com fetchPricingVisibility). */
export function loadPricingVisibility(): PricingVisibilityConfig {
  if (typeof window === 'undefined') return DEFAULT_PRICING_VISIBILITY
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PRICING_VISIBILITY
    return normalize(JSON.parse(raw))
  } catch {
    return DEFAULT_PRICING_VISIBILITY
  }
}

/** Leitura autoritativa do backend. Cai no cache local quando offline. */
export async function fetchPricingVisibility(): Promise<PricingVisibilityConfig> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()

    if (error) throw error
    if (!data) return loadPricingVisibility()

    const config = normalize(data.value as unknown as Partial<PricingVisibilityConfig>)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch {}
    return config
  } catch {
    return loadPricingVisibility()
  }
}

/** Persiste no backend (somente super admin) e atualiza o cache local. */
export async function savePricingVisibility(config: PricingVisibilityConfig): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: SETTINGS_KEY, value: config as any }, { onConflict: 'key' })

  if (error) throw error

  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)) } catch {}
  window.dispatchEvent(new CustomEvent('pricing-visibility-changed'))
}
