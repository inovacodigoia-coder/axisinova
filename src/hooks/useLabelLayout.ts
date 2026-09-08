import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface LabelLayout {
  widthMm: number
  heightMm: number
  rotation: number
  copies: number
  preset?: string | null
  marginMm: number
  barcodeHeightPx: number
  autoFit: boolean
  fontHeader: number
  fontCode: number
  fontPatient: number
  fontSmall: number
  fontFooter: number
}

export const DEFAULT_LABEL_LAYOUT: LabelLayout = {
  widthMm: 50,
  heightMm: 30,
  rotation: 0,
  copies: 1,
  preset: null,
  marginMm: 1.5,
  barcodeHeightPx: 24,
  autoFit: true,
  fontHeader: 10,
  fontCode: 12,
  fontPatient: 10,
  fontSmall: 9,
  fontFooter: 8,
}

const num = (v: unknown, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function fromRow(row: Record<string, unknown> | null): LabelLayout {
  if (!row) return DEFAULT_LABEL_LAYOUT
  return {
    widthMm: num(row.label_width_mm, 50),
    heightMm: num(row.label_height_mm, 30),
    rotation: Number(row.label_rotation ?? 0) || 0,
    copies: Math.max(1, Number(row.label_copies ?? 1) || 1),
    preset: (row.label_preset as string) ?? null,
    marginMm: num(row.label_margin_mm, 1.5),
    barcodeHeightPx: num(row.label_barcode_height_px, 24),
    autoFit: row.label_auto_fit === undefined || row.label_auto_fit === null ? true : Boolean(row.label_auto_fit),
    fontHeader: num(row.label_font_header, 10),
    fontCode: num(row.label_font_code, 12),
    fontPatient: num(row.label_font_patient, 10),
    fontSmall: num(row.label_font_small, 9),
    fontFooter: num(row.label_font_footer, 8),
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
      .select('*')
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
          label_margin_mm: next.marginMm,
          label_barcode_height_px: Math.round(next.barcodeHeightPx),
          label_auto_fit: next.autoFit,
          label_font_header: next.fontHeader,
          label_font_code: next.fontCode,
          label_font_patient: next.fontPatient,
          label_font_small: next.fontSmall,
          label_font_footer: next.fontFooter,
        } as never,
        { onConflict: 'company_id' },
      )
    if (error) throw error
    setLayout(next)
  }, [companyId])

  return { layout, isLoading, save, reload: load }
}
