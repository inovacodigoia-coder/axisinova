import { useMemo } from 'react'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { useRegisters } from '@/context/RegistersContext'
import { LAB_STATUS_META } from '@/hooks/useLabDashboardMetrics'
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export interface ReportRow {
  label: string
  count: number
  percentage: number
  extra?: string
}

export interface LabReportSections {
  resumo: {
    totalOrders: number
    totalExams: number
    totalPatients: number
    revenue: number
    released: number
    pending: number
  }
  status: ReportRow[]
  material: ReportRow[]
  setor: ReportRow[]
  exames: ReportRow[]
  convenio: ReportRow[]
  origem: ReportRow[]
  medico: ReportRow[]
  pagamento: ReportRow[]
  pedidos: {
    protocol: string
    patient: string
    date: string
    status: string
    convenio: string
    exams: number
    value: number
  }[]
}

const normalize = (v?: string) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

function materialGroup(raw?: string) {
  const m = normalize(raw)
  if (!m) return 'Não informado'
  if (m.includes('edta') || m.includes('sangue total')) return 'Sangue total (EDTA)'
  if (m.includes('citrato') || m.includes('plasma')) return 'Plasma (Citrato)'
  if (m.includes('soro') || m.includes('gel')) return 'Soro'
  if (m.includes('urina')) return 'Urina'
  if (m.includes('fezes')) return 'Fezes'
  if (m.includes('swab') || m.includes('secre')) return 'Swab / Secreção'
  if (m.includes('fluor')) return 'Fluoreto'
  return (raw || '').trim()
}

function tally(values: string[]): ReportRow[] {
  const map = new Map<string, number>()
  values.forEach(v => map.set(v, (map.get(v) || 0) + 1))
  const total = values.length || 1
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

export function useLabReportData(from: Date | null, to: Date | null): { data: LabReportSections; loading: boolean } {
  const { orders, loading } = useAttendanceCadastro()
  const { exams: catalog, workbenches } = useRegisters()

  const data = useMemo<LabReportSections>(() => {
    const range = from && to ? { start: startOfDay(from), end: endOfDay(to) } : null

    const labOrders = (orders || []).filter((o: any) => {
      if (o.status === 'deleted') return false
      if (o.examMode && o.examMode !== 'lab') return false
      if (!o.registeredAt) return false
      if (!range) return true
      try {
        return isWithinInterval(parseISO(o.registeredAt), range)
      } catch {
        return false
      }
    })

    const catalogById = new Map<string, any>()
    const catalogByName = new Map<string, any>()
    ;(catalog || []).forEach((e: any) => {
      catalogById.set(e.id, e)
      catalogByName.set(normalize(e.name), e)
    })
    const benchById = new Map((workbenches || []).map((w: any) => [w.id, w.name]))

    const examRows: { name: string; material: string; sector: string }[] = []
    const examsPerOrder = new Map<string, number>()

    labOrders.forEach((o: any) => {
      let count = 0
      ;(o.labGuides || []).forEach((g: any) => {
        ;(g.exams || []).forEach((e: any) => {
          const cat = catalogById.get(e.examId || e.id) || catalogByName.get(normalize(e.name || e.examName))
          examRows.push({
            name: e.name || e.examName || cat?.name || 'Exame',
            material: materialGroup(e.material || e.selectedMaterial || e.materialName || cat?.defaultMaterial),
            sector: cat?.workbenchId ? (benchById.get(cat.workbenchId) || 'Sem setor') : 'Sem setor',
          })
          count += 1
        })
      })
      examsPerOrder.set(o.id, count)
    })

    const revenue = labOrders.reduce((sum: number, o: any) => sum + (Number(o.privateValue) || 0), 0)
    const patients = new Set(labOrders.map((o: any) => o.patientId || o.patientName)).size
    const released = labOrders.filter((o: any) => ['released', 'completed'].includes(o.status)).length
    const pending = labOrders.filter((o: any) =>
      ['waiting_collection', 'waiting', 'open', 'collection_done', 'in_analysis'].includes(o.status)
    ).length

    return {
      resumo: {
        totalOrders: labOrders.length,
        totalExams: examRows.length,
        totalPatients: patients,
        revenue,
        released,
        pending,
      },
      status: tally(labOrders.map((o: any) => LAB_STATUS_META[o.status]?.label || o.status || 'Indefinido')),
      material: tally(examRows.map(r => r.material)),
      setor: tally(examRows.map(r => r.sector)),
      exames: tally(examRows.map(r => r.name)),
      convenio: tally(labOrders.map((o: any) => o.convenioName || 'Particular')),
      origem: tally(labOrders.map((o: any) => o.originName || 'Matriz')),
      medico: tally(labOrders.map((o: any) => o.requestingDoctor || o.doctorName || 'Não informado')),
      pagamento: tally(
        labOrders.map((o: any) =>
          o.paymentType === 'private' ? 'Particular' : o.paymentType === 'free' ? 'Cortesia' : 'Convênio'
        )
      ),
      pedidos: labOrders.map((o: any) => ({
        protocol: o.protocol || o.orderNumber || '-',
        patient: o.patientName || '-',
        date: o.registeredAt ? new Date(o.registeredAt).toLocaleString('pt-BR') : '-',
        status: LAB_STATUS_META[o.status]?.label || o.status || '-',
        convenio: o.convenioName || 'Particular',
        exams: examsPerOrder.get(o.id) || 0,
        value: Number(o.privateValue) || 0,
      })),
    }
  }, [orders, catalog, workbenches, from, to])

  return { data, loading }
}
