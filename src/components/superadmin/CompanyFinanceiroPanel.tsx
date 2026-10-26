import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
export function CompanyFinanceiroPanel({ companyId }: { companyId: string }) {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { void supabase.from('companies').select('financeiro_habilitado').eq('id', companyId).single().then(({ data }) => { if (data) { setEnabled(data.financeiro_habilitado); setReady(true) } }) }, [companyId])
  return <div className="flex items-center justify-between gap-3 border border-border rounded-lg p-4"><span className="font-medium text-sm">Financeiro</span><Switch aria-label="Ativar Financeiro" checked={enabled} disabled={!ready || busy} onCheckedChange={async v => { setBusy(true); const { error } = await supabase.rpc('financeiro_liberar', { _company: companyId, _habilitado: v }); setBusy(false); if (error) toast.error(error.message); else { setEnabled(v); toast.success(v ? 'Financeiro ligado' : 'Financeiro desligado') } }} /></div>
}