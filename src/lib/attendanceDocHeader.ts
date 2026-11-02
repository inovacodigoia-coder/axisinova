import type { LabSettingsData } from '@/hooks/useLabSettings'

/** Cabeçalho dos comprovantes vindo do cadastro do laboratório da empresa. */
export function companyHeaderFromSettings(settings: LabSettingsData | null | undefined) {
  const s = settings || {}
  const street = [s.address_street, s.address_number].filter(Boolean).join(', ')
  const city = [s.address_city, s.address_state].filter(Boolean).join('/')
  return {
    companyName: s.lab_name || s.report_header_title || '',
    companyAddress: [street, city].filter(Boolean).join(' · '),
    companyCNPJ: s.cnpj || '',
    companyPhone: s.phone || '',
    companyLogo: s.report_logo_primary_url || undefined,
  }
}

/** Converte "AAAA-MM-DD" (ou ISO) para "DD/MM/AAAA" sem deslocar fuso. */
export function formatBirthBR(value?: string | null): string {
  if (!value) return ''
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return String(value)
}

export function ageFromBirth(value?: string | null, now = new Date()): number | null {
  if (!value) return null
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/) || String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  const [y, mo, d] = m[1].length === 4 ? [+m[1], +m[2], +m[3]] : [+m[3], +m[2], +m[1]]
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--
  return age >= 0 ? age : null
}

export function birthWithAge(value?: string | null): string {
  const b = formatBirthBR(value)
  if (!b) return '—'
  const a = ageFromBirth(value)
  return a === null ? b : `${b} (${a} ${a === 1 ? 'ano' : 'anos'})`
}
