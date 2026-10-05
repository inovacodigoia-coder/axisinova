// Cifra AES-GCM do token da instância uazapi (compartilhado entre whatsapp-instancia e whatsapp-fila-worker).
const chave = async () => {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(Deno.env.get('WHATSAPP_TOKEN_KEY') ?? ''))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
const fromHex = (h: string) => new Uint8Array((h.replace(/^\\x/, '').match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)))

export async function cifrar(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chave(), new TextEncoder().encode(token)))
  const out = new Uint8Array(12 + c.length); out.set(iv); out.set(c, 12)
  return '\\x' + toHex(out)
}

export async function decifrar(bytea: string) {
  const b = fromHex(bytea)
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, await chave(), b.slice(12))
  return new TextDecoder().decode(p)
}
