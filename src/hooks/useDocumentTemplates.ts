import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { effectiveTemplates, type DocumentTemplate } from '@/lib/documentTemplates'
export function useDocumentTemplates() {
  const {user}=useAuth(); const [rows,setRows]=useState<DocumentTemplate[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  const refresh=useCallback(async()=>{
    if (!user?.companyId) {setLoading(false);return}
    setLoading(true);setError('')
    const {data,error}=await supabase.from('document_templates').select('*').or(`company_id.eq.${user.companyId},company_id.is.null`).order('created_at')
    if(error) setError(error.message); else setRows((data || []) as DocumentTemplate[])
    setLoading(false)
  },[user?.companyId])
  useEffect(()=>{void refresh()},[refresh])
  return {templates:effectiveTemplates(rows), originals:rows.filter(r=>r.is_system_default),loading,error,refresh}
}