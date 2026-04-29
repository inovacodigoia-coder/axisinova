// =====================================================================
// Máscaras e validadores do módulo de Pacientes
// =====================================================================

// ─── MÁSCARAS DE INPUT ────────────────────────────────────────────────
export const maskCPF = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

export const maskRG = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 9)
  if (d.length <= 7) {
    return d
      .replace(/(\d{1})(\d)/, '$1.$2')
      .replace(/(\d{1})\.(\d{3})(\d)/, '$1.$2.$3')
  }
  return d
    .replace(/(\d{1})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
}

export const maskPhone = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export const maskCEP = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

export const maskCNS = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 15)
  return d
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{3}) (\d{4})(\d)/, '$1 $2 $3')
    .replace(/(\d{3}) (\d{4}) (\d{4})(\d)/, '$1 $2 $3 $4')
}

export const maskMonthYear = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 6)
  return d.replace(/(\d{2})(\d)/, '$1/$2')
}

// detectar celular vs fixo: se 3º dígito após DDD for "9", é celular
export const detectPhoneType = (phone: string): 'mobile' | 'landline' => {
  const d = phone.replace(/\D/g, '')
  if (d.length < 10) return 'mobile'
  return d[2] === '9' ? 'mobile' : 'landline'
}

// ─── MÁSCARAS DE EXIBIÇÃO (privacidade) ───────────────────────────────
export const formatCPFDisplay = (cpf?: string): string => {
  if (!cpf) return ''
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const maskCPFPrivate = (cpf?: string): string => {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')
}

export const maskCardPrivate = (card?: string): string => {
  if (!card) return '—'
  const d = card.replace(/\s/g, '')
  if (d.length < 8) return d
  return `${d.slice(0, 4)} **** **** ${d.slice(-4)}`
}

export const formatPhoneDisplay = (phone?: string): string => {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

// ─── VALIDADORES ──────────────────────────────────────────────────────
const BLACKLIST_CPF = new Set([
  '00000000000', '11111111111', '22222222222', '33333333333',
  '44444444444', '55555555555', '66666666666', '77777777777',
  '88888888888', '99999999999', '12345678909',
])

export const isValidCPF = (cpf: string): boolean => {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (BLACKLIST_CPF.has(d)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let dv1 = (sum * 10) % 11
  if (dv1 === 10) dv1 = 0
  if (dv1 !== parseInt(d[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  let dv2 = (sum * 10) % 11
  if (dv2 === 10) dv2 = 0
  return dv2 === parseInt(d[10])
}

export const isValidEmail = (email: string): boolean => {
  if (!email) return false
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())
}

export const isValidBirthDate = (date: string): { ok: boolean; reason?: string } => {
  if (!date) return { ok: false, reason: 'Obrigatório' }
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return { ok: false, reason: 'Data inválida' }
  const now = new Date()
  if (d > now) return { ok: false, reason: 'Data não pode ser futura' }
  const limit = new Date()
  limit.setFullYear(limit.getFullYear() - 150)
  if (d < limit) return { ok: false, reason: 'Data muito antiga' }
  return { ok: true }
}

export const isValidName = (name: string): boolean => {
  if (!name) return false
  const trimmed = name.trim()
  if (trimmed.length < 3) return false
  return trimmed.split(/\s+/).filter(Boolean).length >= 2
}

export const isValidCEP = (cep: string): boolean => /^\d{5}-?\d{3}$/.test(cep.trim())

// ─── HELPERS ──────────────────────────────────────────────────────────
export const calculateAge = (birthDate?: string): number | undefined => {
  if (!birthDate) return undefined
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return undefined
  const today = new Date()
  let age = today.getFullYear() - b.getFullYear()
  const m = today.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
  return age
}

export const isMinor = (birthDate?: string): boolean => {
  const age = calculateAge(birthDate)
  return age !== undefined && age < 18
}

// Similaridade simples (Dice coefficient sobre bigrams) — para detecção de duplicata
export const stringSimilarity = (a: string, b: string): number => {
  const x = a.toLowerCase().trim()
  const y = b.toLowerCase().trim()
  if (x === y) return 1
  if (x.length < 2 || y.length < 2) return 0
  const bigrams = (s: string) => {
    const out: string[] = []
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2))
    return out
  }
  const a1 = bigrams(x)
  const b1 = bigrams(y)
  const map = new Map<string, number>()
  a1.forEach(g => map.set(g, (map.get(g) || 0) + 1))
  let matches = 0
  b1.forEach(g => {
    const c = map.get(g) || 0
    if (c > 0) {
      matches++
      map.set(g, c - 1)
    }
  })
  return (2 * matches) / (a1.length + b1.length)
}

// CEP via ViaCEP
export interface ViaCEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  erro?: boolean
}

export const fetchCEP = async (cep: string): Promise<ViaCEPResponse | null> => {
  const d = cep.replace(/\D/g, '')
  if (d.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`)
    if (!res.ok) return null
    const data: ViaCEPResponse = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}
