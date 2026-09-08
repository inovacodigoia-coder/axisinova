import { useEffect, useMemo, useState } from 'react'
import { Building2, FlaskConical, ShieldCheck, Stethoscope, Hospital, Lock, Info, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ApiPartner, ApiPartnerType } from '@/types/api-partners.types'
import { PARTNER_TYPE_LABEL } from '@/types/api-partners.types'
import {
  addPartner, documentExists, generateCredential, isValidDocument, maskDocument, maskPhone,
  type GeneratedCredential,
} from '@/stores/apiPartnersStore'
import { CredentialRevealCard } from './CredentialRevealCard'

const TYPE_OPTIONS: { value: ApiPartnerType; icon: typeof Building2 }[] = [
  { value: 'laboratorio', icon: FlaskConical },
  { value: 'clinica', icon: Building2 },
  { value: 'convenio', icon: ShieldCheck },
  { value: 'medico', icon: Stethoscope },
  { value: 'hospital', icon: Hospital },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  onCreated?: (partner: ApiPartner) => void
}

export function NewPartnerWizard({ open, onOpenChange, companyId, onCreated }: Props) {
  const [step, setStep] = useState(1)
  const [type, setType] = useState<ApiPartnerType>('laboratorio')
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [credential, setCredential] = useState<GeneratedCredential | null>(null)

  useEffect(() => {
    if (open) {
      setStep(1); setType('laboratorio'); setName(''); setDocument(''); setContactName('')
      setContactEmail(''); setContactPhone(''); setNotes('')
      setCredential(null)
    }
  }, [open])

  const duplicated = useMemo(() => documentExists(document), [document])
  const emailValid = /\S+@\S+\.\S+/.test(contactEmail)
  const stepAValid = !!name.trim() && isValidDocument(document) && !duplicated && emailValid

  const generate = async () => {
    try {
      setCredential(await generateCredential(`${name.trim()} — Parceiro API`))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível gerar as credenciais')
    }
  }

  const handleConfirm = async () => {
    if (!credential) return
    try {
      const partner = await addPartner({
        companyId,
        type,
        name: name.trim(),
        document,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        authMethod: 'oauth2',
        apiAuthorized: false,
        status: 'active',
      }, credential)
      toast.success('Parceiro cadastrado com sucesso')
      onCreated?.(partner)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível cadastrar o parceiro')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 sm:rounded-xl max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-screen max-sm:rounded-none">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Novo Parceiro de Integração</DialogTitle>
          <DialogDescription>Cadastro do parceiro que enviará pedidos via API REST.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3">
          {['Dados do Parceiro', 'Autenticação', 'Permissões'].map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  active ? 'bg-gradient-to-br from-[#00D4FF] to-[#7B2FF7] text-white'
                    : done ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                  {done ? <Check className="h-4 w-4" /> : n}
                </div>
                <span className={cn('truncate text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
              </div>
            )
          })}
        </div>

        <div className="space-y-5 px-5 py-5">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Parceiro *</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TYPE_OPTIONS.map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={cn('flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 text-center transition-all',
                        type === value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40 hover:bg-muted/50')}
                    >
                      <Icon className={cn('h-5 w-5', type === value ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-xs font-medium leading-tight">{PARTNER_TYPE_LABEL[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-name">Nome / Razão Social *</Label>
                  <Input id="p-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Laboratório Vida Análises" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-doc">CNPJ ou CPF *</Label>
                  <Input id="p-doc" value={document} onChange={e => setDocument(maskDocument(e.target.value))} placeholder="00.000.000/0000-00" />
                  {document && !isValidDocument(document) && <p className="text-xs text-destructive">Documento incompleto.</p>}
                  {duplicated && <p className="text-xs text-destructive">Já existe um parceiro com este CNPJ/CPF.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-contact">Nome do Contato Responsável</Label>
                  <Input id="p-contact" value={contactName} onChange={e => setContactName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-email">E-mail do Contato *</Label>
                  <Input id="p-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="integracao@parceiro.com.br" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-phone">Telefone do Contato</Label>
                  <Input id="p-phone" value={contactPhone} onChange={e => setContactPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p-notes">Observações</Label>
                  <Textarea id="p-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Método de Autenticação</Label>
                <div className={cn('flex min-h-[88px] items-center gap-3 rounded-xl border-2 p-4 transition-all',
                  credential ? 'border-primary bg-primary/5' : 'border-border')}>
                  <Lock className="h-5 w-5 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">OAuth2 Client Credentials</p>
                    <p className="text-xs text-muted-foreground">Único método suportado nesta fase.</p>
                  </div>
                  {!credential && (
                    <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void generate()}>
                      Gerar Credenciais
                    </Button>
                  )}
                </div>
              </div>

              {credential && <CredentialRevealCard credential={credential} />}

              <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-muted-foreground">
                  Os exames enviados pelo parceiro devem usar o Código do Catálogo de Exames do Axis Inova.
                  Suporte a código próprio do parceiro poderá ser avaliado em uma fase futura.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-start gap-3 rounded-xl border-2 border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/10 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(38,92%,40%)]" />
                <div className="text-sm text-[hsl(38,92%,28%)]">
                  <p className="font-medium">O parceiro será criado como Pendente</p>
                  <p className="text-xs">
                    O envio de pedidos via API só é liberado após o desbloqueio pelo responsável do sistema (Super Admin).
                  </p>
                </div>
              </div>

              <div className="rounded-xl border">
                <div className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo</div>
                <dl className="grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
                  {[
                    ['Tipo', PARTNER_TYPE_LABEL[type]],
                    ['Nome', name || '—'],
                    ['CNPJ/CPF', document || '—'],
                    ['Contato', contactName || '—'],
                    ['E-mail', contactEmail || '—'],
                    ['Telefone', contactPhone || '—'],
                    ['Autenticação', 'OAuth2 Client Credentials'],
                    ['Autorizado via API', 'Pendente (aguarda liberação do Super Admin)'],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-3 border-b border-dashed border-border/60 pb-1 last:border-0">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-5 py-4 sm:justify-between">
          <Button variant="outline" onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < 3 ? (
            <Button
              disabled={step === 1 ? !stepAValid : !credential}
              onClick={() => setStep(step + 1)}
              className="bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90"
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={handleConfirm} className="bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90">
              Cadastrar Parceiro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
