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

/** Resolves with null if the promise takes longer than `ms` (never hangs the login). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, () => { clearTimeout(t); resolve(null) })
  })
}

async function callGuard(payload: Record<string, unknown>): Promise<LockState | null> {
  try {
    const res = await withTimeout(supabase.functions.invoke('auth-guard', { body: payload }), 6000)
    if (!res || res.error) return null
    return (res.data ?? null) as LockState | null
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

/** Falha passageira do servidor: sem resposta (tempo esgotado), sem status ou status 5xx. */
export function isTransientAuthFailure(res: { error?: { status?: number } | null } | null): boolean {
  if (!res) return true
  const err = res.error
  if (!err) return false
  return !err.status || err.status >= 500
}

/**
 * Repete automaticamente a chamada quando o servidor falha por um instante
 * (ex.: "context canceled" 500 ou tempo esgotado). Erro de senha (400) nunca é repetido.
 */
export async function retryTransient<T extends { error?: { status?: number } | null }>(
  attempt: () => Promise<T>,
  opts: { timeouts?: number[]; delays?: number[]; sleep?: (ms: number) => Promise<void> } = {},
): Promise<T | null> {
  const timeouts = opts.timeouts ?? [12000, 10000, 10000]
  const delays = opts.delays ?? [1500, 3000]
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let last: T | null = null
  for (let i = 0; i < timeouts.length; i++) {
    last = await withTimeout(attempt(), timeouts[i])
    if (!isTransientAuthFailure(last)) return last
    if (i < timeouts.length - 1) await sleep(delays[i] ?? delays[delays.length - 1] ?? 1000)
  }
  return last
}
