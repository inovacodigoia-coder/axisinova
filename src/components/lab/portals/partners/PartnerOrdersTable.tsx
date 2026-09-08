import { useEffect, useMemo, useState } from 'react'
import { Building2, Eye, FileBarChart, FlaskConical, Hospital, Inbox, RefreshCw, RotateCcw, Search, ShieldCheck, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/feedback/EmptyState'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useApiPartners } from '@/stores/apiPartnersStore'
import { usePartnerOrders, loadPartnerOrders, type BatchProcessResult } from '@/stores/apiPartnerOrdersStore'
import { usePartnerOrderImport } from '@/hooks/usePartnerOrderImport'
import { PartnerOrderDetailDrawer, STATUS_CLASS } from './PartnerOrderDetailDrawer'
import { PartnerOrdersReportModal, type ReportRow } from './PartnerOrdersReportModal'
import {
  PARTNER_ORDER_STATUS_LABEL, maskCpf, type PartnerOrder, type PartnerOrderStatus,
} from '@/types/api-partner-orders.types'
import type { ApiPartnerType } from '@/types/api-partners.types'

const TYPE_ICON: Record<ApiPartnerType, typeof Building2> = {
  laboratorio: FlaskConical,
  clinica: Building2,
  convenio: ShieldCheck,
  medico: Stethoscope,
  hospital: Hospital,
}

const PAGE_SIZE = 10

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

interface Props {
  /** Quando informado, a tabela fica pré-filtrada para um parceiro específico */
  partnerId?: string
  showCounters?: boolean
}

export function PartnerOrdersTable({ partnerId, showCounters = true }: Props) {
  const partners = useApiPartners()
  const orders = usePartnerOrders()
  const { user } = useAuth()
  const { importOrders } = usePartnerOrderImport()
  const companyName = (user as { companyName?: string } | null)?.companyName || 'Laboratório'
  const companyId = (user as { companyId?: string } | null)?.companyId

  // Mantém a lista sempre atualizada: carga inicial, polling e recarga ao voltar para a aba
  useEffect(() => {
    if (!companyId) return
    void loadPartnerOrders(companyId)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadPartnerOrders(companyId)
    }, 15000)
    const onVisible = () => { if (document.visibilityState === 'visible') void loadPartnerOrders(companyId) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [companyId])

  const [search, setSearch] = useState('')
  const [partnerFilter, setPartnerFilter] = useState<string>(partnerId ?? 'all')
  const [status, setStatus] = useState<string>('all')
  const [preset, setPreset] = useState<string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PartnerOrder | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [report, setReport] = useState<{ title: string; subtitle?: string; rows: ReportRow[] } | null>(null)

  useEffect(() => { if (partnerId) setPartnerFilter(partnerId) }, [partnerId])
  useEffect(() => { setPage(1); setSelectedIds([]) }, [search, partnerFilter, status, preset, from, to])

  const partnerById = useMemo(() => Object.fromEntries(partners.map(p => [p.id, p])), [partners])


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')

    let start: Date | null = null
    let end: Date | null = null
    if (preset === 'today') start = startOfDay(new Date())
    else if (preset === '7') start = startOfDay(new Date(Date.now() - 6 * 86400000))
    else if (preset === '30') start = startOfDay(new Date(Date.now() - 29 * 86400000))
    else if (preset === 'custom') {
      if (from) start = startOfDay(new Date(`${from}T00:00:00`))
      if (to) { end = new Date(`${to}T23:59:59`) }
    }

    return orders
      .filter(o => {
        if (partnerFilter !== 'all' && o.partnerId !== partnerFilter) return false
        if (status !== 'all' && o.status !== status) return false
        const t = new Date(o.receivedAt)
        if (start && t < start) return false
        if (end && t > end) return false
        if (q) {
          const hay = [o.patient.name, o.partnerProtocol ?? '', o.attendanceProtocol ?? ''].join(' ').toLowerCase()
          const cpfDigits = o.patient.cpf.replace(/\D/g, '')
          if (!hay.includes(q) && !(qDigits && cpfDigits.includes(qDigits))) return false
        }
        return true
      })
      .sort((a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt))
  }, [orders, partnerFilter, status, preset, from, to, search])

  const counters = useMemo(() => {
    const todayStart = startOfDay(new Date())
    return {
      today: filtered.filter(o => new Date(o.receivedAt) >= todayStart).length,
      waiting: filtered.filter(o => o.status === 'received').length,
      processed: filtered.filter(o => o.status === 'processed').length,
      errors: filtered.filter(o => o.status === 'error').length,
    }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openDetail = (o: PartnerOrder) => setSelected(o)
  const selectedLive = selected ? orders.find(o => o.id === selected.id) ?? selected : null

  const eligibleIds = useMemo(() => filtered.filter(o => o.status === 'received').map(o => o.id), [filtered])
  const validSelected = useMemo(() => selectedIds.filter(id => eligibleIds.includes(id)), [selectedIds, eligibleIds])
  const allSelected = eligibleIds.length > 0 && validSelected.length === eligibleIds.length

  const toggleOne = (id: string, on: boolean) =>
    setSelectedIds(prev => (on ? [...new Set([...prev, id])] : prev.filter(x => x !== id)))
  const clearSelection = () => setSelectedIds([])

  const toReportRow = (o: PartnerOrder): ReportRow => ({
    patientName: o.patient.name,
    cpf: o.patient.cpf,
    partnerName: partnerById[o.partnerId]?.name ?? '—',
    examsCount: o.exams.length,
    status: o.status,
    attendanceProtocol: o.attendanceProtocol,
    errorMessage: o.errorMessage,
    partnerProtocol: o.partnerProtocol,
  })

  const [creating, setCreating] = useState(false)

  const handleBatchCreate = async () => {
    if (!validSelected.length || creating) return
    setCreating(true)
    const toCreate = filtered.filter(o => validSelected.includes(o.id) && o.status === 'received')
    let results: BatchProcessResult[] = []
    try {
      results = await importOrders(toCreate)
    } finally {
      if (companyId) await loadPartnerOrders(companyId)
      setCreating(false)
    }
    const okCount = results.filter(r => r.ok).length
    setSelectedIds([])
    setReport({
      title: 'Resultado da Importação',
      subtitle: `${results.length} pedidos processados — ${okCount} criados com sucesso, ${results.length - okCount} com erro`,
      rows: results.map(r => ({
        patientName: r.patientName,
        cpf: r.cpf,
        partnerName: partnerById[r.partnerId]?.name ?? '—',
        examsCount: r.examsCount,
        status: r.ok ? 'processed' : 'error',
        attendanceProtocol: r.attendanceProtocol,
        errorMessage: r.errorMessage,
        warningMessage: r.warningMessage,
        partnerProtocol: r.partnerProtocol,
      })),
    })
    results.filter(r => r.warningMessage).forEach(r => toast.warning(r.warningMessage as string))
    if (okCount) toast.success(`${okCount} atendimento(s) criado(s).`)
    if (results.length - okCount > 0) toast.error(`${results.length - okCount} pedido(s) com erro.`)
  }

  const openFilteredReport = () => setReport({
    title: 'Relatório de Pedidos Recebidos',
    subtitle: `${filtered.length} pedido(s) no filtro atual`,
    rows: filtered.map(toReportRow),
  })

  const periodLabel = preset === 'custom' && (from || to)
    ? `${from ? new Date(`${from}T00:00:00`).toLocaleDateString('pt-BR') : '...'} a ${to ? new Date(`${to}T00:00:00`).toLocaleDateString('pt-BR') : '...'}`
    : preset === 'today' ? 'Hoje'
    : preset === '7' ? 'Últimos 7 dias'
    : preset === '30' ? 'Últimos 30 dias'
    : 'Todo o período'

  return (
    <div className="space-y-4">
      {showCounters && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Recebidos hoje', value: counters.today, cls: 'from-[#00D4FF]/15 to-[#7B2FF7]/10' },
            { label: 'Aguardando autorização', value: counters.waiting, cls: 'from-[hsl(38,92%,50%)]/15 to-[hsl(38,92%,50%)]/5' },
            { label: 'Processados com sucesso', value: counters.processed, cls: 'from-[hsl(145,63%,42%)]/15 to-[hsl(145,63%,42%)]/5' },
            { label: 'Com erro', value: counters.errors, cls: 'from-destructive/15 to-destructive/5' },
          ].map(c => (
            <div key={c.label} className={cn('rounded-xl border bg-gradient-to-br p-4', c.cls)}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {validSelected.length > 0 && (
        <div className="sticky top-2 z-20 flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">{validSelected.length} pedido(s) selecionado(s)</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleBatchCreate}
              disabled={creating}
              className="bg-gradient-to-r from-[#00D4FF] to-[#7B2FF7] text-white hover:opacity-90"
            >
              {creating ? 'Criando...' : 'Criar Pedidos no Sistema'}
            </Button>
            <Button variant="outline" onClick={clearSelection} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Limpar Seleção
            </Button>
          </div>
        </div>
      )}


      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Paciente, CPF ou protocolo" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {!partnerId && (
          <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger><SelectValue placeholder="Parceiro" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os parceiros</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="received">Recebido</SelectItem>
            <SelectItem value="processed">Processado</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>

        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {preset === 'custom' && (
          <>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={openFilteredReport} className="gap-2 flex-1">
            <FileBarChart className="h-4 w-4" /> Gerar Relatório
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Atualizar lista"
            onClick={() => { if (companyId) void loadPartnerOrders(companyId) }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>


      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={<Inbox className="h-12 w-12" />}
            title="Nenhum pedido encontrado"
            description="Nenhum pedido encontrado com os filtros aplicados."
          />
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">
                    <Checkbox
                      checked={allSelected}
                      disabled={eligibleIds.length === 0}
                      aria-label="Selecionar tudo"
                      onCheckedChange={v => setSelectedIds(v ? eligibleIds : [])}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Recebido em</th>
                  <th className="px-4 py-3 text-left font-medium">Parceiro</th>
                  <th className="px-4 py-3 text-left font-medium">Paciente</th>
                  <th className="px-4 py-3 text-center font-medium">Exames</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Atendimento</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageItems.map(o => {
                  const p = partnerById[o.partnerId]
                  const Icon = p ? TYPE_ICON[p.type] : Building2
                  const selectable = o.status === 'received'
                  return (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {selectable ? (
                          <Checkbox
                            checked={validSelected.includes(o.id)}
                            aria-label={`Selecionar pedido de ${o.patient.name}`}
                            onCheckedChange={v => toggleOne(o.id, !!v)}
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(o.receivedAt).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          {p?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.patient.name}</p>
                        <p className="text-xs text-muted-foreground">{maskCpf(o.patient.cpf)}</p>
                      </td>
                      <td className="px-4 py-3 text-center">{o.exams.length}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('border-transparent', STATUS_CLASS[o.status as PartnerOrderStatus])}>
                          {PARTNER_ORDER_STATUS_LABEL[o.status]}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        {o.attendanceProtocol
                          ? <button type="button" onClick={() => openDetail(o)} className="font-medium text-primary hover:underline">{o.attendanceProtocol}</button>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" aria-label="Ver detalhe" onClick={() => openDetail(o)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 lg:hidden">
            {pageItems.map(o => {
              const p = partnerById[o.partnerId]
              const Icon = p ? TYPE_ICON[p.type] : Building2
              return (
                <div key={o.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  {o.status === 'received' && (
                    <Checkbox
                      className="mt-1"
                      checked={validSelected.includes(o.id)}
                      aria-label={`Selecionar pedido de ${o.patient.name}`}
                      onCheckedChange={v => toggleOne(o.id, !!v)}
                    />
                  )}
                  <button type="button" onClick={() => openDetail(o)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{o.patient.name}</p>
                        <p className="text-xs text-muted-foreground">{maskCpf(o.patient.cpf)}</p>
                      </div>
                      <Badge className={cn('border-transparent', STATUS_CLASS[o.status])}>
                        {PARTNER_ORDER_STATUS_LABEL[o.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Icon className="h-3.5 w-3.5 text-primary" />{p?.name ?? '—'}</span>
                      <span>{o.exams.length} exame(s)</span>
                      <span>{new Date(o.receivedAt).toLocaleString('pt-BR')}</span>
                      {o.attendanceProtocol && <span className="font-medium text-primary">{o.attendanceProtocol}</span>}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {filtered.length} pedido(s) · página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        </>
      )}

      <PartnerOrderDetailDrawer
        order={selectedLive}
        partner={selectedLive ? partnerById[selectedLive.partnerId] : undefined}
        open={!!selected}
        onOpenChange={v => { if (!v) setSelected(null) }}
      />

      <PartnerOrdersReportModal
        open={!!report}
        onOpenChange={v => { if (!v) setReport(null) }}
        title={report?.title ?? ''}
        subtitle={report?.subtitle}
        companyName={companyName}
        periodLabel={periodLabel}
        rows={report?.rows ?? []}
      />

    </div>
  )
}
