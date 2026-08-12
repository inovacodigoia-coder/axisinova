import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { applyBranding, themeFromRow, DEFAULT_THEME, BrandingTheme } from '@/lib/branding'

export function useCompanyBranding(companyId?: string) {
  const [theme, setTheme] = useState<BrandingTheme>(DEFAULT_THEME)

  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      const { data } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle() as any
      if (data) {
        const t = themeFromRow(data)
        setTheme(t)
        applyBranding(t)
      }
    }
    load()
  }, [companyId])

  const saveAccentColor = useCallback((color: string) => {
    setTheme(prev => {
      const next = { ...prev, primary: color }
      applyBranding(next)
      return next
    })
  }, [])

  return { accentColor: theme.primary, theme, saveAccentColor }
}
