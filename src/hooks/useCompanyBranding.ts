import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'axis_company_accent_color'
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

export function useCompanyBranding() {
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_COLOR
  })

  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  const saveAccentColor = useCallback((color: string) => {
    localStorage.setItem(STORAGE_KEY, color)
    setAccentColor(color)
    applyAccentColor(color)
  }, [])

  return { accentColor, saveAccentColor }
}

// Initialize on load
const saved = localStorage.getItem(STORAGE_KEY)
if (saved) {
  applyAccentColor(saved)
}
