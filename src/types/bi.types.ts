export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

export interface KPIData {
  label: string
  value: number | string
  unit?: string
  trend: number
  trendDirection: 'up' | 'down' | 'neutral'
  trendIsPositive: boolean
  sparklineData: number[]
  target?: number
  targetReached?: boolean
}

export interface ChartDataPoint {
  label: string
  value: number
  value2?: number
  value3?: number
}

export interface DoctorProductionData {
  doctorId: string
  doctorName: string
  specialty: string
  consultations: number
  exams: number
  procedures: number
  totalAttendances: number
  revenue: number
  avgAttendanceTime: number
  absenteeRate: number
  rating?: number
}

export interface ConvenioData {
  convenioId: string
  convenioName: string
  attendances: number
  revenue: number
  glosaRate: number
  avgTicket: number
  percentage: number
}

export interface AlertData {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  category: 'financial' | 'operational' | 'quality' | 'compliance'
  title: string
  description: string
  value?: string
  action?: string
  actionRoute?: string
  detectedAt: string
}

export interface BIFilters {
  doctorId?: string
  convenioId?: string
  attendanceType?: string
}

export interface MonthlyData {
  month: string
  attendances: number
  revenue: number
  received: number
  glosa: number
  absentees: number
}

export interface HeatmapCell {
  day: string
  hour: string
  rate: number
}
