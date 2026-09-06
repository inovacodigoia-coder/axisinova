import { useCallback, useEffect, useState } from 'react'
import { FileDown, Handshake, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { generatePartnerIntegrationGuide, canGeneratePartnerGuide } from '@/lib/partnerIntegrationGuide'
import { buildPartnerExamCatalog, type PartnerCatalogExam } from '@/lib/partnerExamCatalog'
import type { ApiPartner, ApiPartnerCredential, ApiPartnerType } from '@/types/api-partners.types'
import type { Exam } from '@/types/registers.types'

interface PartnerRow {
  id: string
  name: string
  document: string
  type: string
  status: string
  api_authorized: boolean
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  credentials: ApiPartnerCredential[]
}

function toApiPartner(r: PartnerRow, companyId: string): ApiPartner {
  return {
    id: r.id,
    companyId,
    type: r.type as ApiPartnerType,
    name: r.name,
    document: r.document,
    contactName: r.contact_name || undefined,
    contactEmail: r.contact_email || '',
    contactPhone: r.contact_phone || undefined,
    authMethod: 'oauth2',
    apiAuthorized: r.api_authorized,
    status: r.status === 'inactive' ? 'inactive' : 'active',
    credentials: Array.isArray(r.credentials) ? r.credentials : [],
    lastSyncAt: null,
    createdAt: new Date().toISOString(),
  }
}

const TYPE_LABEL: Record<string, string> = {
  laboratorio: 'Laboratório',
  clinica: 'Clínica',
  convenio: 'Convênio',
  medico: 'Médico Solicitante',
}

export function CompanyPartnersPanel({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<PartnerCatalogExam[]>([])

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('api_partners')
      .select('id, name, document, type, status, api_authorized, contact_name, contact_email, contact_phone, credentials')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (!error) setRows((data || []) as PartnerRow[])
    setLoading(false)
  }, [companyId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!companyId) return
    void (async () => {
      const [{ data: exams }, { data: benches }] = await Promise.all([
        supabase.from('exams').select('*').eq('company_id', companyId),
        supabase.from('lab_workbenches').select('id, name').eq('company_id', companyId),
      ])
      const mapped = (exams || []).map(e => ({
        id: e.id,
        name: e.name,
        internalCode: (e as { internal_code?: string }).internal_code ?? '',
        isActive: e.is_active,
        type: e.type ?? 'lab',
        workbenchId: (e as { workbench_id?: string }).workbench_id ?? undefined,
      })) as unknown as Exam[]
      setCatalog(buildPartnerExamCatalog(mapped, benches || []))
    })()
  }, [companyId])

  const generateGuide = (row: PartnerRow) => {
    const partner = toApiPartner(row, companyId)
    if (!canGeneratePartnerGuide(partner)) {
      toast.error('Este parceiro ainda não possui credenciais ativas para gerar o guia.')
      return
    }
    generatePartnerIntegrationGuide(partner, catalog)
    toast.success('Guia de integração gerado.')
  }

  const toggle = async (row: PartnerRow, authorized: boolean) => {
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, api_authorized: authorized } : r)))
    const { error } = await supabase
      .from('api_partners')
      .update({ api_authorized: authorized })
      .eq('id', row.id)
    if (error) {
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, api_authorized: !authorized } : r)))
      toast.error('Não foi possível atualizar a autorização do parceiro.')
      return
    }
    toast.success(authorized ? `${row.name} autorizado a usar a API.` : `${row.name} voltou para pendente.`)
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Parceiros cadastrados pela empresa
        </p>
        <Button variant="ghost" size="sm" onClick={() => void load()} className="h-8 gap-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando parceiros…</p>
      ) : rows.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Handshake className="h-4 w-4" /> Nenhum parceiro cadastrado por esta empresa.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[r.type] || r.type} · {r.document}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => generateGuide(r)}
                >
                  <FileDown className="h-3.5 w-3.5" /> Gerar Guia
                </Button>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.api_authorized
                    ? 'bg-[hsl(142,71%,45%)]/15 text-[hsl(142,71%,30%)]'
                    : 'bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,32%)]'
                }`}>
                  {r.api_authorized ? 'Autorizado' : 'Pendente'}
                </span>
                <Switch checked={r.api_authorized} onCheckedChange={v => void toggle(r, v)} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Todo novo parceiro nasce pendente. A empresa só consegue usar a API depois que o Super Admin autorizar aqui.
      </p>
    </div>
  )
}
