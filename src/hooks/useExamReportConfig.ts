import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface LabReportTemplate {
  id: string
  company_id: string
  name: string
  description?: string | null
  header_html?: string | null
  body_html?: string | null
  footer_html?: string | null
  is_default: boolean
  single_page: boolean
  is_active: boolean
}

interface ExamReportRow {
  id: string
  name: string
  internal_code: string | null
  report_template_id: string | null
  report_single_page: boolean | null
  report_observations: string | null
}

const norm = (s?: string | null) => String(s || '').trim().toUpperCase()

/**
 * Carrega a configuração de laudo dos exames do catálogo (modelo atribuído,
 * folha exclusiva e observações) para aplicar na renderização do laudo.
 */
export function useExamReportConfig() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const [templates, setTemplates] = useState<LabReportTemplate[]>([])
  const [examRows, setExamRows] = useState<ExamReportRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    const [tpl, exs] = await Promise.all([
      supabase.from('lab_report_templates' as any).select('*').eq('company_id', companyId).order('name'),
      supabase
        .from('exams')
        .select('id,name,internal_code,report_template_id,report_single_page,report_observations')
        .eq('company_id', companyId),
    ])
    setTemplates(((tpl.data as any) || []) as LabReportTemplate[])
    setExamRows(((exs.data as any) || []) as ExamReportRow[])
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  /** Enriquece os exames do laudo com o modelo e a regra de folha exclusiva. */
  const enrichExams = useCallback(
    (exams: any[] = []) =>
      exams.map((e) => {
        const row =
          examRows.find((r) => r.id === (e.catalogId || e.examCatalogId)) ||
          examRows.find((r) => norm(r.internal_code) && norm(r.internal_code) === norm(e.code)) ||
          examRows.find((r) => norm(r.name) === norm(e.name))
        const tpl = row?.report_template_id
          ? templates.find((t) => t.id === row.report_template_id)
          : templates.find((t) => t.is_default && t.is_active)
        return {
          ...e,
          reportObservations: e.reportObservations || row?.report_observations || '',
          singlePage: e.singlePage ?? (row?.report_single_page || tpl?.single_page || false),
          reportTemplate: tpl || null,
        }
      }),
    [examRows, templates],
  )

  return { templates, loading, reload: load, enrichExams }
}
