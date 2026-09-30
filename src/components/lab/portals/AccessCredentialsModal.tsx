import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Input } from '@/components/ui/input'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, RefreshCw, AlertTriangle, Link2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { buildPortalUrl, cpfLast4, generatePassword, type ExternalAccessRecord, type PasswordKind } from '@/hooks/useExternalAccesses'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  access: ExternalAccessRecord | null
  isNew?: boolean
  onRegenerate?: (id: string) => Promise<ExternalAccessRecord>
  onSetPassword?: (id: string, password: string, kind: PasswordKind) => Promise<ExternalAccessRecord>
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
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export function AccessCredentialsModal({ open, onOpenChange, access, isNew, onRegenerate, onSetPassword }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [cpf4, setCpf4] = useState<string | null>(null)
  const [personalOpen, setPersonalOpen] = useState(false)
  const [personal, setPersonal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCpf4(null); setPersonalOpen(false); setPersonal('')
    if (!open || !access?.patient_id) return
    supabase.from('patients').select('cpf').eq('id', access.patient_id).maybeSingle()
      .then(({ data }) => setCpf4(cpfLast4((data as any)?.cpf)))
  }, [open, access?.patient_id])

  const applyPassword = async (pwd: string, kind: PasswordKind) => {
    if (!onSetPassword || !access) return
    setSaving(true)
    try {
      await onSetPassword(access.id, pwd, kind)
      toast.success('Senha alterada')
      setPersonalOpen(false); setPersonal('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao alterar a senha')
    } finally {
      setSaving(false)
    }
  }

  if (!access) return null

  const url = buildPortalUrl(access.access_code)
  const inactive = access.status === 'inactive'

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(
      `Portal de resultados\nLink: ${url}\nCódigo de acesso: ${access.access_code}\nSenha: ${access.access_password}`,
    )
    toast.success('Dados de acesso copiados')
  }

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setRegenerating(true)
    try {
      await onRegenerate(access.id)
      toast.success('Novo código gerado. O link anterior deixou de funcionar.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao gerar novo código')
    } finally {
      setRegenerating(false)
      setConfirmOpen(false)
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
            <div className="flex flex-col items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-6 text-center dark:bg-amber-950/20">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm font-medium">Acesso inativo — reative para gerar link</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center rounded-md border bg-white p-4">
                <QRCodeSVG value={url} size={132} />
              </div>
              <CopyField label="Link de acesso" value={url} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CopyField label="Código" value={access.access_code} />
                <CopyField label="Senha" value={access.access_password} />
              </div>
              {onSetPassword && (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Mudar senha · atual: {access.password_kind === 'cpf' ? '4 últimos dígitos do CPF' : access.password_kind === 'personal' ? 'senha pessoal' : 'aleatória'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={access.password_kind === 'cpf' ? 'default' : 'outline'} disabled={saving || !cpf4}
                      title={cpf4 ? undefined : 'Paciente sem CPF cadastrado'}
                      onClick={() => cpf4 && applyPassword(cpf4, 'cpf')}>4 últimos do CPF</Button>
                    <Button size="sm" variant="outline" disabled={saving}
                      onClick={() => applyPassword(generatePassword(), 'random')}>Gerar aleatória</Button>
                    <Button size="sm" variant={access.password_kind === 'personal' ? 'default' : 'outline'} disabled={saving}
                      onClick={() => setPersonalOpen((v) => !v)}>Senha pessoal</Button>
                  </div>
                  {personalOpen && (
                    <div className="flex gap-2">
                      <Input inputMode="numeric" maxLength={8} placeholder="4 a 8 números" value={personal}
                        onChange={(e) => setPersonal(e.target.value.replace(/\D/g, ''))} />
                      <Button size="sm" disabled={saving || personal.length < 4} onClick={() => applyPassword(personal, 'personal')}>Salvar</Button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1 gap-2" onClick={handleCopyAll}>
                  <Link2 className="h-4 w-4" /> Copiar tudo
                </Button>
                {onRegenerate && (
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setConfirmOpen(true)}>
                    <RefreshCw className="h-4 w-4" /> Gerar Novo Código
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar novo código de acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O código e a senha atuais serão invalidados e o link já enviado deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={regenerating} onClick={(e) => { e.preventDefault(); handleRegenerate() }}>
              {regenerating ? 'Gerando...' : 'Gerar novo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
