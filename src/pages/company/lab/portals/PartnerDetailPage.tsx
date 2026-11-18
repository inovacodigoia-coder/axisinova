import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, ArchiveRestore, RefreshCw, Lock, Info, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { generatePartnerIntegrationGuide, canGeneratePartnerGuide } from '@/lib/partnerIntegrationGuide'
import { buildPartnerExamCatalog, PARTNER_CODE_WARNING } from '@/lib/partnerExamCatalog'
import { useRegisters } from '@/context/RegistersContext'
import { usePartnerApiEntitlement } from '@/stores/partnerApiEntitlementStore'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PartnerOrdersTable } from '@/components/lab/portals/partners/PartnerOrdersTable'
import { CredentialRevealCard } from '@/components/lab/portals/partners/CredentialRevealCard'
import {
  useApiPartners, updatePartner, archivePartner, restorePartner, regenerateCredential, maskDocument, maskPhone,
  type GeneratedCredential,
} from '@/stores/apiPartnersStore'
import type { ApiPartnerAuthMethod, ApiPartnerType } from '@/types/api-partners.types'
import { PARTNER_TYPE_LABEL, partnerAuthorizationState } from '@/types/api-partners.types'

export default function PartnerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const partners = useApiPartners()
  const entitlement = usePartnerApiEntitlement()
  const partner = partners.find(p => p.id === id)

  const [form, setForm] = useState(() => partner)
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenMethod, setRegenMethod] = useState<ApiPartnerAuthMethod>('oauth2')
  const [newCredential, setNewCredential] = useState<GeneratedCredential | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveConfirmed, setArchiveConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const { isSuperAdmin } = usePermissions()
  const [guidePreviewOpen, setGuidePreviewOpen] = useState(false)
  const { exams: registeredExams, workbenches } = useRegisters()
  const guideCatalog = buildPartnerExamCatalog(registeredExams, workbenches)

  useEffect(() => { setForm(partner); setRegenMethod(partner?.authMethod ?? 'oauth2') }, [partner?.id])

  if (!partner || !form) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/app/portais/parceiros')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <p className="text-sm text-muted-foreground">Parceiro não encontrado.</p>
      </div>
    )
  }

  const auth = partnerAuthorizationState(partner)
  const guideEnabled = entitlement.enabled && canGeneratePartnerGuide(partner)
  const activeCredential = partner.credentials.find(c => !c.revokedAt)
  const archived = !!partner.archivedAt

  const save = async () => {
    try {
      await updatePartner(partner.id, {
        type: form.type, name: form.name, document: form.document, contactName: form.contactName,
        contactEmail: form.contactEmail, contactPhone: form.contactPhone, notes: form.notes,
      })
      toast.success('Dados do parceiro atualizados')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar')
    }
  }

  const toggleAuthorized = async (v: boolean) => {
    try { await updatePartner(partner.id, { apiAuthorized: v }) } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar a autorização')
    }
  }

  const confirmArchive = async () => {
    setBusy(true)
    try {
      await archivePartner(partner.id)
      setArchiveOpen(false)
      toast.success('Parceiro arquivado. Os pedidos recebidos continuam guardados.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível arquivar o parceiro')
    } finally { setBusy(false) }
  }

  const restore = async () => {
    setBusy(true)
    try {
      await restorePartner(partner.id, partner.companyId)
      toast.success('Parceiro restaurado como Pendente. Gere uma nova credencial para ele voltar a usar a API.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível restaurar o parceiro')
    } finally { setBusy(false) }
  }

  const confirmRegenerate = async () => {
    try {
      const cred = await regenerateCredential(partner.id, regenMethod)
      setNewCredential(cred)
      setRegenOpen(false)
      toast.success('Credenciais OAuth2 registradas e prontas para uso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível regenerar as credenciais')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/app/portais/parceiros')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Parceiros
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{partner.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{PARTNER_TYPE_LABEL[partner.type]}</Badge>
            {archived && <Badge variant="secondary">Arquivado</Badge>}
            <Badge className={cn('border-transparent', partner.status === 'active'
              ? 'bg-[hsl(145,63%,42%)]/15 text-[hsl(145,63%,32%)]' : 'bg-muted text-muted-foreground')}>
              {partner.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
            <Badge className={cn('border-transparent', auth === 'authorized' ? 'bg-[#00D4FF]/20 text-[hsl(193,100%,30%)]'
              : auth === 'pending' ? 'bg-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,32%)]' : 'bg-destructive/15 text-destructive')}>
              {auth === 'authorized' ? 'Autorizado' : auth === 'pending' ? 'Pendente' : 'Bloqueado'}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="outline"
                    className="min-h-[44px]"
                    disabled={!guideEnabled}
                    onClick={() => {
                      setGuidePreviewOpen(true)
                    }}
                  >
                    <FileDown className="mr-2 h-4 w-4" /> Gerar Guia de Integração
                  </Button>
                </span>
              </TooltipTrigger>
              {!guideEnabled && (
                <TooltipContent>
                  {!entitlement.enabled
                    ? 'Módulo de Parceiros não liberado pelo Super Admin para esta empresa'
                    : 'Gere as credenciais de autenticação antes de exportar o guia'}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {archived ? (
            isSuperAdmin && (
              <Button variant="outline" className="min-h-[44px]" disabled={busy} onClick={() => void restore()}>
                <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurar
              </Button>
            )
          ) : (
            <Button variant="outline" className="min-h-[44px]" onClick={() => { setArchiveConfirmed(false); setArchiveOpen(true) }}>
              <Archive className="mr-2 h-4 w-4" /> Arquivar Parceiro
            </Button>
          )}
        </div>
      </div>

      {archived && (
        <div className="flex items-start gap-2 rounded-xl border bg-muted/40 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Parceiro arquivado em {new Date(partner.archivedAt!).toLocaleDateString('pt-BR')}. Ele não acessa a API e as credenciais foram desligadas.
            Os pedidos recebidos continuam guardados. {isSuperAdmin
              ? 'Ao restaurar, ele volta como Pendente e sem credencial ativa.'
              : 'Só o Super Admin pode restaurá-lo.'}
          </p>
        </div>
      )}

      <Tabs defaultValue="dados">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="auth">Autenticação</TabsTrigger>
          <TabsTrigger value="orders">Pedidos Recebidos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4 space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de Parceiro</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ApiPartnerType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laboratorio">Laboratório</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                  <SelectItem value="convenio">Convênio</SelectItem>
                  <SelectItem value="medico">Médico Solicitante</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome / Razão Social</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ ou CPF</Label>
              <Input value={form.document} onChange={e => setForm({ ...form, document: maskDocument(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Contato Responsável</Label>
              <Input value={form.contactName ?? ''} onChange={e => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail do Contato</Label>
              <Input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone do Contato</Label>
              <Input value={form.contactPhone ?? ''} onChange={e => setForm({ ...form, contactPhone: maskPhone(e.target.value) })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={archived} className="min-h-[44px] bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90">
              Salvar Alterações
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="auth" className="mt-4 space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
            <Lock className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">OAuth2 Client Credentials</p>
              <p className="text-xs text-muted-foreground">Único método de autenticação suportado nesta fase.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Credenciais</Label>
            {partner.credentials.map((c, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Client ID</p>
                    <code className="font-mono text-xs">{c.masked}</code>
                    <p className="text-xs text-muted-foreground">Client Secret: <code className="font-mono">••••••••••••</code> (nunca exibido novamente)</p>
                  </div>
                </div>
                <Badge className={cn('border-transparent', c.revokedAt ? 'bg-destructive/15 text-destructive' : 'bg-[hsl(145,63%,42%)]/15 text-[hsl(145,63%,32%)]')}>
                  {c.revokedAt ? 'Revogada' : 'Ativa'}
                </Badge>
              </div>
            ))}
            {!activeCredential && <p className="text-xs text-destructive">Nenhuma credencial ativa — regenere para restabelecer o acesso.</p>}
          </div>

          {newCredential && <CredentialRevealCard credential={newCredential} />}

          <Button variant="outline" className="min-h-[44px]" disabled={archived} onClick={() => setRegenOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerar Credenciais
          </Button>

          <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Os exames enviados pelo parceiro devem usar o Código do Catálogo de Exames do Axis Inova.
              Suporte a código próprio do parceiro poderá ser avaliado em uma fase futura.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="text-sm font-medium">Autorizado a criar pedidos via API</p>
              <p className="text-xs text-muted-foreground">Sem esta autorização o parceiro fica como Pendente.</p>
            </div>
            <Switch checked={partner.apiAuthorized} disabled={archived} onCheckedChange={v => void toggleAuthorized(v)} />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              A liberação definitiva do uso da API também depende da autorização do Super Admin para esta empresa.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <PartnerOrdersTable partnerId={partner.id} />
        </TabsContent>
      </Tabs>

      {/* Regenerar credenciais */}
      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar credenciais?</AlertDialogTitle>
            <AlertDialogDescription>
              A credencial atual será revogada imediatamente e as integrações que a utilizam deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegenMethod(partner.authMethod)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRegenerate}>Regenerar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={guidePreviewOpen} onOpenChange={setGuidePreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {guideCatalog.length} {guideCatalog.length === 1 ? 'exame ativo será incluído' : 'exames ativos serão incluídos'} no guia deste parceiro
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            ⚠️ {PARTNER_CODE_WARNING}
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/70 text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">Nome do Exame</th>
                  <th className="p-2 text-left font-medium">Código</th>
                  <th className="p-2 text-left font-medium">Bancada</th>
                </tr>
              </thead>
              <tbody>
                {guideCatalog.map(e => (
                  <tr key={e.code + e.name} className="border-t">
                    <td className="p-2">{e.name}</td>
                    <td className="p-2 font-mono">{e.code}</td>
                    <td className="p-2 text-muted-foreground">{e.workbench}</td>
                  </tr>
                ))}
                {guideCatalog.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Nenhum exame ativo no Catálogo de Exames.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuidePreviewOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                generatePartnerIntegrationGuide(partner, guideCatalog)
                setGuidePreviewOpen(false)
                toast.success('Guia de integração gerado')
              }}
            >
              Confirmar e Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Arquivar parceiro (confirmação dupla) — nada é apagado */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Arquivar parceiro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{partner.name}</strong> perde o acesso à API na hora e todas as credenciais são desligadas.
            O cadastro e os pedidos recebidos continuam guardados. Só o Super Admin pode restaurar.
          </p>
          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <Checkbox checked={archiveConfirmed} onCheckedChange={v => setArchiveConfirmed(v === true)} />
            <span>Confirmo que desejo arquivar este parceiro e desligar suas credenciais.</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!archiveConfirmed || busy}
              onClick={() => void confirmArchive()}
            >
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
