/**
 * Hash alfanumérico interno do PEDIDO (não da etiqueta).
 * Todas as etiquetas de um mesmo pedido compartilham o mesmo hash.
 * Formato: 9 caracteres alfanuméricos maiúsculos. Ex: S2DDW9NY6
 */
export function generateOrderHash(orderId: string, timestamp: number = Date.now()): string {
  const digits = String(orderId || '').replace(/\D/g, '') || '0'
  const base = (Number(digits) + timestamp).toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return (base + random).substring(0, 9)
}

/** Normaliza hashes legados (6 chars) para exibição em 9 caracteres. */
export function normalizeHash(hash?: string | null): string {
  const clean = String(hash || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return clean.slice(0, 9)
}
