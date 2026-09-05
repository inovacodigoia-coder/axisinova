/**
 * URLs públicas da API de Parceiros.
 * O domínio do site (custom domain) serve apenas o app web — ele NÃO roteia
 * as Edge Functions. Por isso as chamadas de integração usam o host de API.
 */
const API_HOST = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

export const PARTNER_API_ROOT = API_HOST
export const PARTNER_TOKEN_URL = `${API_HOST}/functions/v1/oauth-token`
export const PARTNER_ORDERS_URL = `${API_HOST}/functions/v1/partner-orders`
