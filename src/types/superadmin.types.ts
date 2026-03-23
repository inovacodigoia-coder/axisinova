export interface DashboardMetrics {
  totalCompanies: number
  mrr: number
  activeUsersToday: number
  attendancesLast24h: number
  companiesGrowth: number
  mrrGrowth: number
  usersGrowth: number
  attendancesGrowth: number
}

export interface MonthlySignup {
  month: string
  count: number
}

export interface PlanDistribution {
  name: string
  value: number
  color: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  userEmail: string
  companyName: string | null
  action: string
  details: string
  severity: 'info' | 'warning' | 'critical'
  payload?: Record<string, unknown>
}

export interface SystemAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  actionLabel?: string
  createdAt: string
}

export interface PlanConfig {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceAnnual: number
  isPopular: boolean
  isVisible: boolean
  acceptingSignups: boolean
  features: string[]
  maxDoctors: number | null
  maxUsers: number | null
  storageGB: number
  companiesCount: number
}
