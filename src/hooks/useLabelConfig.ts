import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface LabelConfig {
  widthMm: number
  heightMm: number
  marginMm: number
  rotation: number
  copies: number
  autoFit: boolean
  preset: string | null
  fontHeader: number
  fontCode: number
  fontPatient: number
  fontSmall: number
  fontFooter: number
  barcodeHeightPx: number
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
  widthMm: 50,
  heightMm: 30,
  marginMm: 1.5,
  rotation: 0,
  copies: 1,
  autoFit: true,
  preset: null,
  fontHeader: 10,
  fontCode: 12,
  fontPatient: 10,
  fontSmall: 9.5,
  fontFooter: 8,
  barcodeHeightPx: 24,
}

const fromRow = (row: any): LabelConfig => ({
  widthMm: Number(row?.label_width_mm ?? DEFAULT_LABEL_CONFIG.widthMm),
  heightMm: Number(row?.label_height_mm ?? DEFAULT_LABEL_CONFIG.heightMm),
  marginMm: Number(row?.label_margin_mm ?? DEFAULT_LABEL_CONFIG.marginMm),
  rotation: Number(row?.label_rotation ?? 0),
  copies: Number(row?.label_copies ?? 1),
  autoFit: row?.label_auto_fit ?? true,
  preset: row?.label_preset ?? null,
  fontHeader: Number(row?.label_font_header ?? DEFAULT_LABEL_CONFIG.fontHeader),
  fontCode: Number(row?.label_font_code ?? DEFAULT_LABEL_CONFIG.fontCode),
  fontPatient: Number(row?.label_font_patient ?? DEFAULT_LABEL_CONFIG.fontPatient),
  fontSmall: Number(row?.label_font_small ?? DEFAULT_LABEL_CONFIG.fontSmall),
  fontFooter: Number(row?.label_font_footer ?? DEFAULT_LABEL_CONFIG.fontFooter),
  barcodeHeightPx: Number(row?.label_barcode_height_px ?? DEFAULT_LABEL_CONFIG.barcodeHeightPx),
})

export const toRow = (c: LabelConfig) => ({
  label_width_mm: c.widthMm,
  label_height_mm: c.heightMm,
  label_margin_mm: c.marginMm,
  label_rotation: c.rotation,
  label_copies: c.copies,
  label_auto_fit: c.autoFit,
  label_preset: c.preset,
  label_font_header: c.fontHeader,
  label_font_code: c.fontCode,
  label_font_patient: c.fontPatient,
  label_font_small: c.fontSmall,
  label_font_footer: c.fontFooter,
  label_barcode_height_px: c.barcodeHeightPx,
})

export function useLabelConfig() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [config, setConfig] = useState<LabelConfig>(DEFAULT_LABEL_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    if (!companyId) { setIsLoading(false); return }
    setIsLoading(true)
    const { data, error } = await supabase
      .from('lab_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()
    if (error) console.error('Erro ao carregar configuração de etiqueta:', error)
    setConfig(data ? fromRow(data) : DEFAULT_LABEL_CONFIG)
    setIsLoading(false)
  }, [companyId])

  useEffect(() => { void load() }, [load])

  const save = useCallback(async (next: LabelConfig) => {
    if (!companyId) throw new Error('Empresa não identificada.')
    setIsSaving(true)
    try {
      const { data: existing } = await supabase
        .from('lab_settings')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase.from('lab_settings').update(toRow(next)).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('lab_settings')
          .insert({ company_id: companyId, ...toRow(next) })
        if (error) throw error
      }
      setConfig(next)
    } finally {
      setIsSaving(false)
    }
  }, [companyId])

  return { config, setConfig, save, reload: load, isLoading, isSaving }
}
