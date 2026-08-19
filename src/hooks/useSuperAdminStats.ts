import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { MOCK_DASHBOARD_METRICS, MOCK_MONTHLY_SIGNUPS, MOCK_PLAN_DISTRIBUTION, MOCK_SYSTEM_ALERTS } from '@/mocks/superadmin.mock'
import { DashboardMetrics } from '@/types/superadmin.types'

export function useSuperAdminStats() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(MOCK_DASHBOARD_METRICS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRealStats() {
      try {
        const { count: totalCompanies, error: companiesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'deleted')

        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        if (!companiesError && totalCompanies !== null && totalCompanies > 0) {
          setMetrics(prev => ({
            ...prev,
            totalCompanies: totalCompanies,
            activeUsersToday: totalUsers || 0
          }))
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRealStats()
  }, [])

  return {
    metrics,
    monthlySignups: MOCK_MONTHLY_SIGNUPS,
    planDistribution: MOCK_PLAN_DISTRIBUTION,
    alerts: MOCK_SYSTEM_ALERTS,
    loading
  }
}
