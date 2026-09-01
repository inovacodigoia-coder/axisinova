import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Printer, FileText, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useLabReportData, type LabReportSections, type ReportRow } from '@/hooks/useLabReportData'
import { LabReportDocument, type ChartKind, type ReportSectionConfig } from './LabReportDocument'
import { format, startOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const SECTION_DEFS: { key: keyof LabReportSections; label: string; chartable: boolean }[] = [
  { key: 'resumo', label: 'Resumo Geral (KPIs)', chartable: false },
  { key: 'status', label: 'Pedidos por Status', chartable: true },
  { key: 'material', label: 'Amostras por Material', chartable: true },
  { key: 'setor', label: 'Amostras por Setor', chartable: true },
  { key: 'exames', label: 'Exames mais Realizados', chartable: true },
  { key: 'convenio', label: 'Pedidos por Convênio', chartable: true },
  { key: 'origem', label: 'Pedidos por Origem/Unidade', chartable: true },
  { key: 'medico', label: 'Médicos Solicitantes', chartable: true },
  { key: 'pagamento', label: 'Tipo de Pagamento', chartable: true },
  { key: 'pedidos', label: 'Pedidos Detalhados (lista)', chartable: false },
]

const CHART_OPTIONS: { value: ChartKind; label: string }[] = [
  { value: 'none', label: 'Sem gráfico' },
  { value: 'pie', label: 'Pizza' },
  { value: 'donut', label: 'Rosca' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linha' },
]

const QUICK_RANGES = [
  { label: 'Hoje', get: () => ({ from: new Date(), to: new Date() }) },
  { label: '7 dias', get: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: '30 dias', get: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'Este mês', get: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Mês passado', get: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
]

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

export function LabReportModal({ open, onOpenChange }: Props) {
  const { user } = useAuth()
  const [from, setFrom] = useState(() => iso(subDays(new Date(), 29)))
  const [to, setTo] = useState(() => iso(new Date()))
  const [selected, setSelected] = useState<Record<string, boolean>>({
    resumo: true, status: true, material: true, setor: true, exames: true,
    convenio: false, origem: false, medico: false, pagamento: false, pedidos: false,
  })
  const [charts, setCharts] = useState<Record<string, ChartKind>>({
    status: 'donut', material: 'pie', setor: 'bar', exames: 'bar',
    convenio: 'donut', origem: 'pie', medico: 'bar', pagamento: 'pie',
  })
  const [brandName, setBrandName] = useState('AxisInova')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!open || !user?.companyId) return
    supabase
      .from('company_branding')
      .select('brand_name, logo_url')
      .eq('company_id', user.companyId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.brand_name) setBrandName(data.brand_name)
        setLogoUrl(data?.logo_url || null)
      })
  }, [open, user?.companyId])

  const fromDate = useMemo(() => (from ? startOfDay(new Date(`${from}T00:00:00`)) : null), [from])
  const toDate = useMemo(() => (to ? startOfDay(new Date(`${to}T00:00:00`)) : null), [to])
  const [origin, setOrigin] = useState<string>('all')
  const { data, loading, originOptions } = useLabReportData(fromDate, toDate, origin)

  const sections: ReportSectionConfig[] = useMemo(
    () =>
      SECTION_DEFS.filter(s => selected[s.key]).map(s => ({
        key: s.key,
        label: s.label,
        chart: s.chartable ? charts[s.key] || 'none' : 'none',
      })),
    [selected, charts]
  )

  const periodLabel =
    fromDate && toDate
      ? `${format(fromDate, 'dd/MM/yyyy')} a ${format(toDate, 'dd/MM/yyyy')}`
      : 'Todos os períodos'
  const generatedAt = format(new Date(), "dd/MM/yyyy 'às' HH:mm")

  const handlePrint = () => {
    if (!sections.length) return toast.error('Selecione ao menos um dado para o relatório.')
    setPrinting(true)
    document.body.classList.add('printing-lab-report')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('printing-lab-report')
      setPrinting(false)
    }, 400)
  }

  const buildWorkbook = () => {
    const wb = XLSX.utils.book_new()
    const header = [
      [brandName],
      ['Relatório Laboratorial Personalizado'],
      [`Período: ${periodLabel}`],
      [`Gerado em: ${generatedAt}`],
      [],
    ]

    sections.forEach(sec => {
      let aoa: any[][] = [...header]
      if (sec.key === 'resumo') {
        const r = data.resumo
        aoa.push(['Indicador', 'Valor'])
        aoa.push(['Pedidos', r.totalOrders], ['Exames', r.totalExams], ['Pacientes', r.totalPatients],
          ['Liberados', r.released], ['Em andamento', r.pending], ['Faturamento (R$)', r.revenue])
      } else if (sec.key === 'pedidos') {
        aoa.push(['Protocolo', 'Paciente', 'Data/Hora', 'Status', 'Convênio', 'Exames', 'Valor (R$)'])
        data.pedidos.forEach(p => aoa.push([p.protocol, p.patient, p.date, p.status, p.convenio, p.exams, p.value]))
      } else {
        aoa.push(['Descrição', 'Quantidade', '%'])
        ;(data[sec.key] as ReportRow[]).forEach(r => aoa.push([r.label, r.count, r.percentage]))
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 38 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 10 }, { wch: 14 }]
      XLSX.utils.book_append_sheet(wb, ws, sec.label.slice(0, 28).replace(/[\\/?*[\]:]/g, ''))
    })
    return wb
  }

  const handleExport = (ext: 'xlsx' | 'xls' | 'csv') => {
    if (!sections.length) return toast.error('Selecione ao menos um dado para o relatório.')
    const wb = buildWorkbook()
    const name = `relatorio-lab-${brandName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyyMMdd-HHmm')}.${ext}`
    XLSX.writeFile(wb, name, { bookType: ext === 'xls' ? 'biff8' : ext })
    toast.success(`Arquivo ${ext.toUpperCase()} gerado com sucesso!`)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle>Relatórios Personalizados</DialogTitle>
            <DialogDescription>
              Escolha o período, os dados e os gráficos que devem sair no relatório.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] max-h-[70vh]">
            <div className="border-r">
              <ScrollArea className="h-[70vh]">
                <div className="p-4 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Período</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_RANGES.map(q => (
                        <button
                          key={q.label}
                          onClick={() => { const r = q.get(); setFrom(iso(r.from)); setTo(iso(r.to)) }}
                          className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">De</Label>
                        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Até</Label>
                        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Dados do relatório
                    </Label>
                    {SECTION_DEFS.map(s => (
                      <div key={s.key} className="rounded-lg border border-border p-2.5 space-y-2">
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id={`sec-${s.key}`}
                            checked={!!selected[s.key]}
                            onCheckedChange={v => setSelected(p => ({ ...p, [s.key]: !!v }))}
                            className="mt-0.5"
                          />
                          <label htmlFor={`sec-${s.key}`} className="text-xs font-medium leading-snug cursor-pointer">
                            {s.label}
                          </label>
                        </div>
                        {s.chartable && selected[s.key] && (
                          <Select
                            value={charts[s.key] || 'none'}
                            onValueChange={(v: ChartKind) => setCharts(p => ({ ...p, [s.key]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CHART_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="h-[70vh] bg-muted/40">
              <div className="p-4">
                {loading ? (
                  <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando dados...
                  </div>
                ) : (
                  <div className="origin-top scale-[0.78] lg:scale-[0.85]">
                    <div className="shadow-lg">
                      <LabReportDocument
                        brandName={brandName}
                        logoUrl={logoUrl}
                        periodLabel={periodLabel}
                        generatedAt={generatedAt}
                        sections={sections}
                        data={data}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t px-6 py-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <FileText className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('xls')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> .xls
            </Button>
            <Button variant="outline" onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> .xlsx
            </Button>
            <Button onClick={handlePrint} disabled={printing} className="gradient-bg border-none">
              <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {open &&
        createPortal(
          <div id="lab-report-print-root">
            <LabReportDocument
              brandName={brandName}
              logoUrl={logoUrl}
              periodLabel={periodLabel}
              generatedAt={generatedAt}
              sections={sections}
              data={data}
            />
          </div>,
          document.body
        )}
    </>
  )
}
