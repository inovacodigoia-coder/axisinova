import { useState } from 'react'
import { usePWA } from '@/hooks/usePWA'

export function PWAInstallPrompt() {
  const { installPrompt, isInstalled, isIOS, isStandalone, install } = usePWA()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa_dismissed') === 'true')

  if (dismissed || isInstalled || isStandalone) return null

  const dismiss = () => {
    sessionStorage.setItem('pwa_dismissed', 'true')
    setDismissed(true)
  }

  // Android/Chrome
  if (installPrompt) {
    return (
      <div className="rounded-2xl border border-primary/20 p-4 space-y-3" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--secondary) / 0.05))' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Instale o app de resultados</p>
            <p className="text-xs text-muted-foreground mt-0.5">Acesse seus exames com um toque, sem abrir o navegador. Funciona mesmo offline.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => install()} className="gradient-bg rounded-lg px-4 py-2 text-xs font-semibold text-white flex-1">
            + Instalar agora
          </button>
          <button onClick={dismiss} className="rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted">
            Agora não
          </button>
        </div>
      </div>
    )
  }

  // iOS
  if (isIOS && !isStandalone) {
    return (
      <div className="rounded-2xl border border-primary/20 p-4 space-y-3" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--secondary) / 0.05))' }}>
        <p className="text-sm font-bold text-foreground">📱 Adicione à sua tela inicial</p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Toque em 🔗 (compartilhar) no Safari</li>
          <li>Role e toque em "Adicionar à Tela Inicial"</li>
          <li>Toque em "Adicionar"</li>
        </ol>
        <button onClick={dismiss} className="rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-muted w-full">
          Entendi
        </button>
      </div>
    )
  }

  return null
}
