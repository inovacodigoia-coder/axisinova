import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EmptyState } from '@/components/feedback/EmptyState'
import { supabase } from '@/integrations/supabase/client'
import { useApoioEntitlement, APOIO_BLOQUEADO_MSG } from '@/hooks/useApoio'
import { ApoioLaboratoriosTab } from '@/components/apoio/ApoioLaboratoriosTab'
import { ApoioExamesTab } from '@/components/apoio/depara/ApoioExamesTab'
import { ApoioContingenciaTab } from '@/components/apoio/contingencia/ApoioContingenciaTab'
import { ApoioRemessasTab } from '@/components/apoio/remessa/ApoioRemessasTab'

const ABAS = [
  { key: 'exames', label: 'Exames terceirizados' },
  { key: 'remessas', label: 'Remessas' },
  { key: 'contingencia', label: 'Contingência' },
  { key: 'laboratorios', label: 'Laboratórios' },
] as const
type Aba = typeof ABAS[number]['key']

const ROTINAS: Record<string, string> = { transmissao: 'transmissão', resultado: 'resultados', rastreabilidade: 'rastreabilidade', pendencia: 'pendências', catalogo: 'catálogo', modelos: 'modelos', recebimento: 'recebimento', pdf: 'PDFs', cancelamento: 'cancelamento', conexao: 'conexão' }
function traduzErro(m: string): string {
  if (!m) return 'Sem detalhes.'
  if (/^Remessa /.test(m)) return m
  if (/10023/.test(m)) return 'Número de lote já usado no Pardini.'
  if (/10217/.test(m)) return 'Código de pedido já usado no Pardini.'
  if (/FL-POL|UNDEFINED/.test(m)) return 'Erro interno do Pardini ao responder a consulta. Tente mais tarde.'
  if (/timeout|tempo/i.test(m)) return 'O Pardini não respondeu a tempo.'
  if (/401|senha|login|autentica/i.test(m)) return 'Usuário ou senha do Pardini recusados.'
  return m.replace(/<[^>]+>/g, ' ').slice(0, 300)
}
interface Indicador { id: string; nome: string; modo: boolean; erroEm: string | null; erroMsg: string | null; rotina: string | null }

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
  const aba = (ABAS.some(a => a.key === params.get('aba')) ? params.get('aba') : 'exames') as Aba
  const { enabled, loading } = useApoioEntitlement()
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [reload, setReload] = useState(0)

  useEffect(() => {
    (async () => {
      const { data: labs } = await supabase.from('apoio_laboratorio').select('id, nome, modo_contingencia').eq('ativo', true).order('nome')
      const { data: cursores } = await supabase.from('apoio_cursor').select('apoio_id, rotina, ultimo_erro, ultimo_erro_em, ultimo_sucesso, ultima_execucao, updated_at, resolvido_em')
      setIndicadores((labs || []).map((l: any) => {
        // Vermelho só quando o último erro é mais recente que o último sucesso da mesma rotina
        const erro = (cursores || []).filter((c: any) => c.apoio_id === l.id && c.ultimo_erro && (!c.ultimo_sucesso || String(c.ultimo_erro_em || c.updated_at) > String(c.ultimo_sucesso)) && (!c.resolvido_em || String(c.ultimo_erro_em || c.updated_at) > String(c.resolvido_em)))
          .sort((a: any, b: any) => String(b.updated_at).localeCompare(String(a.updated_at)))[0] as any
        return { id: l.id, nome: l.nome, modo: l.modo_contingencia, erroEm: erro ? (erro.ultimo_erro_em || erro.updated_at) : null, erroMsg: erro?.ultimo_erro ?? null, rotina: erro?.rotina ?? null }
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
              <Popover key={i.id}>
                <PopoverTrigger asChild>
                  <button type="button" title={i.erroMsg ? traduzErro(i.erroMsg) : undefined} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
                    <b className="text-foreground">{i.nome}</b>
                    <span className="text-muted-foreground">{txt}</span>
                  </button>
                </PopoverTrigger>
                {i.erroEm && !i.modo && (
                  <PopoverContent className="w-80 space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Causa ({ROTINAS[i.rotina || ''] || i.rotina})</p>
                    <p className="text-muted-foreground">{traduzErro(i.erroMsg || '')}</p>
                    <p className="text-muted-foreground">Em {new Date(i.erroEm).toLocaleString('pt-BR')}</p>
                    <Button size="sm" variant="outline" className="w-full" onClick={async () => {
                      const { error } = await supabase.rpc('apoio_cursor_resolver' as any, { _apoio: i.id })
                      if (error) return toast.error(error.message)
                      toast.success('Marcado como resolvido'); setReload(x => x + 1)
                    }}>Marcar como resolvido</Button>
                  </PopoverContent>
                )}
              </Popover>
            )
          })}
        </div>
      </div>

      {!loading && !enabled && <ApoioBloqueadoAviso />}

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {ABAS.map(a => (
          <button
            key={a.key}
            onClick={() => setParams(() => { const p = new URLSearchParams(); p.set('aba', a.key); return p }, { replace: true })}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${aba === a.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'laboratorios' ? (
        <ApoioLaboratoriosTab moduloLiberado={enabled} onChanged={() => setReload(r => r + 1)} />
      ) : aba === 'exames' ? (
        <ApoioExamesTab moduloLiberado={enabled} />
      ) : aba === 'contingencia' ? (
        <ApoioContingenciaTab moduloLiberado={enabled} onChanged={() => setReload(r => r + 1)} />
      ) : aba === 'remessas' ? (
        <ApoioRemessasTab moduloLiberado={enabled} />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState icon={<Clock className="h-10 w-10" />} title="Disponível em breve" description="Esta aba será liberada nas próximas etapas do módulo." />
        </div>
      )}
    </div>
  )
}
