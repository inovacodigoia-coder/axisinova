import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { supabase } from '@/integrations/supabase/client'
import { useApoioEntitlement, APOIO_BLOQUEADO_MSG } from '@/hooks/useApoio'
import { ApoioLaboratoriosTab } from '@/components/apoio/ApoioLaboratoriosTab'

const ABAS = [
  { key: 'exames', label: 'Exames terceirizados' },
  { key: 'remessas', label: 'Remessas' },
  { key: 'contingencia', label: 'Contingência' },
  { key: 'laboratorios', label: 'Laboratórios' },
] as const
type Aba = typeof ABAS[number]['key']

interface Indicador { id: string; nome: string; modo: boolean; erroEm: string | null }

export function ApoioBloqueadoAviso() {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/10 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(38,92%,40%)]" />
      <p className="text-sm text-[hsl(38,92%,28%)]">{APOIO_BLOQUEADO_MSG}</p>
    </div>
  )
}

export default function SupportOutsourcingPage() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.some(a => a.key === params.get('aba')) ? params.get('aba') : 'laboratorios') as Aba
  const { enabled, loading } = useApoioEntitlement()
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [reload, setReload] = useState(0)

  useEffect(() => {
    (async () => {
      const { data: labs } = await supabase.from('apoio_laboratorio').select('id, nome, modo_contingencia').eq('ativo', true).order('nome')
      const { data: cursores } = await supabase.from('apoio_cursor').select('apoio_id, ultimo_erro, ultima_execucao, updated_at')
      setIndicadores((labs || []).map((l: any) => {
        const erro = (cursores || []).filter((c: any) => c.apoio_id === l.id && c.ultimo_erro)
          .sort((a: any, b: any) => String(b.updated_at).localeCompare(String(a.updated_at)))[0] as any
        return { id: l.id, nome: l.nome, modo: l.modo_contingencia, erroEm: erro ? (erro.updated_at || erro.ultima_execucao) : null }
      }))
    })()
  }, [reload])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Terceirização</h1>
          <p className="text-sm text-muted-foreground">Laboratórios de apoio, catálogo, De/Para, remessas e contingência</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {indicadores.map(i => {
            const cor = i.modo ? 'bg-[hsl(38,92%,50%)]' : i.erroEm ? 'bg-destructive' : 'bg-[hsl(var(--success))]'
            const txt = i.modo ? 'Modo manual' : i.erroEm
              ? `Falha na integração (última: ${new Date(i.erroEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
              : 'Integração OK'
            return (
              <span key={i.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
                <b className="text-foreground">{i.nome}</b>
                <span className="text-muted-foreground">{txt}</span>
              </span>
            )
          })}
        </div>
      </div>

      {!loading && !enabled && <ApoioBloqueadoAviso />}

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {ABAS.map(a => (
          <button
            key={a.key}
            onClick={() => setParams(p => { p.set('aba', a.key); return p }, { replace: true })}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${aba === a.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'laboratorios' ? (
        <ApoioLaboratoriosTab moduloLiberado={enabled} onChanged={() => setReload(r => r + 1)} />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={<Clock className="h-10 w-10" />} title="Disponível em breve" description="Esta aba será liberada nas próximas etapas do módulo." />
        </div>
      )}
    </div>
  )
}
