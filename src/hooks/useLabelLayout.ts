import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface LabelLayout {
  widthMm: number
  heightMm: number
  rotation: number
  copies: number
  preset?: string | null
}

export const DEFAULT_LABEL_LAYOUT: LabelLayout = {
  widthMm: 50,
  heightMm: 30,
  rotation: 0,
  copies: 1,
  preset: null,
}

function fromRow(row: Record<string, unknown> | null): LabelLayout {
  if (!row) return DEFAULT_LABEL_LAYOUT
  return {
    widthMm: Number(row.label_width_mm ?? 50) || 50,
    heightMm: Number(row.label_height_mm ?? 30) || 30,
    rotation: Number(row.label_rotation ?? 0) || 0,
    copies: Math.max(1, Number(row.label_copies ?? 1) || 1),
    preset: (row.label_preset as string) ?? null,
  }
}

/**
 * Configuração de etiqueta (Configurações do Laboratório › Impressora / Etiqueta).
 * Lê do backend e mantém sincronizado em tempo real para todas as novas impressões.
 */
export function useLabelLayout() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [layout, setLayout] = useState<LabelLayout>(DEFAULT_LABEL_LAYOUT)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('lab_settings')
      .select('label_width_mm,label_height_mm,label_rotation,label_copies,label_preset')
      .eq('company_id', companyId)
      .maybeSingle()
    setLayout(fromRow(data as Record<string, unknown> | null))
    setIsLoading(false)
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    void load()
    const channel = supabase
      .channel(`lab_settings_label_${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lab_settings', filter: `company_id=eq.${companyId}` },
        () => { void load() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [companyId, load])

  const save = useCallback(async (next: LabelLayout) => {
    if (!companyId) throw new Error('Empresa não identificada')
    const { error } = await supabase
      .from('lab_settings')
      .upsert(
        {
          company_id: companyId,
          label_width_mm: next.widthMm,
          label_height_mm: next.heightMm,
          label_rotation: next.rotation,
          label_copies: next.copies,
          label_preset: next.preset ?? null,
        },
        { onConflict: 'company_id' },
      )
    if (error) throw error
    setLayout(next)
  }, [companyId])

  return { layout, isLoading, save, reload: load }
}
