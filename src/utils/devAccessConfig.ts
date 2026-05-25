// Dev-only config for the "Acessos para teste" panel shown on the login page.
// This is developer convenience data (not operational/business data), so
// localStorage is acceptable here. Managed from /superadmin/configuracoes.

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

export const DEFAULT_DEV_CREDENTIALS: DevAccessCredential[] = [
  { id: 'super', label: 'Super Admin', email: 'inovacodigoiaadm@inovacodigoia.com.br', password: 'Inov@codigoia2026' },
  { id: 'admin', label: 'Admin da Clínica Demo', email: 'admin@clinicademo.com.br', password: 'Admin@2025' },
  { id: 'medico', label: 'Médico Demo', email: 'medico@clinicademo.com.br', password: 'Medico@2025' },
  { id: 'recepcao', label: 'Recepção Demo', email: 'recepcao@clinicademo.com.br', password: 'Recepcao@2025' },
  { id: 'faturamento', label: 'Faturamento Demo', email: 'faturamento@clinicademo.com.br', password: 'Fatura@2025' },
]

export const DEFAULT_DEV_ACCESS_CONFIG: DevAccessConfig = {
  enabled: true,
  credentials: DEFAULT_DEV_CREDENTIALS,
}

export function loadDevAccessConfig(): DevAccessConfig {
  if (typeof window === 'undefined') return DEFAULT_DEV_ACCESS_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DEV_ACCESS_CONFIG
    const parsed = JSON.parse(raw) as Partial<DevAccessConfig>
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
      credentials: Array.isArray(parsed.credentials) ? parsed.credentials : DEFAULT_DEV_CREDENTIALS,
    }
  } catch {
    return DEFAULT_DEV_ACCESS_CONFIG
  }
}

export function saveDevAccessConfig(config: DevAccessConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent('dev-access-config-changed'))
}
