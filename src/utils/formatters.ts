export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('pt-BR').format(new Date(date))

export const formatDateLong = (date: string): string =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))

export const formatRelativeTime = (date: string): string => {
  const diff = Date.now() - new Date(date).getTime()
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

export const maskCardNumber = (card: string): string =>
  card.replace(/(\d{4})(\d+)(\d{4})/, '$1 **** **** $3')

export const maskCPF = (cpf: string): string =>
  cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')

export const formatPhone = (phone: string): string =>
  phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')

export const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export const formatPercent = (value: number, decimals = 1): string =>
  `${value.toFixed(decimals)}%`

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('pt-BR').format(value)
