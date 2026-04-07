import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: string }>
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent))
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone)

    // Only register SW on /resultado routes
    if ('serviceWorker' in navigator && window.location.pathname.startsWith('/resultado')) {
      navigator.serviceWorker
        .register('/sw-patient.js', { scope: '/resultado' })
        .then((reg) => {
          setRegistration(reg)
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          })
        })
        .catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return false
    const result = await installPrompt.prompt()
    if (result.outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
      return true
    }
    return false
  }

  const applyUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return { installPrompt, isInstalled, isIOS, isStandalone, updateAvailable, install, applyUpdate }
}
