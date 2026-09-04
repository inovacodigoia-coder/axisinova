import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, FlaskConical, ShieldCheck, Stethoscope, Search, Plus, Handshake, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/feedback/EmptyState'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'
import { useApiPartners } from '@/stores/apiPartnersStore'
import { usePartnerApiEntitlement } from '@/stores/partnerApiEntitlementStore'
import { NewPartnerWizard } from '@/components/lab/portals/partners/NewPartnerWizard'
import type { ApiPartner, ApiPartnerType } from '@/types/api-partners.types'
import { PARTNER_TYPE_LABEL, partnerAuthorizationState } from '@/types/api-partners.types'

const TYPE_ICON: Record<ApiPartnerType, typeof Building2> = {
  laboratorio: FlaskConical,
  clinica: Building2,
  convenio: ShieldCheck,
  medico: Stethoscope,
}

const AUTH_LABEL = { authorized: 'Autorizado', pending: 'Pendente', blocked: 'Bloqueado' } as const

function lastSyncLabel(iso: string | null) {
  if (!iso) return 'Nunca sincronizado'
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diffMs / 3600000)
  if (h < 1) return 'Última sincronização há poucos minutos'
  if (h < 24) return `Última sincronização há ${h}h`
  return `Última sincronização há ${Math.floor(h / 24)}d`
}

export function PartnerCard({ partner, onClick, moduleBlocked = false }: { partner: ApiPartner; onClick: () => void; moduleBlocked?: boolean }) {
  const Icon = TYPE_ICON[partner.type]
  const auth = moduleBlocked ? 'blocked' : partnerAuthorizationState(partner)
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[44px] w-full flex-col gap-3 rounded-xl border-2 border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF]/15 to-[#7B2FF7]/15">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground group-hover:text-primary">{partner.name}</p>
          <p className="truncate text-xs text-muted-foreground">{partner.document}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline">{PARTNER_TYPE_LABEL[partner.type]}</Badge>
        <Badge className={cn('border-transparent',
          partner.status === 'active' ? 'bg-[hsl(145,63%,42%)]/15 text-[hsl(145,63%,32%)]' : 'bg-muted text-muted-foreground')}>
          {partner.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
        <Badge className={cn('border-transparent',
          auth === 'authorized' ? 'bg-[#00D4FF]/20 text-[hsl(193,100%,30%)]'
            : auth === 'pending' ? 'bg-[hsl(38,92%,50%)]/20 text-[hsl(38,92%,32%)]'
              : 'bg-destructive/15 text-destructive')}>
          {AUTH_LABEL[auth]}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{lastSyncLabel(partner.lastSyncAt)}</p>
    </button>
  )
}

export default function PartnersListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId) || 'comp_001'
  const partners = useApiPartners()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [auth, setAuth] = useState('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')
    return partners.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !(qDigits && p.document.replace(/\D/g, '').includes(qDigits))) return false
      if (type !== 'all' && p.type !== type) return false
      if (status !== 'all' && p.status !== status) return false
      if (auth !== 'all' && partnerAuthorizationState(p) !== auth) return false
      return true
    })
  }, [partners, search, type, status, auth])

  const activeCount = partners.filter(p => p.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parceiros</h1>
          <p className="text-sm text-muted-foreground">{activeCount} parceiro(s) ativo(s) integrados via API</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="min-h-[44px] bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou CNPJ/CPF" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="laboratorio">Laboratório</SelectItem>
            <SelectItem value="clinica">Clínica</SelectItem>
            <SelectItem value="convenio">Convênio</SelectItem>
            <SelectItem value="medico">Médico Solicitante</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={auth} onValueChange={setAuth}>
          <SelectTrigger><SelectValue placeholder="Autorização de API" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as autorizações</SelectItem>
            <SelectItem value="authorized">Autorizado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={<Handshake className="h-12 w-12" />}
            title={partners.length === 0 ? 'Nenhum parceiro cadastrado' : 'Nenhum parceiro encontrado'}
            description={partners.length === 0
              ? 'Cadastre parceiros para receber pedidos de atendimento automaticamente via API.'
              : 'Ajuste os filtros para localizar o parceiro desejado.'}
            action={partners.length === 0 ? (
              <Button onClick={() => setWizardOpen(true)} className="min-h-[44px] bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90">
                Cadastrar Primeiro Parceiro
              </Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => (
            <PartnerCard key={p.id} partner={p} onClick={() => navigate(`/app/portais/parceiros/${p.id}`)} />
          ))}
        </div>
      )}

      <NewPartnerWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        companyId={companyId}
        onCreated={() => setWizardOpen(false)}
      />
    </div>
  )
}
