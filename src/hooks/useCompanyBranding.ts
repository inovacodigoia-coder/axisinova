import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

const DEFAULT_COLOR = '#00D4FF'

function hexToHSL(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function applyAccentColor(hex: string) {
  const hsl = hexToHSL(hex)
  document.documentElement.style.setProperty('--company-accent', hsl)
  document.documentElement.style.setProperty('--company-accent-hex', hex)
}

export function useCompanyBranding(companyId?: string) {
  const [accentColor, setAccentColor] = useState(DEFAULT_COLOR)

  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      const { data } = await supabase.from('company_branding').select('*').eq('company_id', companyId).maybeSingle() as any
      if (data?.primary_color) {
        setAccentColor(data.primary_color)
        applyAccentColor(data.primary_color)
        // Apply all branding
        const root = document.documentElement
        root.style.setProperty('--color-primary-hex', data.primary_color || DEFAULT_COLOR)
        root.style.setProperty('--color-secondary-hex', data.secondary_color || '#7B2FF7')
        root.style.setProperty('--gradient-main', `linear-gradient(135deg, ${data.primary_color || DEFAULT_COLOR} 0%, ${data.secondary_color || '#7B2FF7'} 100%)`)
        root.style.setProperty('--sidebar-bg', data.sidebar_bg || '#1E293B')
      }
    }
    load()
  }, [companyId])

  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  const saveAccentColor = useCallback((color: string) => {
    setAccentColor(color)
    applyAccentColor(color)
  }, [])

  return { accentColor, saveAccentColor }
}
