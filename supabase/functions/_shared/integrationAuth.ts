// Autenticação das integrações máquina-a-máquina.
// Suporta OAuth2 (Bearer <access_token>) e a API Key legada (X-API-Key).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { avaliarCliente, carregarCliente } from './parceiroAcesso.ts'

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function base64url(bytes: Uint8Array) {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const b64urlDecode = (input: string) => {
  const pad = input.length % 4 ? '='.repeat(4 - (input.length % 4)) : ''
  return atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad)
}

const signingKey = async () => {
  const secret = Deno.env.get('INTEGRATION_OAUTH_SIGNING_KEY')
  if (!secret) throw new Error('INTEGRATION_OAUTH_SIGNING_KEY não configurada')
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signAccessToken(payload: Record<string, unknown>) {
  const key = await signingKey()
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)))
  const data = `${header}.${body}`
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
  return `${data}.${base64url(sig)}`
}

export async function verifyAccessToken(token: string): Promise<Record<string, any> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const key = await signingKey()
    const sig = Uint8Array.from(b64urlDecode(parts[2]), (c) => c.charCodeAt(0))
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sig,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    )
    if (!valid) return null
    const payload = JSON.parse(b64urlDecode(parts[1]))
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
    if (payload.iss !== 'axisinova') return null
    return payload
  } catch {
    return null
  }
}

export type IntegrationAuth =
  | {
      ok: true
      companyId: string
      scopes: string[]
      method: 'oauth2' | 'api_key'
      /** client_id OAuth2 do token (null na API Key) */
      clientId: string | null
      /** parceiro dono da credencial (null em credencial de equipamento ou API Key) */
      partnerId: string | null
    }
  | { ok: false; status: number; error: string; code: 'UNAUTHORIZED' | 'PARTNER_NOT_AUTHORIZED' | 'FORBIDDEN' }

/**
 * Autentica a requisição. `requiredScope` só é exigido no fluxo OAuth2;
 * a API Key legada continua com acesso total (compatibilidade).
 */
export async function authenticateIntegration(
  req: Request,
  supabase: SupabaseClient,
  requiredScope?: string,
): Promise<IntegrationAuth> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    const payload = await verifyAccessToken(token)
    if (payload?.company_id) {
      // Token assinado não basta: credencial e parceiro são conferidos a cada chamada,
      // então revogar, regenerar ou desativar bloqueia na hora (sem esperar o exp).
      const clientId = String(payload.sub ?? '')
      const client = await carregarCliente(supabase, clientId)
      const acesso = await avaliarCliente(supabase, client)
      if (!acesso.ok) return { ok: false, status: acesso.status, error: acesso.message, code: acesso.code }
      if (String(acesso.client.company_id) !== String(payload.company_id)) {
        return { ok: false, status: 401, error: 'Token de acesso inválido ou expirado', code: 'UNAUTHORIZED' }
      }
      const scopes: string[] = String(payload.scope ?? '').split(' ').filter(Boolean)
      if (requiredScope && !scopes.includes(requiredScope)) {
        return { ok: false, status: 403, error: `Token sem o escopo necessário: ${requiredScope}`, code: 'FORBIDDEN' }
      }
      await supabase
        .from('integration_oauth_clients')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', acesso.client.id)
      return {
        ok: true,
        companyId: String(acesso.client.company_id),
        scopes,
        method: 'oauth2',
        clientId,
        partnerId: acesso.partnerId,
      }
    }
    // Bearer inválido só é erro se não houver API Key como alternativa
    if (!req.headers.get('X-API-Key') && !req.headers.get('x-api-key')) {
      return { ok: false, status: 401, error: 'Token de acesso inválido ou expirado', code: 'UNAUTHORIZED' }
    }
  }

  const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key')
  if (!apiKey) {
    return { ok: false, status: 401, error: 'Credenciais ausentes: envie Authorization: Bearer <token> ou X-API-Key', code: 'UNAUTHORIZED' }
  }

  const keyHash = await sha256Hex(apiKey.trim())
  const { data: keyRow } = await supabase
    .from('instrument_integration_keys')
    .select('id, company_id, is_active, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (!keyRow || !keyRow.is_active || keyRow.revoked_at) {
    return { ok: false, status: 401, error: 'Chave de integração inválida ou revogada', code: 'UNAUTHORIZED' }
  }

  await supabase
    .from('instrument_integration_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)

  return {
    ok: true,
    companyId: keyRow.company_id as string,
    scopes: ['exams:read', 'orders:read', 'results:write'],
    method: 'api_key',
    clientId: null,
    partnerId: null,
  }
}
