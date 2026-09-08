import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { LabelConfig, defaultLabelConfig, normalizeLabelConfig } from '@/types/label-config.types'

export function useLabelConfig() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [config, setConfig] = useState<LabelConfig>(defaultLabelConfig)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    const { data, error } = await supabase
      .from('lab_settings')
      .select('label_config')
      .eq('company_id', companyId)
      .maybeSingle()
    if (error) console.error('Erro ao carregar configuração de etiqueta:', error)
    setConfig(normalizeLabelConfig((data as { label_config?: unknown } | null)?.label_config))
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { void load() }, [load])

  const save = useCallback(async (next: LabelConfig) => {
    if (!companyId) throw new Error('Empresa não identificada.')
    const clean = normalizeLabelConfig(next)
    const { data: existing } = await supabase
      .from('lab_settings')
      .select('id')
      .eq('company_id', companyId)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase
        .from('lab_settings')
        .update({ label_config: clean as never })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('lab_settings')
        .insert({ company_id: companyId, label_config: clean as never })
      if (error) throw error
    }
    setConfig(clean)
    return clean
  }, [companyId])

  return { config, setConfig, isLoading, reload: load, save }
}
