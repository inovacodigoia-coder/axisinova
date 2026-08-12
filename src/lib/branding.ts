export type BrandingTheme = {
  primary: string
  secondary: string
  sidebar: string
  background: string
  card: string
  text: string
  mutedText: string
  border: string
  inputBg: string
  ring: string
  buttonText: string
  success: string
  warning: string
  error: string
}

export const DEFAULT_THEME: BrandingTheme = {
  primary: '#00D4FF',
  secondary: '#7B2FF7',
  sidebar: '#1E293B',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1A202C',
  mutedText: '#718096',
  border: '#E2E8F0',
  inputBg: '#FFFFFF',
  ring: '#00D4FF',
  buttonText: '#FFFFFF',
  success: '#38A169',
  warning: '#D69E2E',
  error: '#E53E3E',
}

export function hexToHSL(hex: string): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
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

/** Applies the full theme to CSS variables (both hex helpers and shadcn HSL tokens). */
export function applyBranding(t: BrandingTheme) {
  const root = document.documentElement
  const set = (k: string, v: string) => root.style.setProperty(k, v)

  // hex helpers used across the app
  set('--color-primary-hex', t.primary)
  set('--color-secondary-hex', t.secondary)
  set('--company-accent-hex', t.primary)
  set('--gradient-main', `linear-gradient(135deg, ${t.primary} 0%, ${t.secondary} 100%)`)
  set('--sidebar-bg', t.sidebar)

  // shadcn semantic tokens
  set('--company-accent', hexToHSL(t.primary))
  set('--primary', hexToHSL(t.primary))
  set('--primary-foreground', hexToHSL(t.buttonText))
  set('--secondary', hexToHSL(t.secondary))
  set('--secondary-foreground', hexToHSL(t.buttonText))
  set('--background', hexToHSL(t.background))
  set('--foreground', hexToHSL(t.text))
  set('--card', hexToHSL(t.card))
  set('--card-foreground', hexToHSL(t.text))
  set('--popover', hexToHSL(t.card))
  set('--popover-foreground', hexToHSL(t.text))
  set('--muted-foreground', hexToHSL(t.mutedText))
  set('--border', hexToHSL(t.border))
  set('--input', hexToHSL(t.border))
  set('--input-background', hexToHSL(t.inputBg))
  set('--ring', hexToHSL(t.ring))
  set('--sidebar-background', hexToHSL(t.sidebar))
  set('--success', hexToHSL(t.success))
  set('--warning', hexToHSL(t.warning))
  set('--destructive', hexToHSL(t.error))
  set('--axis-primary', hexToHSL(t.primary))
  set('--axis-secondary', hexToHSL(t.secondary))
  set('--axis-success', hexToHSL(t.success))
  set('--axis-warning', hexToHSL(t.warning))
  set('--axis-error', hexToHSL(t.error))
}

export function themeFromRow(data: any): BrandingTheme {
  return {
    primary: data?.primary_color || DEFAULT_THEME.primary,
    secondary: data?.secondary_color || DEFAULT_THEME.secondary,
    sidebar: data?.sidebar_bg || DEFAULT_THEME.sidebar,
    background: data?.background_color || DEFAULT_THEME.background,
    card: data?.card_color || DEFAULT_THEME.card,
    text: data?.text_color || DEFAULT_THEME.text,
    mutedText: data?.muted_text_color || DEFAULT_THEME.mutedText,
    border: data?.border_color || DEFAULT_THEME.border,
    inputBg: data?.input_bg_color || DEFAULT_THEME.inputBg,
    ring: data?.ring_color || DEFAULT_THEME.ring,
    buttonText: data?.button_text_color || DEFAULT_THEME.buttonText,
    success: data?.success_color || DEFAULT_THEME.success,
    warning: data?.warning_color || DEFAULT_THEME.warning,
    error: data?.error_color || DEFAULT_THEME.error,
  }
}

export function themeToRow(t: BrandingTheme) {
  return {
    primary_color: t.primary,
    secondary_color: t.secondary,
    sidebar_bg: t.sidebar,
    background_color: t.background,
    card_color: t.card,
    text_color: t.text,
    muted_text_color: t.mutedText,
    border_color: t.border,
    input_bg_color: t.inputBg,
    ring_color: t.ring,
    button_text_color: t.buttonText,
    success_color: t.success,
    warning_color: t.warning,
    error_color: t.error,
  }
}

export type ThemePreset = { name: string; description: string; theme: BrandingTheme }

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Axis Padrão',
    description: 'Ciano e roxo sobre fundo claro',
    theme: DEFAULT_THEME,
  },
  {
    name: 'Clínico Azul',
    description: 'Azul sóbrio, alto contraste',
    theme: { ...DEFAULT_THEME, primary: '#2563EB', secondary: '#1E40AF', sidebar: '#0F1B3D', background: '#F1F5F9', ring: '#2563EB', text: '#0F172A', mutedText: '#64748B', border: '#DBE3EC' },
  },
  {
    name: 'Verde Saúde',
    description: 'Verde esmeralda e fundo neutro',
    theme: { ...DEFAULT_THEME, primary: '#0D9488', secondary: '#047857', sidebar: '#12312B', background: '#F3F7F5', ring: '#0D9488', border: '#DDE7E3' },
  },
  {
    name: 'Grafite Neutro',
    description: 'Cinzas com destaque laranja',
    theme: { ...DEFAULT_THEME, primary: '#E85D3A', secondary: '#B8452A', sidebar: '#232323', background: '#F6F6F5', ring: '#E85D3A', text: '#1F1F1F', mutedText: '#6B7280', border: '#E4E4E2' },
  },
  {
    name: 'Roxo Corporativo',
    description: 'Violeta elegante e fundo lavanda',
    theme: { ...DEFAULT_THEME, primary: '#7C3AED', secondary: '#4C1D95', sidebar: '#2D1B4E', background: '#F7F5FC', ring: '#7C3AED', border: '#E6E1F5' },
  },
  {
    name: 'Escuro Noturno',
    description: 'Fundo escuro para ambientes com pouca luz',
    theme: { ...DEFAULT_THEME, primary: '#22D3EE', secondary: '#818CF8', sidebar: '#0B1220', background: '#0F172A', card: '#111C33', text: '#E2E8F0', mutedText: '#94A3B8', border: '#22304A', inputBg: '#111C33', ring: '#22D3EE', buttonText: '#06131F' },
  },
]
