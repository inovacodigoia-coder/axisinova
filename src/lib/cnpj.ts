export const onlyDigits = (v: string) => (v || '').replace(/\D/g, '')

export function maskCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function isValidCnpj(v: string): boolean {
  const c = onlyDigits(v)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const s = w.reduce((acc, wi, i) => acc + Number(c[i]) * wi, 0)
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13])
}
