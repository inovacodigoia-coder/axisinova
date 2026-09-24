import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, BarChart3, ChevronRight, Download, FileText, Lock, RefreshCw, RotateCcw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCompanyContext } from '@/context/CompanyContext'
import { useAuth } from '@/context/AuthContext'
import { useApoioEntitlement, useApoioPermissions } from '@/hooks/useApoio'
import { ApoioBloqueadoAviso } from '@/pages/company/support/SupportOutsourcingPage'
import { STATUS_APOIO } from '@/components/apoio/contingencia/ApoioContingenciaTab'
import { exportarCsv, exportarPdf, type Coluna } from '@/components/apoio/relatorios/exportar'

const db = supabase as any
const brl = (v: any) => v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dt = (v: any) => v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''
const dd = (v: any) => v ? String(v).slice(0, 10).split('-').reverse().join('/') : ''
const num = (v: any) => v == null ? '—' : String(v).replace('.', ',')
const etapa = (s: string) => STATUS_APOIO[s] || s

interface Rel {
  id: string; titulo: string; desc: string; rpc: string; perm?: 'financeiro' | 'admin'; cols: Coluna[]
  cor?: (r: any) => 'vermelho' | 'amarelo' | undefined
}

const RELS: Rel[] = [
  { id: 'atrasos', titulo: 'Exames em atraso', desc: 'Exames com prazo vencido ainda sem resultado', rpc: 'apoio_rel_atrasos',
    cols: [{ key: 'paciente', label: 'Paciente' }, { key: 'pedido', label: 'Pedido' }, { key: 'exame', label: 'Exame' }, { key: 'apoio', label: 'Apoio' },
      { key: 'etapa', label: 'Etapa atual', fmt: etapa }, { key: 'dias_atraso', label: 'Dias de atraso' }, { key: 'responsavel', label: 'Responsável' }],
    cor: r => r.critico ? 'vermelho' : undefined },
  { id: 'pendencias', titulo: 'Pendências técnicas e recoletas', desc: 'Abertas e resolvidas, com tempo até resolver', rpc: 'apoio_rel_pendencias',
    cols: [{ key: 'tipo', label: 'Tipo' }, { key: 'paciente', label: 'Paciente' }, { key: 'pedido', label: 'Pedido' }, { key: 'exame', label: 'Exame' },
      { key: 'apoio', label: 'Apoio' }, { key: 'motivo', label: 'Motivo' }, { key: 'aberta_em', label: 'Aberta em', fmt: dt },
      { key: 'resolvida_em', label: 'Resolvida em', fmt: dt }, { key: 'horas_ate_resolver', label: 'Horas até resolver', fmt: num }, { key: 'situacao', label: 'Situação' }] },
  { id: 'tat', titulo: 'Desempenho do apoio (TAT)', desc: 'Prometido × real em dias úteis. Evidência de monitoramento PALC / ISO 15189', rpc: 'apoio_rel_tat',
    cols: [{ key: 'apoio', label: 'Apoio' }, { key: 'exame', label: 'Exame' }, { key: 'exames', label: 'Nº exames' }, { key: 'prometido_medio', label: 'Prometido (média)', fmt: num },
      { key: 'real_medio', label: 'Real (média)', fmt: num }, { key: 'real_mediana', label: 'Real (mediana)', fmt: num }, { key: 'real_p90', label: 'Real (P90)', fmt: num },
      { key: 'no_prazo_pct', label: '% no prazo', fmt: v => v == null ? '' : `${num(v)}%` }],
    cor: r => r.real_medio != null && r.prometido_medio != null && Number(r.real_medio) > Number(r.prometido_medio) ? 'amarelo' : undefined },
  { id: 'remessas', titulo: 'Remessas', desc: 'Tubos, conferência, temperatura e entrega', rpc: 'apoio_rel_remessas',
    cols: [{ key: 'lote', label: 'Lote' }, { key: 'apoio', label: 'Apoio' }, { key: 'criada_em', label: 'Criada em', fmt: dt }, { key: 'status', label: 'Status' },
      { key: 'tubos', label: 'Tubos' }, { key: 'exames', label: 'Exames' }, { key: 'conferencia', label: 'Conferência' }, { key: 'conferido_por', label: 'Conferido por' },
      { key: 'temperatura', label: 'Temperatura' }, { key: 'entregue_a', label: 'Entregue a' }, { key: 'entregue_em', label: 'Entregue em', fmt: dt }] },
  { id: 'manual', titulo: 'Uso do modo manual', desc: 'Quando foi ligado, quanto tempo ficou e quantos exames passaram', rpc: 'apoio_rel_modo_manual',
    cols: [{ key: 'apoio', label: 'Apoio' }, { key: 'ligado_em', label: 'Ligado em', fmt: dt }, { key: 'desligado_em', label: 'Desligado em', fmt: v => v ? dt(v) : 'Ainda ligado' },
      { key: 'horas', label: 'Horas', fmt: num }, { key: 'ligado_por', label: 'Ligado por' }, { key: 'desligado_por', label: 'Desligado por' }, { key: 'exames_manuais', label: 'Exames manuais' }] },
  { id: 'custo', titulo: 'Custo de apoio', desc: 'Exames × custo previsto por apoio, exame e mês', rpc: 'apoio_rel_custo', perm: 'financeiro',
    cols: [{ key: 'mes', label: 'Mês' }, { key: 'apoio', label: 'Apoio' }, { key: 'exame', label: 'Exame' }, { key: 'exames', label: 'Exames' },
      { key: 'custo_medio', label: 'Custo médio', fmt: brl }, { key: 'custo_total', label: 'Custo total', fmt: brl }, { key: 'ficticio', label: 'Fictício', fmt: v => v ? 'Sim' : '' }],
    cor: r => r.ficticio ? 'amarelo' : undefined },
  { id: 'margem', titulo: 'Margem por exame', desc: 'Custo no apoio × valor cobrado na tabela do convênio', rpc: 'apoio_rel_margem', perm: 'financeiro',
    cols: [{ key: 'exame', label: 'Exame' }, { key: 'apoio', label: 'Apoio' }, { key: 'exames', label: 'Exames' }, { key: 'custo_medio', label: 'Custo médio', fmt: brl },
      { key: 'cobrado_medio', label: 'Cobrado médio', fmt: brl }, { key: 'margem_media', label: 'Margem média', fmt: brl },
      { key: 'margem_pct', label: 'Margem %', fmt: v => v == null ? '' : `${num(v)}%` }, { key: 'sem_preco', label: 'Sem preço na tabela' }],
    cor: r => r.margem_media != null && Number(r.margem_media) < 0 ? 'vermelho' : undefined },
  { id: 'qualificacao', titulo: 'Qualificação dos apoios', desc: 'Licença sanitária e certificações com validade', rpc: 'apoio_rel_qualificacao',
    cols: [{ key: 'apoio', label: 'Apoio' }, { key: 'documento', label: 'Documento' }, { key: 'numero', label: 'Número' }, { key: 'validade', label: 'Validade', fmt: dd },
      { key: 'dias_restantes', label: 'Dias restantes' }, { key: 'situacao', label: 'Situação' }],
    cor: r => r.situacao === 'Vencida' ? 'vermelho' : r.situacao === 'Vencendo' ? 'amarelo' : undefined },
  { id: 'log', titulo: 'Log de integração', desc: 'Chamadas ao apoio (senha sempre mascarada)', rpc: 'apoio_rel_log', perm: 'admin',
    cols: [{ key: 'criado_em', label: 'Data', fmt: dt }, { key: 'apoio', label: 'Apoio' }, { key: 'operacao', label: 'Operação' }, { key: 'http_status', label: 'HTTP' },
      { key: 'duracao_ms', label: 'ms' }, { key: 'erro', label: 'Erro' }],
    cor: r => r.erro || (r.http_status ?? 200) >= 400 ? 'vermelho' : undefined },
]

const hoje = () => new Date().toISOString().slice(0, 10)
const menos = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10)
const COR_LINHA = { vermelho: 'bg-destructive/10', amarelo: 'bg-warning/15' }

export default function ApoioRelatoriosPage() {
  const { user } = useAuth()
  const apoio = useApoioEntitlement()
  const { has } = useApoioPermissions()
  const isAdmin = user?.role === 'company_admin' || user?.role === 'super_admin'
  const { availableOrigins } = useCompanyContext() as any
  const [sp, setSp] = useSearchParams()
  const [ini, setIni] = useState(menos(30))
  const [fim, setFim] = useState(hoje())
  const [apoioId, setApoioId] = useState('todos')
  const [unidade, setUnidade] = useState('todas')
  const [labs, setLabs] = useState<{ id: string; nome: string }[]>([])
  const aba = sp.get('r') ? 'relatorios' : (sp.get('aba') || 'painel')

  useEffect(() => { db.from('apoio_laboratorio').select('id, nome').order('nome').then(({ data }: any) => setLabs(data || [])) }, [])

  const args = useMemo(() => ({ _ini: ini, _fim: fim, _apoio: apoioId === 'todos' ? null : apoioId, _unidade: unidade === 'todas' ? null : unidade }), [ini, fim, apoioId, unidade])
  const filtroTxt = `Período ${dd(ini)} a ${dd(fim)} · Apoio: ${labs.find(l => l.id === apoioId)?.nome || 'Todos'} · Unidade: ${(availableOrigins || []).find((o: any) => o.id === unidade)?.name || 'Todas'}`

  if (!apoio.loading && !apoio.enabled) return <div className="p-6"><ApoioBloqueadoAviso /></div>
  if (!has('apoio.relatorios.ver')) return (
    <div className="flex flex-col items-center gap-2 p-16 text-center text-muted-foreground"><Lock className="h-8 w-8" /><p>Você não tem permissão para ver os relatórios do apoio.</p></div>
  )

  const podeRel = (r: Rel) => !r.perm || (r.perm === 'financeiro' ? has('apoio.financeiro.ver') : isAdmin)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios do Apoio</h1>
        <p className="text-sm text-muted-foreground">Indicadores e relatórios dos exames enviados a laboratórios de apoio.</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div><label className="text-xs text-muted-foreground">De</label><Input type="date" value={ini} onChange={e => setIni(e.target.value)} className="w-40" /></div>
        <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} className="w-40" /></div>
        <div className="w-48"><label className="text-xs text-muted-foreground">Apoio</label>
          <Select value={apoioId} onValueChange={setApoioId}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem>{labs.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-48"><label className="text-xs text-muted-foreground">Unidade</label>
          <Select value={unidade} onValueChange={setUnidade}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas</SelectItem>{(availableOrigins || []).map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select></div>
      </Card>

      <Tabs value={aba} onValueChange={v => setSp(v === 'painel' ? {} : { aba: v })}>
        <TabsList className="bg-muted">
          <TabsTrigger value="painel" className="gap-2"><BarChart3 className="h-4 w-4" /> Painel</TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2"><FileText className="h-4 w-4" /> Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="painel" className="mt-6"><Painel args={args} /></TabsContent>
        <TabsContent value="relatorios" className="mt-6">
          {sp.get('r') && RELS.find(r => r.id === sp.get('r')) ? (
            <Relatorio rel={RELS.find(r => r.id === sp.get('r'))!} args={args} filtroTxt={filtroTxt} permitido={podeRel(RELS.find(r => r.id === sp.get('r'))!)}
              onVoltar={() => setSp({ aba: 'relatorios' })} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {RELS.map((r, i) => {
                const ok = podeRel(r)
                return (
                  <button key={r.id} disabled={!ok} onClick={() => setSp({ r: r.id })}
                    className={`flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm ${ok ? '' : 'opacity-50'}`}>
                    <div>
                      <p className="text-sm font-semibold">{i + 1}. {r.titulo}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                      {!ok && <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />{r.perm === 'admin' ? 'Somente administradores' : 'Requer "Ver custos e margens"'}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Kpi({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{valor}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  )
}

function Painel({ args }: { args: any }) {
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await db.rpc('apoio_rel_painel', args)
    setLoading(false)
    if (error) { toast.error('Não foi possível carregar o painel', { description: error.message }); return }
    setD(data)
  }, [args])
  useEffect(() => { carregar() }, [carregar])
  const c = d?.cards || {}
  const pct = (v: any) => v == null ? '—' : `${num(v)}%`
  const volume = (d?.volume_dia || []).map((x: any) => ({ ...x, dia: dd(x.dia).slice(0, 5) }))
  const eixo = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
  const tip = { contentStyle: { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 } }

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={carregar} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi titulo="Enviados no período" valor={String(c.enviados ?? 0)} />
        <Kpi titulo="Entregues no prazo" valor={pct(c.no_prazo_pct)} />
        <Kpi titulo="TAT médio real × prometido" valor={`${num(c.tat_real)} × ${num(c.tat_prometido)}`} sub="dias úteis" />
        <Kpi titulo="Recoleta" valor={pct(c.recoleta_pct)} />
        <Kpi titulo="Erro de transmissão" valor={pct(c.erro_transmissao_pct)} />
        <Kpi titulo="Exceções abertas hoje" valor={String(c.excecoes_hoje ?? 0)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4"><p className="mb-3 text-sm font-semibold">Volume enviado por dia</p>
          <div className="h-64"><ResponsiveContainer><LineChart data={volume}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="dia" tick={eixo} /><YAxis allowDecimals={false} tick={eixo} /><Tooltip {...tip} /><Line type="monotone" dataKey="enviados" name="Enviados" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-4"><p className="mb-3 text-sm font-semibold">TAT por apoio (dias úteis)</p>
          <div className="h-64"><ResponsiveContainer><BarChart data={d?.tat_apoio || []}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="apoio" tick={eixo} /><YAxis tick={eixo} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="prometido" name="Prometido" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} /><Bar dataKey="real" name="Real" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-4"><p className="mb-3 text-sm font-semibold">Atrasos por exame (top 10)</p>
          <div className="h-64"><ResponsiveContainer><BarChart data={d?.atraso_exame || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} tick={eixo} /><YAxis type="category" dataKey="exame" width={120} tick={eixo} /><Tooltip {...tip} /><Bar dataKey="atrasos" name="Atrasos" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-4"><p className="mb-3 text-sm font-semibold">Motivos de pendência técnica (top 10)</p>
          <div className="h-64"><ResponsiveContainer><BarChart data={d?.motivos_pendencia || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} tick={eixo} /><YAxis type="category" dataKey="motivo" width={120} tick={eixo} /><Tooltip {...tip} /><Bar dataKey="total" name="Pendências" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></Card>
      </div>
    </div>
  )
}

function Relatorio({ rel, args, filtroTxt, permitido, onVoltar }: { rel: Rel; args: any; filtroTxt: string; permitido: boolean; onVoltar: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [operacao, setOperacao] = useState('')
  const [soErros, setSoErros] = useState(false)
  const [detalhe, setDetalhe] = useState<any>(null)
  const carregar = useCallback(async () => {
    if (!permitido) return
    setLoading(true)
    const extra = rel.id === 'log' ? { _operacao: operacao.trim() || null, _so_erros: soErros } : {}
    const { data, error } = await db.rpc(rel.rpc, { ...args, ...extra })
    setLoading(false)
    if (error) { toast.error('Não foi possível carregar o relatório', { description: error.message }); setRows([]); return }
    setRows((data || []).map((r: any) => ({ ...r, __cor: rel.cor?.(r) })))
  }, [rel, args, operacao, soErros, permitido])
  useEffect(() => { carregar() }, [carregar])

  const ficticio = (rel.id === 'custo' || rel.id === 'margem') && rows.some(r => r.ficticio)
  const aviso = ficticio ? 'ATENÇÃO: valores fictícios (tabela de preço fictícia)' : undefined
  const nomeArq = `apoio-${rel.id}-${args._ini}-${args._fim}`

  const reprocessar = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('apoio-resultado', { body: { reprocessar_log_id: id } })
    if (error || !data?.ok) toast.error('Não foi possível reprocessar', { description: data?.motivo || error?.message })
    else { toast.success(`Reprocessado: ${data.novos ?? 0} novo(s), ${data.pendentes ?? 0} pendente(s)`); carregar() }
  }

  if (!permitido) return <div className="flex flex-col items-center gap-2 p-16 text-muted-foreground"><Lock className="h-8 w-8" />Você não tem permissão para este relatório.</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onVoltar}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h2 className="text-lg font-bold">{rel.titulo}</h2><p className="text-xs text-muted-foreground">{rel.desc}</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading} className="gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>
          <Button variant="outline" size="sm" onClick={() => exportarCsv(nomeArq, rel.cols, rows)} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportarPdf(nomeArq, rel.titulo, filtroTxt, rel.cols, rows, aviso)} className="gap-2"><FileText className="h-4 w-4" /> PDF</Button>
        </div>
      </div>
      {ficticio && <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/15 px-4 py-2 text-sm font-semibold text-foreground"><AlertTriangle className="h-4 w-4 text-warning" /> Valores fictícios: há preços de tabela fictícia neste relatório.</div>}
      {rel.id === 'log' && (
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Operação (ex.: enviarPedido)" value={operacao} onChange={e => setOperacao(e.target.value)} className="w-64" />
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={soErros} onCheckedChange={v => setSoErros(!!v)} /> Só erros</label>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground"><tr>{rel.cols.map(c => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}{rel.id === 'log' && <th className="px-3 py-2" />}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-t border-border ${r.__cor ? COR_LINHA[r.__cor as 'vermelho'] : ''}`}>
                {rel.cols.map(c => <td key={c.key} className="px-3 py-2">{c.fmt ? c.fmt(r[c.key], r) : (r[c.key] ?? '')}</td>)}
                {rel.id === 'log' && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDetalhe(r)}>Detalhe</Button>
                    {/result|resultado/i.test(r.operacao || '') && <Button variant="ghost" size="sm" className="gap-1" onClick={() => reprocessar(r.id)}><RotateCcw className="h-3 w-3" /> Reprocessar</Button>}
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={rel.cols.length + 1} className="px-3 py-10 text-center text-muted-foreground">{loading ? 'Carregando…' : 'Nenhum registro no período.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">{rows.length} registro(s) · {filtroTxt}</p>
      <Dialog open={!!detalhe} onOpenChange={o => !o && setDetalhe(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{detalhe?.operacao} · {dt(detalhe?.criado_em)}</DialogTitle></DialogHeader>
          {detalhe?.erro && <Badge variant="destructive" className="w-fit">{detalhe.erro}</Badge>}
          <p className="text-xs font-semibold">Requisição (senha mascarada)</p>
          <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap">{detalhe?.requisicao || '—'}</pre>
          <p className="text-xs font-semibold">Resposta</p>
          <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap">{detalhe?.resposta || '—'}</pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}
