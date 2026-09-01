import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { resolveCompanyId } from '@/utils/companyId'

export interface GlobalSearchItem {
  id: string
  category: 'PACIENTES' | 'MÉDICOS' | 'ATENDIMENTOS'
  label: string
  sublabel?: string
  route: string
}

function onlyDigits(s: string) { return s.replace(/\D/g, '') }

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return ''
  const t = new Date()
  let a = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--
  return `${a} anos`
}

/**
 * Busca global (pacientes, médicos, atendimentos) diretamente no backend,
 * com debounce e escopo por empresa.
 */
export function useGlobalSearchResults(query: string) {
  const { user } = useAuth()
  const companyId = resolveCompanyId(user?.companyId)
  const [results, setResults] = useState<GlobalSearchItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || !companyId) { setResults([]); setLoading(false); return }

    let cancelled = false
    setLoading(true)

    const timer = setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) { if (!cancelled) { setResults([]); setLoading(false) } ; return }

      const like = `%${q}%`
      const digits = onlyDigits(q)
      const patientFilters = [`name.ilike.${like}`, `social_name.ilike.${like}`, `mother_name.ilike.${like}`]
      if (digits.length >= 3) patientFilters.push(`cpf.ilike.%${digits}%`, `phone.ilike.%${digits}%`)

      const [patientsRes, doctorsRes, ordersRes] = await Promise.all([
        supabase.from('patients')
          .select('id, name, social_name, cpf, birth_date, status')
          .eq('company_id', companyId)
          .or(patientFilters.join(','))
          .limit(8),
        supabase.from('doctors')
          .select('id, full_name, crm, crm_state, is_active')
          .eq('company_id', companyId)
          .or(`full_name.ilike.${like},crm.ilike.${like}`)
          .limit(5),
        supabase.from('attendance_orders')
          .select('id, protocol, order_number, patient_name, status, created_at')
          .eq('company_id', companyId)
          .neq('status', 'deleted')
          .or(`patient_name.ilike.${like},protocol.ilike.${like},order_number.ilike.${like}`)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      if (cancelled) return

      const items: GlobalSearchItem[] = []

      for (const p of patientsRes.data || []) {
        items.push({
          id: `p_${p.id}`,
          category: 'PACIENTES',
          label: p.social_name || p.name,
          sublabel: [calcAge(p.birth_date), p.cpf].filter(Boolean).join(' · '),
          route: `/app/pacientes?id=${p.id}`,
        })
      }
      for (const d of doctorsRes.data || []) {
        items.push({
          id: `d_${d.id}`,
          category: 'MÉDICOS',
          label: d.full_name,
          sublabel: [d.crm && `CRM ${d.crm}${d.crm_state ? '/' + d.crm_state : ''}`].filter(Boolean).join(' · '),
          route: '/app/cadastros/medicos',
        })
      }
      for (const o of ordersRes.data || []) {
        items.push({
          id: `o_${o.id}`,
          category: 'ATENDIMENTOS',
          label: `Protocolo ${o.order_number || o.protocol}`,
          sublabel: [o.patient_name, o.status].filter(Boolean).join(' · '),
          route: '/app/recepcao',
        })
      }

      setResults(items)
      setLoading(false)
    }, 300)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, companyId])

  return { results, loading }
}
