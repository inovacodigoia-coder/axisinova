import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const SEM_ORIGENS: string[] = []

export interface UserOriginRestrictionState {
  loading: boolean
  error: string | null
  enabled: boolean
  originIds: string[]
  reload: () => Promise<void>
}

/** Lê a restrição opcional da Busca de Atendimentos; ausência de linha = todas as origens. */
export function useUserOriginRestriction(userId?: string | null, active = true): UserOriginRestrictionState {
  const [loading, setLoading] = useState(Boolean(active && userId))
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [originIds, setOriginIds] = useState<string[]>(SEM_ORIGENS)

  const reload = useCallback(async () => {
    if (!active || !userId) {
      setEnabled(false)
      setOriginIds(SEM_ORIGENS)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('user_attendance_origin_restrictions')
      .select('enabled, origin_ids')
      .eq('user_id', userId)
      .maybeSingle()

    if (queryError) {
      setEnabled(false)
      setOriginIds(SEM_ORIGENS)
      setError('Não foi possível verificar as origens permitidas. Tente novamente.')
    } else {
      setEnabled(data?.enabled === true)
      setOriginIds(data?.origin_ids ?? SEM_ORIGENS)
    }
    setLoading(false)
  }, [active, userId])

  useEffect(() => {
    let cancelled = false
    if (!active || !userId) {
      setEnabled(false)
      setOriginIds(SEM_ORIGENS)
      setError(null)
      setLoading(false)
      return () => { cancelled = true }
    }

    setLoading(true)
    setError(null)
    void supabase
      .from('user_attendance_origin_restrictions')
      .select('enabled, origin_ids')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setEnabled(false)
          setOriginIds(SEM_ORIGENS)
          setError('Não foi possível verificar as origens permitidas. Tente novamente.')
        } else {
          setEnabled(data?.enabled === true)
          setOriginIds(data?.origin_ids ?? SEM_ORIGENS)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [active, userId])

  return { loading, error, enabled, originIds, reload }
}
