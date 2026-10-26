import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
export interface FinanceiroAcesso { company_id: string; ver: boolean; lancar: boolean; baixar: boolean; cancelar: boolean; configurar: boolean }
export function useFinanceiroAcesso() {
  const { user } = useAuth()
  const [acesso, setAcesso] = useState<FinanceiroAcesso | null>(null)
  useEffect(() => {
    let active = true
    setAcesso(null)
    void supabase.rpc('financeiro_meu_acesso').then(({ data }) => {
      if (active) setAcesso(data as unknown as FinanceiroAcesso)
    })
    return () => { active = false }
  }, [user?.id, user?.companyId])
  return acesso
}