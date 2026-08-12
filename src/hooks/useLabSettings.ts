import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export interface LabSettingsData {
  lab_name?: string | null
  cnpj?: string | null
  phone?: string | null
  email?: string | null
  address_zip?: string | null
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_district?: string | null
  address_city?: string | null
  address_state?: string | null
  report_header_title?: string | null
  report_header_subtitle?: string | null
  report_logo_primary_url?: string | null
  report_logo_secondary_url?: string | null
  report_institutional_warning?: string | null
  report_footer_text?: string | null
  signature_name?: string | null
  signature_register?: string | null
  signature_image_url?: string | null
  signature_include_register?: boolean | null
  responsible_name?: string | null
  responsible_register?: string | null
}

export function useLabSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<LabSettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let active = true
    const companyId = user?.companyId
    if (!companyId) return

    ;(async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('lab_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle()
      if (!active) return
      if (error) console.error('Error loading lab settings:', error)
      setSettings((data as LabSettingsData) || null)
      setIsLoading(false)
    })()

    return () => {
      active = false
    }
  }, [user?.companyId])

  return { settings, isLoading }
}
