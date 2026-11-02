import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import type { HospitalContext } from '@/lib/hospitalLabels'
export function useHospitalPrintPermission(context: HospitalContext) {
  const { user } = useAuth()
  const [allowed, setAllowed] = useState(false)
  useEffect(() => { let active = true; setAllowed(false); if (user?.id) supabase.rpc('hospital_identificacao_permitida', { _context: context, _action: 'print' }).then(({ data, error }) => { if (active) setAllowed(!error && data === true) }); return () => { active = false } }, [context, user?.id, user?.companyId])
  return allowed
}