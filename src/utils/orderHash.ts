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

/**
 * Código completo da amostra: <ordem>-<origem>-<tubo>-<idEmpresa>
 * Ex.: protocolo "16-00", tubo 1, empresa 1 => "16-00-1-1"
 */
export function buildSampleCode(
  protocol: string,
  tubeIndex: number,
  companySequenceId?: number | null
): string {
  const base = `${String(protocol || '').trim()}-${tubeIndex}`
  return companySequenceId ? `${base}-${companySequenceId}` : base
}

/**
 * Hash alfanumérico determinístico POR TUBO (amostra).
 * Mesmo código de amostra => sempre o mesmo hash de 9 caracteres.
 */
export function generateSampleHash(sampleCode: string): string {
  const input = String(sampleCode || '').toUpperCase()
  if (!input) return ''
  // FNV-1a de 32 bits (duas passadas com sementes distintas para ampliar o espaço)
  const fnv = (seed: number) => {
    let h = seed >>> 0
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h >>> 0
  }
  const a = fnv(0x811c9dc5)
  const b = fnv(0x9e3779b9)
  const raw = (a.toString(36) + b.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const hash = (raw + '000000000').slice(0, 9)
  // Primeiro caractere sempre uma letra (nunca número)
  // Primeiro caractere sempre uma letra e último sempre um número
  const firstLetter = String.fromCharCode(65 + (parseInt(hash.charAt(0), 36) % 26))
  const lastDigit = String(parseInt(hash.charAt(hash.length - 1), 36) % 10)
  return firstLetter + hash.slice(1, -1) + lastDigit
}
