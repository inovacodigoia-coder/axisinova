export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`
  return formatCurrency(value)
}

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('pt-BR').format(typeof date === 'string' ? new Date(date) : date)

export const formatDateLong = (date: string | Date): string =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    typeof date === 'string' ? new Date(date) : date
  )

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${new Intl.DateTimeFormat('pt-BR').format(d)} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ontem'
  return `há ${days} dias`
}

export const formatTime = (time: string): string => time

export const formatCPF = (cpf?: string): string => {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const maskCPF = (cpf?: string): string => {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')
}

export const maskCardNumber = (card: string): string =>
  card.replace(/(\d{4})(\d+)(\d{4})/, '$1 **** **** $3')

export const formatCNPJ = (cnpj?: string): string => {
  if (!cnpj) return ''
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export const formatPhone = (phone?: string): string => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

export const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export const formatAge = (birthDate: string): string => {
  const age = calculateAge(birthDate)
  return `${age} ${age === 1 ? 'ano' : 'anos'}`
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export const formatPercent = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('pt-BR').format(value)

export const getDayName = (date: Date): string =>
  date.toLocaleDateString('pt-BR', { weekday: 'long' })

export const getDayNameShort = (date: Date): string =>
  date.toLocaleDateString('pt-BR', { weekday: 'short' })

export const formatGender = (gender?: string): string => {
  switch (String(gender || '').toLowerCase()) {
    case 'male': return 'Masculino'
    case 'female': return 'Feminino'
    case 'other': return 'Outro'
    case 'not_informed': return 'Não informado'
    default: return gender || 'Não informado'
  }
}

export const formatAddress = (address?: any): string => {
  if (!address) return ''
  return [
    address.street,
    address.number,
    address.complement,
    address.neighborhood,
    address.city,
    address.state,
    address.cep
  ].filter(Boolean).join(', ')
}
