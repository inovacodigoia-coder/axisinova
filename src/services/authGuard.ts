import { supabase } from '@/integrations/supabase/client'

export interface LockState {
  locked: boolean
  lock_type?: 'identifier' | 'ip'
  expires_at?: string
  retry_after_seconds?: number
}

/** Generic message — never reveals whether the account exists. */
export const GENERIC_LOGIN_ERROR = 'Usuário ou senha inválidos'

export function lockoutMessage(retryAfterSeconds?: number): string {
  const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 900) / 60))
  return `Muitas tentativas. Tente novamente em ${minutes} minuto${minutes > 1 ? 's' : ''}.`
}

async function callGuard(payload: Record<string, unknown>): Promise<LockState | null> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-guard', { body: payload })
    if (error) return null
    return (data ?? null) as LockState | null
  } catch {
    return null
  }
}

export function checkLockout(identifier: string) {
  return callGuard({ action: 'check', identifier })
}

export function recordLoginAttempt(identifier: string, success: boolean) {
  return callGuard({ action: 'record', identifier, success })
}
