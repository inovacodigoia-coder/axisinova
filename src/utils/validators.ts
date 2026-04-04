export const validateCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== parseInt(clean[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  return rest === parseInt(clean[10])
}

export const validateCNPJ = (cnpj: string): boolean => {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) return false
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) sum += parseInt(clean[i]) * weights1[i]
  let rest = sum % 11
  const d1 = rest < 2 ? 0 : 11 - rest
  if (parseInt(clean[12]) !== d1) return false
  sum = 0
  for (let i = 0; i < 13; i++) sum += parseInt(clean[i]) * weights2[i]
  rest = sum % 11
  const d2 = rest < 2 ? 0 : 11 - rest
  return parseInt(clean[13]) === d2
}

export const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const validatePhone = (phone: string): boolean =>
  /^\d{10,11}$/.test(phone.replace(/\D/g, ''))

export const validateCEP = (cep: string): boolean =>
  /^\d{8}$/.test(cep.replace(/\D/g, ''))

export const validateCRM = (crm: string): boolean =>
  /^\d{4,6}$/.test(crm.replace(/\D/g, ''))

export const validateDate = (date: string): boolean => {
  const d = new Date(date)
  return !isNaN(d.getTime()) && d <= new Date()
}

export const validatePasswordStrength = (password: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito Forte'
  color: string
  checks: { hasMinLength: boolean; hasUppercase: boolean; hasNumber: boolean; hasSpecial: boolean }
} => {
  const checks = {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const passed = Object.values(checks).filter(Boolean).length as 0 | 1 | 2 | 3 | 4
  const labels: Record<number, 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito Forte'> = { 0: 'Muito Fraca', 1: 'Fraca', 2: 'Média', 3: 'Forte', 4: 'Muito Forte' }
  const colors: Record<number, string> = { 0: 'hsl(0 72% 51%)', 1: 'hsl(0 72% 51%)', 2: 'hsl(43 74% 49%)', 3: 'hsl(145 63% 42%)', 4: 'hsl(145 63% 42%)' }
  return { score: passed, label: labels[passed], color: colors[passed], checks }
}
