import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, RefreshCw, AlertTriangle, Link2, KeyRound, Printer, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { buildPortalUrl, type ExternalAccessRecord } from '@/hooks/useExternalAccesses'
import { imprimirCredencialPortal, textoCredencialPortal, rotuloSenhaDefinida } from '@/lib/portalCredencial'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `access.senha` só existe logo após gerar/regenerar; depois a tela mostra apenas "senha definida". */
  access: ExternalAccessRecord | null
  isNew?: boolean
  onRegenerate?: (id: string, novoCodigo: boolean) => Promise<ExternalAccessRecord>
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`${label} copiado`)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 break-all font-mono text-sm leading-snug">{value}</p>
        <Button variant="ghost" size="icon" className="shrink-0 -mr-1 h-7 w-7" onClick={copy} aria-label={`Copiar ${label}`}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

type Pedido = 'senha' | 'codigo' | null

export function AccessCredentialsModal({ open, onOpenChange, access, isNew, onRegenerate }: Props) {
  const [pedido, setPedido] = useState<Pedido>(null)
  const [regenerating, setRegenerating] = useState(false)

  if (!access) return null

  const url = buildPortalUrl(access.access_code)
  const inactive = access.status === 'inactive'
  const senha = access.senha || null

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(textoCredencialPortal(url, access.access_code, senha))
    toast.success('Dados de acesso copiados')
  }

  const handleRegenerate = async () => {
    if (!onRegenerate || !pedido) return
    setRegenerating(true)
    try {
      await onRegenerate(access.id, pedido === 'codigo')
      toast.success(pedido === 'codigo'
        ? 'Novo código e nova senha gerados. O link anterior deixou de funcionar.'
        : 'Nova senha gerada. A senha anterior deixou de funcionar.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao gerar nova senha')
    } finally {
      setRegenerating(false)
      setPedido(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Acesso criado com sucesso' : 'Dados de Acesso'}</DialogTitle>
            <DialogDescription>{access.name}</DialogDescription>
          </DialogHeader>

          {inactive ? (
            <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Acesso inativo — reative para gerar link</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center rounded-md border bg-background p-4">
                <QRCodeSVG value={url} size={132} />
              </div>
              <CopyField label="Link de acesso" value={url} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CopyField label="Código" value={access.access_code} />
                {senha ? (
                  <CopyField label="Senha" value={senha} />
                ) : (
                  <div className="rounded-md border bg-muted/40 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Senha</p>
                    <p className="flex items-center gap-1.5 text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> {rotuloSenhaDefinida(access.password_kind)}</p>
                  </div>
                )}
              </div>
              {senha && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>A senha não poderá ser vista de novo. Copie ou imprima agora.</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button className="gap-2" onClick={handleCopyAll}>
                  <Link2 className="h-4 w-4" /> Copiar tudo
                </Button>
                <Button variant="outline" className="gap-2"
                  onClick={() => imprimirCredencialPortal({ nome: access.name, url, codigo: access.access_code, senha })}>
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                {onRegenerate && (
                  <>
                    <Button variant="outline" className="gap-2" onClick={() => setPedido('senha')}>
                      <KeyRound className="h-4 w-4" /> Regenerar senha
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setPedido('codigo')}>
                      <RefreshCw className="h-4 w-4" /> Gerar novo código
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pedido} onOpenChange={(o) => { if (!o) setPedido(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pedido === 'codigo' ? 'Gerar novo código de acesso?' : 'Gerar nova senha?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pedido === 'codigo'
                ? 'O código e a senha atuais serão invalidados e o link já enviado deixará de funcionar.'
                : 'A senha atual deixará de funcionar. O link e o código continuam os mesmos. A nova senha aparece uma única vez.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={regenerating} onClick={(e) => { e.preventDefault(); handleRegenerate() }}>
              {regenerating ? 'Gerando...' : 'Gerar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
