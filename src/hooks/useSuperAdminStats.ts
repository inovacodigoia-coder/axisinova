import { MOCK_DASHBOARD_METRICS, MOCK_MONTHLY_SIGNUPS, MOCK_PLAN_DISTRIBUTION, MOCK_SYSTEM_ALERTS } from '@/mocks/superadmin.mock'

export function useSuperAdminStats() {
  return {
    metrics: MOCK_DASHBOARD_METRICS,
    monthlySignups: MOCK_MONTHLY_SIGNUPS,
    planDistribution: MOCK_PLAN_DISTRIBUTION,
    alerts: MOCK_SYSTEM_ALERTS,
  }
}
