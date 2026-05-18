import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface PricingPlanRow {
  id: string
  slug: string
  name: string
  description: string | null
  price_monthly: number
  price_annual: number
  features: string[]
  max_doctors: number | null
  max_users: number | null
  storage_gb: number
  sort_order: number
  is_popular: boolean
  is_visible: boolean
}

function normalize(row: any): PricingPlanRow {
  return {
    ...row,
    features: Array.isArray(row.features) ? row.features : (row.features ? JSON.parse(row.features) : []),
  }
}

export function usePricingPlans(opts: { onlyVisible?: boolean } = {}) {
  const [plans, setPlans] = useState<PricingPlanRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('pricing_plans' as any).select('*').order('sort_order', { ascending: true })
    if (opts.onlyVisible) q = q.eq('is_visible', true)
    const { data, error } = await q
    if (error) {
      console.error('Erro ao carregar planos', error)
    } else {
      setPlans(((data as any[]) || []).map(normalize))
    }
    setLoading(false)
  }, [opts.onlyVisible])

  useEffect(() => { load() }, [load])

  const updatePlan = useCallback(async (id: string, patch: Partial<PricingPlanRow>) => {
    const payload: any = { ...patch }
    if (patch.features) payload.features = patch.features
    const { error } = await supabase.from('pricing_plans' as any).update(payload).eq('id', id)
    if (error) { toast.error('Erro ao salvar plano'); console.error(error); return false }
    toast.success('Plano atualizado')
    await load()
    return true
  }, [load])

  return { plans, loading, reload: load, updatePlan }
}
