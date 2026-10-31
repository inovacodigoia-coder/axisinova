import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ChevronDown, Filter, ClipboardList, Plus, FileCheck2, List, ListChecks } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { dentroDoPeriodo } from '@/lib/workMapFilters'
import { useAuth } from '@/context/AuthContext'
import { useRegisters } from '@/context/RegistersContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import {
  DEFAULT_PRIORITIES,
  createWorkMap,
  getIncludedKeys,
  isGuiaRemessaRecebida,
  loadWorkMaps,
  subscribeWorkMaps,
  workMapItemKey,
} from '@/mocks/work-map.mock'


import { ListWorkMapsModal } from '@/components/lab/mapa/ListWorkMapsModal'

const ELIGIBLE_STATUSES = ['collection_done', 'in_analysis', 'validation', 'released', 'completed']
const ALL = '__all__'

interface MapRow {
  key: string
  code: string
  patient: string
  exam: string
  examCode: string
  sector: string
  convenio: string
  priority: string
  collectionPost: string
  date: string
}

export default function LabMapaPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { orders, loading } = useAttendanceCadastro()
  const { workbenches, convenios, exams } = useRegisters() as any
  const { availableOrigins } = useCompanyContext()

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [examTerm, setExamTerm] = useState('')
  const [selectedExams, setSelectedExams] = useState<string[]>([])
  const [examPickerOpen, setExamPickerOpen] = useState(false)
  const [examPickerDraft, setExamPickerDraft] = useState<string[]>([])
  const [examPickerSearch, setExamPickerSearch] = useState('')
  const [sector, setSector] = useState(ALL)
  const [convenio, setConvenio] = useState(ALL)
  const [plan, setPlan] = useState(ALL)
  const [priority, setPriority] = useState(ALL)
  const [post, setPost] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [quantity, setQuantity] = useState('1000')
  const [perPage, setPerPage] = useState('')
  const [page, setPage] = useState(1)
  const [priorities, setPriorities] = useState<string[]>(DEFAULT_PRIORITIES)
  const [newPriority, setNewPriority] = useState('')
  const [priorityModal, setPriorityModal] = useState(false)
  const [applied, setApplied] = useState(0)
  const [listMapsModal, setListMapsModal] = useState(false)

  // Carregar mapas salvos (persistidos no banco) e reagir a mudanças
  useEffect(() => {
    loadWorkMaps().then(() => setApplied(a => a + 1))
    return subscribeWorkMaps(() => setApplied(a => a + 1))
  }, [user?.companyId])

  // Forçar atualização quando a página ganha foco (ex: voltando do mapa gerado)
  useEffect(() => {
    const handleFocus = () => { loadWorkMaps() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])


  const sectorOptions = useMemo(() => {
    return (workbenches || []).map((w: any) => w.name).filter(Boolean)
  }, [workbenches])

  const examCatalogMap = useMemo(() => {
    const map: Record<string, any> = {}
    ;(exams || []).forEach(e => {
      if (e.name) map[e.name.toLowerCase()] = e
      if (e.internalCode) map[e.internalCode.toString().toLowerCase()] = e
    })
    return map
  }, [exams])

  // Todas as linhas elegíveis (pré-requisitos de exibição)
  const allRows = useMemo(() => {
    const included = getIncludedKeys()
    const rows: MapRow[] = []

    ;(orders || []).forEach(order => {
      const status = order.status === ('concluded' as any) ? 'completed' : order.status
      if (!ELIGIBLE_STATUSES.includes(status as string)) return

      ;(order.labGuides || []).forEach((guide: any, gi: number) => {
        ;(guide?.exams || []).forEach((exam: any, ei: number) => {
          if (exam?.status === 'cancelled') return
          if (exam?.coletaProgramada && exam?.collectedAt && new Date(exam.collectedAt).getTime() > Date.now()) return // coleta programada futura
          const key = workMapItemKey(order.id, gi, ei)
          if (!isGuiaRemessaRecebida(key)) return // guia_remessa_recebida = false
          if (included.has(key)) return // incluido_em_mapa = true

          const examKey = (exam.name || '').toLowerCase()
          const internalKey = (exam.code || '').toLowerCase()
          const cat = examCatalogMap[examKey] || examCatalogMap[internalKey]
          const workbenchId = exam.workbench || exam.workbenchId || cat?.workbenchId
          const workbench = (workbenches || []).find((w: any) => w.id === workbenchId)?.name || workbenchId || exam.workbenchName || exam.sector || '—'

          rows.push({
            key,
            code: order.protocol || order.orderNumber || '—',
            patient: order.patientName || '—',
            exam: exam.abbreviation || exam.code || exam.name || '—',
            examCode: `${exam.code || ''} ${exam.name || ''}`.trim(),
            sector: workbench,
            convenio: guide?.plan || order.convenioName || 'PARTICULAR',
            priority: exam.isUrgent || guide?.isUrgent || (order as any).isUrgent ? 'Urgente' : 'Normal',
            collectionPost: order.originName || '—',
            date: exam.collectedAt || order.registeredAt || '',
          })
        })
      })
    })

    return rows
  }, [orders, applied])

  const filteredRows = useMemo(() => {
    const term = examTerm.trim().toLowerCase()
    const limit = Math.max(1, Number(quantity) || 1000)
    return allRows
      .filter(r => (term ? `${r.exam} ${r.examCode}`.toLowerCase().includes(term) : true))
      .filter(r => (selectedExams.length ? selectedExams.includes(r.exam) : true))
      .filter(r => (sector === ALL ? true : r.sector === sector))
      .filter(r => (convenio === ALL ? true : r.convenio === convenio))
      .filter(r => (plan === ALL ? true : r.convenio === plan))
      .filter(r => (priority === ALL ? true : r.priority === priority))
      .filter(r => (post === ALL ? true : r.collectionPost === post))
      .slice(0, limit)
  }, [allRows, examTerm, selectedExams, sector, convenio, plan, priority, post, quantity, applied])

  const examOptions = useMemo(() => {
    const m = new Map<string, { exam: string; name: string; count: number }>()
    allRows.forEach(r => {
      const cur = m.get(r.exam)
      if (cur) cur.count++
      else m.set(r.exam, { exam: r.exam, name: r.examCode, count: 1 })
    })
    return Array.from(m.values()).sort((a, b) => a.exam.localeCompare(b.exam))
  }, [allRows])

  const openExamPicker = () => {
    setExamPickerDraft(selectedExams)
    setExamPickerSearch('')
    setExamPickerOpen(true)
  }

  const pageSize = Number(perPage) > 0 ? Number(perPage) : filteredRows.length || 1
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleFilter = () => {
    setPage(1)
    setApplied(a => a + 1)
  }

  const handleGenerate = async () => {
    if (filteredRows.length === 0) return
    if (!user?.companyId) {
      toast.error('Empresa não identificada.')
      return
    }
    const sectors = Array.from(new Set(filteredRows.map(r => r.sector)))
    try {
      const record = await createWorkMap({
        itemKeys: filteredRows.map(r => r.key),
        sector: sectors.length === 1 ? sectors[0] : 'Múltiplos',
        responsible: user?.name || 'Usuário',
        companyId: user.companyId,
        userId: user?.id,
      })

      // Limpar filtros e resetar estado após geração
      setExamTerm('')
      setSector(ALL)
      setConvenio(ALL)
      setPlan(ALL)
      setPriority(ALL)
      setPost(ALL)
      setPage(1)
      setApplied(a => a + 1)

      toast.success(`Mapa ${record.code} gerado com ${record.itemsCount} exame(s).`)
      navigate(`/app/lab/mapa/${record.code}`)
    } catch {
      toast.error('Não foi possível gerar o mapa de trabalho.')
    }
  }


  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-primary to-[hsl(268_93%_57%)] px-5 py-4 shadow-md">
        <div className="flex items-center gap-3 text-primary-foreground">
          <ClipboardList className="h-5 w-5" />
          <h1 className="text-lg font-bold tracking-tight">Novo Mapa de Trabalho</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setListMapsModal(true)}
            className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <List className="mr-2 h-4 w-4" /> Mapas Gerados
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={filteredRows.length === 0}
            className="rounded-full bg-warning px-6 font-bold text-warning-foreground hover:bg-warning/90 disabled:opacity-50"
          >
            <FileCheck2 className="mr-2 h-4 w-4" /> Gerar Mapa
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="overflow-hidden border-warning/40">
        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          className="flex w-full items-center justify-between bg-warning/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground"
        >
          Filtros
          <ChevronDown className={cn('h-4 w-4 transition-transform', !filtersOpen && '-rotate-90')} />
        </button>

        {filtersOpen && (
          <div className="grid grid-cols-1 gap-3 bg-warning/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Exame</Label>
              <div className="flex gap-2">
                <Input value={examTerm} onChange={e => setExamTerm(e.target.value)} placeholder="Código ou nome (ex: TSH)" />
                <Button
                  type="button"
                  variant={selectedExams.length ? 'default' : 'outline'}
                  size="icon"
                  className="relative shrink-0"
                  title="Selecionar exames do mapa"
                  aria-label="Selecionar exames do mapa"
                  onClick={openExamPicker}
                >
                  <ListChecks className="h-4 w-4" />
                  {selectedExams.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">{selectedExams.length}</span>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Bancada</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="z-[100] bg-popover">
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Convênio</Label>
              <Select value={convenio} onValueChange={v => { setConvenio(v); setPlan(ALL) }}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="z-[100] bg-popover">
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(convenios || []).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Plano</Label>
              <Select value={plan} onValueChange={setPlan} disabled={convenio === ALL}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="z-[100] bg-popover">
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {convenio !== ALL && <SelectItem value={convenio}>{convenio}</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Prioridade</Label>
              <div className="flex gap-2">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent className="z-[100] bg-popover">
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setPriorityModal(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Posto de Coleta</Label>
              <Select value={post} onValueChange={setPost}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent className="z-[100] bg-popover">
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(availableOrigins || []).map((o: any) => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Quantidade</Label>
              <Input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase">Itens por página</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={perPage}
                  onChange={e => { setPerPage(e.target.value); setPage(1) }}
                  placeholder="Todos"
                />
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">(Todos)</span>
                <Button type="button" onClick={handleFilter} className="gap-2">
                  <Filter className="h-4 w-4" /> Filtrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Listagem */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Total listados: {filteredRows.length}</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span>{currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Nenhum exame disponível"
            description="Somente exames com coleta realizada, guia de remessa recebida e ainda não incluídos em outro mapa aparecem aqui."
          />
        ) : (
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="text-left uppercase tracking-wide text-[10px] text-muted-foreground">
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="px-3 py-2">Exame</th>
                  <th className="px-3 py-2">Bancada</th>
                  <th className="px-3 py-2">Convênio</th>
                  <th className="px-3 py-2">Prioridade</th>
                  <th className="px-3 py-2">Posto de Coleta</th>
                  <th className="px-3 py-2">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r, i) => (
                  <tr key={r.key} className={cn('border-t border-border', i % 2 === 1 && 'bg-muted/40')}>
                    <td className="px-3 py-2 font-mono font-bold">{r.code}</td>
                    <td className="px-3 py-2">{r.patient}</td>
                    <td className="px-3 py-2 font-semibold">{r.exam}</td>
                    <td className="px-3 py-2">{r.sector}</td>
                    <td className="px-3 py-2">{r.convenio}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold',
                        r.priority === 'Normal' ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive')}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2">{r.collectionPost}</td>
                    <td className="px-3 py-2" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={priorityModal} onOpenChange={setPriorityModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova Prioridade</DialogTitle></DialogHeader>
          <Input value={newPriority} onChange={e => setNewPriority(e.target.value)} placeholder="Ex: Emergência" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriorityModal(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const v = newPriority.trim()
                if (!v) return
                setPriorities(p => Array.from(new Set([...p, v])))
                setNewPriority('')
                setPriorityModal(false)
                toast.success('Prioridade adicionada (mock).')
              }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={examPickerOpen} onOpenChange={setExamPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Selecionar exames do mapa</DialogTitle></DialogHeader>
          <Input value={examPickerSearch} onChange={e => setExamPickerSearch(e.target.value)} placeholder="Buscar exame..." />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{examPickerDraft.length} selecionado(s)</span>
            <div className="flex gap-3">
              <button type="button" className="hover:underline" onClick={() => setExamPickerDraft(examOptions.map(o => o.exam))}>Marcar todos</button>
              <button type="button" className="hover:underline" onClick={() => setExamPickerDraft([])}>Limpar</button>
            </div>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
            {examOptions
              .filter(o => `${o.exam} ${o.name}`.toLowerCase().includes(examPickerSearch.trim().toLowerCase()))
              .map(o => {
                const checked = examPickerDraft.includes(o.exam)
                return (
                  <label key={o.exam} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={v => setExamPickerDraft(d => (v ? [...d, o.exam] : d.filter(x => x !== o.exam)))}
                    />
                    <span className="flex-1 text-sm font-medium">{o.exam}</span>
                    <span className="text-xs text-muted-foreground">{o.count}</span>
                  </label>
                )
              })}
            {examOptions.length === 0 && <p className="p-2 text-sm text-muted-foreground">Nenhum exame disponível.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamPickerOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                setSelectedExams(examPickerDraft)
                setPage(1)
                setExamPickerOpen(false)
              }}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ListWorkMapsModal 
        open={listMapsModal} 
        onOpenChange={setListMapsModal}
        onRefresh={() => setApplied(a => a + 1)}
      />
    </div>
  )
}
