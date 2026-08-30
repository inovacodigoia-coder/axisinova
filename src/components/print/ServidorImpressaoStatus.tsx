import { useEffect, useState } from 'react'
import { servidorImpressaoAtivo } from '@/lib/impressaoLocal'
import { PrinterCheck, PrinterX } from 'lucide-react'

/**
 * Indicador discreto do status do Servidor de Impressão AisAxius (localhost:8089).
 * Não bloqueia a tela — apenas avisa se o servidor local não foi detectado.
 */
export function ServidorImpressaoStatus({ className = '' }: { className?: string }) {
  const [ativo, setAtivo] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const ok = await servidorImpressaoAtivo()
      if (!cancelled) setAtivo(ok)
    }
    check()
    const interval = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (ativo === null) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        ativo
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
      } ${className}`}
      title={ativo
        ? 'Servidor de Impressão AisAxius detectado em localhost:8089'
        : 'Abra o Servidor de Impressão AisAxius na bandeja do Windows'}
    >
      {ativo ? <PrinterCheck className="h-3 w-3" /> : <PrinterX className="h-3 w-3" />}
      {ativo ? 'Impressão local ativa' : 'Servidor de impressão local não detectado'}
    </span>
  )
}
