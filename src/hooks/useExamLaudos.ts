import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface ExamLaudo {
  id: string
  exam_id: string
  company_id: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  methodology: string | null
  parameters: any[]
  reference_values: any[]
  result_deadline_days: number | null
  workbench_id: string | null
  selected_materials: string[]
  default_material: string | null
}

/** Próximo código sequencial no formato L001, L002... */
export function nextLaudoCode(existing: { code: string }[]): string {
  const numbers = existing
    .map((l) => parseInt(String(l.code || '').replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `L${String(next).padStart(3, '0')}`
}

/** Laudos de um exame do Catálogo (cada laudo = uma configuração própria). */
export function useExamLaudos(examId?: string) {
  const [laudos, setLaudos] = useState<ExamLaudo[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!examId) {
      setLaudos([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('exam_laudos')
      .select('id, exam_id, company_id, code, name, sort_order, is_active, methodology, parameters, reference_values, result_deadline_days, workbench_id, selected_materials, default_material')
      .eq('exam_id', examId)
      .order('sort_order', { ascending: true })
    setLoading(false)
    if (error) {
      console.error('Erro ao carregar laudos do exame:', error)
      return
    }
    setLaudos(
      (data || []).map((l: any) => ({
        ...l,
        parameters: Array.isArray(l.parameters) ? l.parameters : [],
        reference_values: Array.isArray(l.reference_values) ? l.reference_values : [],
        selected_materials: Array.isArray(l.selected_materials) ? l.selected_materials : [],
      })) as ExamLaudo[],
    )
  }, [examId])

  useEffect(() => { load() }, [load])

  return { laudos, loading, reload: load, setLaudos }
}

/** Garante que o exame tenha ao menos um laudo (Ordem 1, Ativo). */
export async function ensureDefaultLaudo(examId: string, companyId: string, exam?: any) {
  const { data } = await supabase
    .from('exam_laudos')
    .select('id')
    .eq('exam_id', examId)
    .limit(1)
  if (data && data.length > 0) return data[0].id as string

  const { data: created, error } = await supabase
    .from('exam_laudos')
    .insert({
      exam_id: examId,
      company_id: companyId,
      code: 'L001',
      name: 'Laudo Padrão',
      sort_order: 1,
      is_active: true,
      methodology: exam?.methodology || null,
      parameters: exam?.parameters || [],
      reference_values: exam?.referenceValues || [],
      result_deadline_days: exam?.resultDeadlineDays ?? null,
      workbench_id: exam?.workbenchId || null,
      selected_materials: exam?.selectedMaterials || [],
      default_material: exam?.defaultMaterial || null,
    })
    .select('id')
    .single()
  if (error) {
    console.error('Erro ao criar o laudo padrão:', error)
    return null
  }
  return created?.id as string
}
