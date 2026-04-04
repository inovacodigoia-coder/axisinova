import { useEffect, useCallback } from 'react'

type ShortcutMap = Record<string, () => void>

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handler = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    for (const [combo, action] of Object.entries(shortcuts)) {
      const parts = combo.toLowerCase().split('+')
      const needCtrl = parts.includes('ctrl') || parts.includes('cmd')
      const needShift = parts.includes('shift')
      const key = parts.filter(p => !['ctrl', 'cmd', 'shift', 'alt'].includes(p))[0]

      if (needCtrl && !(e.ctrlKey || e.metaKey)) continue
      if (needShift && !e.shiftKey) continue
      if (e.key.toLowerCase() !== key) continue

      // Allow Escape anywhere, but other shortcuts only outside inputs
      if (key !== 'escape' && isInput) continue

      e.preventDefault()
      action()
      return
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
