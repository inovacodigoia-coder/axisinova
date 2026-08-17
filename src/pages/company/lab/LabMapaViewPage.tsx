import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FilePlus, Printer, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useRegisters } from '@/context/RegistersContext'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { getWorkMap, workMapItemKey } from '@/mocks/work-map.mock'
import { calculateAge, formatDateTime } from '@/utils/formatters'
import { EmptyState } from '@/components/feedback/EmptyState'
import { buildExamParams, findCatalogExam, type ResolvedParam } from '@/utils/examParameters'
import { differenceInYears } from 'date-fns'

type ViewMode = 'completo' | 'exame' | 'compacto' | 'grade'

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'completo', label: 'Completo' },
  { id: 'exame', label: 'Exame' },
  { id: 'compacto', label: 'Compacto' },
  { id: 'grade', label: 'Grade' },
]

interface MapExam {
  sigla: string
  nome: string
  material: string
  examId?: string
  inMap: boolean
}

interface MapPatient {
  id: string
  codigo: string
  paciente: string
  idade: string
  sexo: string
  convenio: string
  postoColeta: string
  entrega: string
  observacoesPaciente?: string
  observacoesClinicas?: string
  exams: MapExam[]
}

function shortDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function sexLabel(gender?: string) {
  const g = (gender || '').toLowerCase()
  if (g.startsWith('m')) return 'M'
  if (g.startsWith('f')) return 'F'
  return '-'
}

/** Sigla curta do parâmetro no estilo COL01 (sigla do exame + ordem). */
function paramSigla(exam: MapExam, param: { name?: string }, index: number, total: number) {
  if (total <= 1) return `${exam.sigla}01`
  const n = (param.name || '').trim()
  return n ? n.toUpperCase() : `${exam.sigla}${String(index + 1).padStart(2, '0')}`
}

export default function LabMapaViewPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const map = codigo ? getWorkMap(codigo) : undefined
  const { orders, loading } = useAttendanceCadastro()
  const { registeredExams } = useRegisters() as any

  const [view, setView] = useState<ViewMode>('completo')
  const [paramsByExamId, setParamsByExamId] = useState<Record<string, ResolvedParam[]>>({})

  const includedKeys = useMemo(() => new Set(map?.itemKeys || []), [map])

  // Resolve catálogo (sigla, material, id) por nome/código do exame
  const catalogIndex = useMemo(() => {
    const idx: Record<string, any> = {}
    ;(registeredExams || []).forEach((e: any) => {
      const keys = [e.name, e.internalCode, e.tussCode].filter(Boolean).map((k: string) => String(k).toLowerCase())
      keys.forEach(k => { idx[k] = e })
    })
    return idx
  }, [registeredExams])

  const patients = useMemo<MapPatient[]>(() => {
    if (!map) return []
    const list: MapPatient[] = []

    ;(orders || []).forEach(order => {
      const exams: MapExam[] = []
      ;(order.labGuides || []).forEach((guide: any, gi: number) => {
        ;(guide?.exams || []).forEach((exam: any, ei: number) => {
          if (exam?.status === 'cancelled') return
          const key = workMapItemKey(order.id, gi, ei)
          const cat = findCatalogExam(registeredExams || [], {
            examId: exam.examId,
            code: exam.code,
            name: exam.name,
          })
          
          exams.push({
            sigla: (exam.abbreviation || cat?.internal_code || cat?.internalCode || exam.code || String(exam.name || '').slice(0, 3)).toString().toUpperCase(),
            nome: exam.name || cat?.name || '—',
            material: exam.material || (cat?.selectedMaterials || [])[0] || 'Soro',
            examId: cat?.id,
            inMap: includedKeys.has(key),
          })
        })
      })

      if (!exams.some(e => e.inMap)) return

      const guide0 = (order.labGuides || [])[0] || {}
      list.push({
        id: order.id,
        codigo: order.protocol || order.orderNumber || '—',
        paciente: (order.patientName || '—').toUpperCase(),
        idade: order.patientBirthDate ? String(calculateAge(order.patientBirthDate)) : '—',
        sexo: sexLabel(order.patientGender),
        convenio: guide0?.plan || order.convenioName || 'PARTICULAR',
        postoColeta: order.originName || '—',
        entrega: shortDate(order.deliveryDate || order.updatedAt),
        observacoesPaciente: (order as any).observations || guide0?.observations || undefined,
        observacoesClinicas: (order as any).clinicalObservations || undefined,
        exams,
      })
    })

    return list
  }, [orders, map, includedKeys, registeredExams])

  // Buscar parâmetros dos exames presentes no mapa e resolver referências por paciente
  useEffect(() => {
    const examIds = Array.from(new Set(patients.flatMap(p => p.exams.filter(e => e.inMap).map(e => e.examId)).filter(Boolean))) as string[]
    if (examIds.length === 0 || !registeredExams) return

    const grouped: Record<string, ResolvedParam[]> = {}
    
    // Iterar sobre cada paciente para resolver parâmetros específicos para idade/sexo
    patients.forEach(patient => {
      const birthDate = (orders || []).find(o => o.id === patient.id)?.patientBirthDate
      const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : undefined
      
      patient.exams.filter(e => e.inMap).forEach(exam => {
        if (!exam.examId) return
        const cat = (registeredExams as any[]).find(c => c.id === exam.examId)
        if (!cat) return

        const resolved = buildExamParams(cat, exam.nome, {
          gender: patient.sexo === 'M' ? 'masculino' : patient.sexo === 'F' ? 'feminino' : undefined,
          age
        })
        
        // No mapa de trabalho, armazenamos por examId, mas a resolução de buildExamParams
        // pode variar por paciente se as referências mudarem. 
        // Porém, para a lista de parâmetros base do exame:
        grouped[exam.examId] = resolved
      })
    })
    
    setParamsByExamId(grouped)
  }, [patients, registeredExams, orders])

  const paramsFor = (exam: MapExam) => (exam.examId && paramsByExamId[exam.examId]) || []
  const isComplexo = (exam: MapExam) => paramsFor(exam).length > 0

  const title = view === 'exame' ? 'Mapa de Trabalho por Exames' : 'Mapa de Trabalho'

  if (!map) {
    return (
      <div className="space-y-5">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/app/lab/mapa')}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Mapa não encontrado"
            description={`Não foi possível localizar o mapa ${codigo}. Gere um novo mapa de trabalho.`}
          />
        </Card>
      </div>
    )
  }

  const PatientHeader = ({ p }: { p: MapPatient }) => (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] font-bold">
      <span>DEMO</span>
      <span className="font-mono">{p.codigo}</span>
      <span className="uppercase">{p.paciente}</span>
      <span className="font-normal">{p.convenio}</span>
      <span className="font-normal">{p.idade}(A){p.sexo}</span>
      <span className="ml-auto font-normal">Entrega:{p.entrega}</span>
    </div>
  )

  const DemaisExames = ({ p }: { p: MapPatient }) => {
    const others = p.exams.filter(e => !e.inMap)
    if (others.length === 0) return null
    return (
      <p className="mt-1 text-[11px]">
        <span className="font-semibold">Demais Exames:</span> {others.map(e => e.sigla).join(' ')}
      </p>
    )
  }

  return (
    <div className="space-y-5 print:space-y-0">
      <style>{`@media print {
        @page { margin: 10mm }
        body { background: #fff !important }
        body * { visibility: hidden !important }
        #work-map-print, #work-map-print * { visibility: visible !important }
        #work-map-print { position: absolute !important; left: 0; top: 0; width: 100% }
        .no-print { display: none !important }
      }`}</style>

      {/* Navegação */}
      <div className="no-print space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Visualizações</span>
              <div className="flex overflow-hidden rounded-lg border border-border">
                {VIEWS.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    className={cn(
                      'px-4 py-1.5 text-xs font-semibold transition-colors',
                      view === v.id
                        ? 'bg-gradient-to-r from-primary to-[hsl(268_93%_57%)] text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/app/lab/mapa')}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/app/lab/mapa', { state: { reset: Date.now() } })}>
              <FilePlus className="h-4 w-4" /> Novo
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-[hsl(268_93%_57%)] text-primary-foreground"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo do mapa */}
      <div id="work-map-print" className="rounded-xl border border-border bg-white p-5 text-black print:rounded-none print:border-0 print:p-0">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-black pb-2 text-[12px]">
          <span><span className="font-semibold">Setor:</span> {(map.sector || '—').toUpperCase()}</span>
          <span><span className="font-semibold">Data:</span> {formatDateTime(map.generatedAt)}</span>
          <span><span className="font-semibold">Responsável:</span> {map.responsible}</span>
          <span className="ml-auto font-bold">Código: {map.code}</span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm">Carregando mapa…</p>
        ) : patients.length === 0 ? (
          <p className="py-8 text-center text-sm">Nenhum exame encontrado para este mapa.</p>
        ) : view === 'completo' ? (
          <div className="divide-y divide-black/30">
            {patients.map(p => (
              <div key={p.id} className="py-3 print:break-inside-avoid">
                <PatientHeader p={p} />
                {p.exams.filter(e => e.inMap).map((e, i) => (
                  <div key={i} className="mt-2">
                    <p className="text-[12px] font-bold border-b border-black pb-0.5">{e.nome.toUpperCase()} - {e.material.toUpperCase()}</p>
                    {paramsFor(e).length > 0 && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {paramsFor(e).map((param, pi) => (
                          <div key={pi} className="border border-black/20 rounded p-1.5 flex flex-col gap-0.5 min-h-[56px] print:min-h-[50px]">
                            <span className="text-[9px] font-bold uppercase truncate leading-tight">{param.name}</span>
                            <div className="border border-black/40 h-6 bg-gray-50 flex items-center px-1" />
                            <div className="flex flex-col text-[7.5px] text-gray-600 mt-auto leading-[1.1]">
                              {param.reference && <span className="truncate">Ref: {param.reference}</span>}
                              {param.unit && <span className="font-semibold uppercase">{param.unit}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <DemaisExames p={p} />
              </div>
            ))}
          </div>
        ) : view === 'exame' ? (
          <div className="space-y-5">
            {Array.from(
              patients.reduce((acc, p) => {
                p.exams.filter(e => e.inMap).forEach(e => {
                  const k = `${e.sigla}|${e.nome}`
                  const cur = acc.get(k) || { exam: e, list: [] as MapPatient[] }
                  cur.list.push(p)
                  acc.set(k, cur)
                })
                return acc
              }, new Map<string, { exam: MapExam; list: MapPatient[] }>())
            ).map(([k, group]) => (
              <div key={k}>
                <p className="border-b border-black pb-1 text-[12px] font-bold">
                  {group.exam.sigla} - {group.exam.nome.toUpperCase()}
                </p>
                <div className="divide-y divide-black/20">
                  {group.list.map(p => {
                    const ps = paramsFor(group.exam)
                    const items = ps.length > 0 ? ps : [{ id: '1', name: group.exam.nome, unit: '', reference: '' } as ResolvedParam]
                    return (
                      <div key={p.id} className="py-2 print:break-inside-avoid">
                        <PatientHeader p={p} />
                        <div className="mt-0.5">
                          {items.map((param, pi) => (
                            <div key={pi} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-x-6 text-[11px] leading-5">
                              <span className="truncate">
                                {paramSigla(group.exam, param, pi, items.length)}:<span className="text-gray-500">_____________</span>
                              </span>
                              <span>Observação: <span className="text-gray-500">_______________</span></span>
                              <span className="text-[9px] text-gray-500 text-right">
                                {param.unit}{param.reference ? ` · Ref: ${param.reference}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                        {p.observacoesPaciente && (
                          <p className="text-[11px]"><span className="font-semibold">Observações Paciente:</span> {p.observacoesPaciente}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : view === 'compacto' ? (
          <div className="divide-y divide-black/30">
            {patients.map(p => (
              <div key={p.id} className="py-3 print:break-inside-avoid">
                <PatientHeader p={p} />
                <div className="mt-1">
                  {p.exams.filter(e => e.inMap).map((e, i) => (
                    <div key={i} className="mb-1">
                      <p className="text-[11px] leading-5">
                        <span className="font-bold">{e.nome.toUpperCase()}</span> - {e.material}
                      </p>
                      {paramsFor(e).length > 1 && (
                        <p className="pl-3 text-[10px] leading-4 text-gray-700">
                          {paramsFor(e).map(param => param.name + (param.unit ? ` (${param.unit})` : '')).join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {p.observacoesClinicas && (
                  <p className="mt-1 text-[11px]"><span className="font-semibold">Observações, doenças e medicamentos:</span> {p.observacoesClinicas}</p>
                )}
                <DemaisExames p={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-black/30">
            {patients.map(p => {
              const mine = p.exams.filter(e => e.inMap)
              const allParams = mine.flatMap(e => {
                const ps = paramsFor(e)
                if (ps.length === 0) return [{ name: e.sigla }]
                return ps.map((param, pi) => ({ name: paramSigla(e, param, pi, ps.length) }))
              })
              const chunks: { name: string }[][] = []
              for (let i = 0; i < allParams.length; i += 5) chunks.push(allParams.slice(i, i + 5))

              return (
                <div key={p.id} className="py-3 print:break-inside-avoid">
                  <PatientHeader p={p} />
                  <div className="mt-1 space-y-1">
                    {chunks.map((chunk, ci) => (
                      <table key={ci} className="w-auto table-fixed border-collapse text-[11px]">
                        <thead>
                          <tr>
                            {chunk.map((item, i) => (
                              <th key={i} className="w-[190px] border border-black px-2 py-0.5 text-center text-[10px] font-bold uppercase">
                                <span className="block truncate">{item.name}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {chunk.map((_, i) => <td key={i} className="h-6 w-[190px] border border-black" />)}
                          </tr>
                        </tbody>
                      </table>
                    ))}
                  </div>
                  {p.observacoesClinicas && (
                    <p className="mt-1 text-[11px]"><span className="font-semibold">Observações, doenças e medicamentos:</span> {p.observacoesClinicas}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
