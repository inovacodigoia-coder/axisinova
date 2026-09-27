import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

const db = supabase as any

export interface NutricaoLabelConfig {
  widthMm: number
  heightMm: number
  marginMm: number
  nomeSizePt: number
  nomeBold: boolean
  textoSizePt: number
  textoBold: boolean
  barcode: boolean
}

export const defaultNutricaoLabelConfig: NutricaoLabelConfig = {
  widthMm: 60, heightMm: 40, marginMm: 1.5, nomeSizePt: 8.5, nomeBold: true, textoSizePt: 7, textoBold: false, barcode: false,
}

const clamp = (v: unknown, min: number, max: number, fb: number) => {
  const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb
}

export function normalizeNutricao(raw: any): NutricaoLabelConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const d = defaultNutricaoLabelConfig
  return {
    widthMm: clamp(raw.widthMm, 20, 200, d.widthMm),
    heightMm: clamp(raw.heightMm, 15, 200, d.heightMm),
    marginMm: clamp(raw.marginMm, 0, 10, d.marginMm),
    nomeSizePt: clamp(raw.nomeSizePt, 5, 24, d.nomeSizePt),
    nomeBold: typeof raw.nomeBold === 'boolean' ? raw.nomeBold : d.nomeBold,
    textoSizePt: clamp(raw.textoSizePt, 5, 24, d.textoSizePt),
    textoBold: typeof raw.textoBold === 'boolean' ? raw.textoBold : d.textoBold,
    barcode: !!raw.barcode,
  }
}

/** config === null → tipo "Etiqueta de Nutrição" ainda não configurado (impressão pelo navegador). */
export function useNutricaoLabelConfig() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [config, setConfig] = useState<NutricaoLabelConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    const { data } = await db.from('lab_settings').select('nutricao_label_config').eq('company_id', companyId).maybeSingle()
    setConfig(normalizeNutricao(data?.nutricao_label_config)); setLoading(false)
  }, [companyId])
  useEffect(() => { void load() }, [load])

  const save = useCallback(async (next: NutricaoLabelConfig | null) => {
    if (!companyId) throw new Error('Empresa não identificada.')
    const value = next ? normalizeNutricao(next) : null
    const { data: ex } = await db.from('lab_settings').select('id').eq('company_id', companyId).maybeSingle()
    const { error } = ex?.id
      ? await db.from('lab_settings').update({ nutricao_label_config: value }).eq('id', ex.id)
      : await db.from('lab_settings').insert({ company_id: companyId, nutricao_label_config: value })
    if (error) throw error
    setConfig(value)
  }, [companyId])

  return { config, loading, save, reload: load }
}
