import { useState } from 'react'
import { Copy, Check, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { GeneratedCredential } from '@/stores/apiPartnersStore'

function Field({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copiado`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <code className="flex-1 break-all text-xs font-mono text-foreground">{value}</code>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={copy} aria-label={`Copiar ${label}`}>
          {copied ? <Check className="h-4 w-4 text-[hsl(145,63%,42%)]" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export function CredentialRevealCard({ credential }: { credential: GeneratedCredential }) {
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-2 text-sm">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(38,92%,45%)]" />
        <p className="text-muted-foreground">
          Guarde estas credenciais agora — elas <strong className="text-foreground">não serão exibidas novamente</strong>.
        </p>
      </div>
      <Field label="Authorization URL (Token)" value={PARTNER_TOKEN_URL} />
      <Field label="URL de Envio de Pedidos" value={PARTNER_ORDERS_URL} />
      <Field label="Client ID" value={credential.clientId} />
      <Field label="Client Secret" value={credential.clientSecret} />
    </div>
  )
}
