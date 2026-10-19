// Etapa 11B — aba Satisfação (NPS). Leitura protegida por RLS (empresa + permissão); sem telefone.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, MessageCircle } from 'lucide-react'
import { calcularNps } from '@/lib/whatsappModelo'

interface Resp {
  id: string; paciente_nome: string | null; medico_id: string | null; medico_nome: string | null; tipo_atendimento: string | null
  nota: number; categoria: 'promotor' | 'neutro' | 'detrator'; comentario: string | null; respondida_em: string
}
type Periodo = '30' | '90' | '365' | 'custom'
const dia = (d: Date) => d.toISOString().slice(0, 10)
const COR: Record<Resp['categoria'], string> = { promotor: 'bg-success text-success-foreground', neutro: 'bg-warning text-warning-foreground', detrator: 'bg-destructive text-destructive-foreground' }

export function SatisfacaoTab({ companyId }: { companyId: string }) {
  const nav = useNavigate()
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [ini, setIni] = useState(dia(new Date(Date.now() - 30 * 864e5))); const [fim, setFim] = useState(dia(new Date()))
  const [medico, setMedico] = useState(''); const [tipo, setTipo] = useState('')
  const [dados, setDados] = useState<Resp[] | null>(null); const [enviadas, setEnviadas] = useState<number | null>(null)
  const [chat, setChat] = useState(false)

  const faixa = useMemo(() => {
    if (periodo === 'custom') return { de: new Date(`${ini}T00:00:00-03:00`).toISOString(), ate: new Date(`${fim}T23:59:59-03:00`).toISOString() }
    return { de: new Date(Date.now() - Number(periodo) * 864e5).toISOString(), ate: new Date().toISOString() }
  }, [periodo, ini, fim])

  const load = useCallback(async () => {
    setDados(null)
    const [{ data }, { count }, { data: c }] = await Promise.all([
      supabase.from('whatsapp_nps_respostas' as any).select('id, paciente_nome, medico_id, medico_nome, tipo_atendimento, nota, categoria, comentario, respondida_em')
        .eq('company_id', companyId).gte('respondida_em', faixa.de).lte('respondida_em', faixa.ate).order('respondida_em', { ascending: false }).limit(1000),
      supabase.from('whatsapp_fila_envios_v' as any).select('id', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('tipo', 'ciclo_nps').in('status', ['enviada', 'entregue', 'lida']).gte('enviada_em', faixa.de).lte('enviada_em', faixa.ate),
      supabase.from('companies').select('inovachat_habilitado').eq('id', companyId).maybeSingle(),
    ])
    setDados(((data ?? []) as unknown) as Resp[]); setEnviadas(count ?? null); setChat(!!(c as any)?.inovachat_habilitado)
  }, [companyId, faixa])
  useEffect(() => { void load() }, [load])

  const medicos = useMemo(() => [...new Map((dados ?? []).filter(r => r.medico_id).map(r => [r.medico_id!, r.medico_nome ?? 'Médico'])).entries()], [dados])
  const lista = useMemo(() => (dados ?? []).filter(r => (!medico || r.medico_id === medico) && (!tipo || r.tipo_atendimento === tipo)), [dados, medico, tipo])
  const nps = calcularNps(lista.map(r => r.nota))
  const cont = { promotor: 0, neutro: 0, detrator: 0 }
  lista.forEach(r => { cont[r.categoria]++ })
  const pct = (n: number) => lista.length ? Math.round((n / lista.length) * 100) : 0
  const filtrado = !!medico || !!tipo
  const taxa = !filtrado && enviadas ? Math.round((lista.length / enviadas) * 100) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 365 dias</option><option value="custom">Personalizado</option>
        </select>
        {periodo === 'custom' && <>
          <Input type="date" value={ini} onChange={e => setIni(e.target.value)} className="h-10 w-40" />
          <Input type="date" value={fim} onChange={e => setFim(e.target.value)} className="h-10 w-40" />
        </>}
        <select value={medico} onChange={e => setMedico(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os médicos</option>{medicos.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Todos os tipos</option>{['Consulta', 'Retorno', 'Exame', 'Procedimento'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {!dados ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">NPS</p><p className="text-3xl font-bold text-foreground">{nps ?? '—'}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Respostas</p><p className="text-3xl font-bold text-foreground">{lista.length}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Taxa de resposta</p><p className="text-3xl font-bold text-foreground">{taxa === null ? '—' : `${taxa}%`}</p>
            <p className="text-[11px] text-muted-foreground">{filtrado ? 'Sem filtros de médico/tipo' : `${enviadas ?? 0} pesquisas enviadas`}</p></div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Distribuição</p>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted">
              <div className="bg-success" style={{ width: `${pct(cont.promotor)}%` }} />
              <div className="bg-warning" style={{ width: `${pct(cont.neutro)}%` }} />
              <div className="bg-destructive" style={{ width: `${pct(cont.detrator)}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Promotores {pct(cont.promotor)}% · Neutros {pct(cont.neutro)}% · Detratores {pct(cont.detrator)}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-foreground">Respostas recentes</p>
          {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma resposta no período.</p>}
          {lista.slice(0, 100).map(r => (
            <div key={r.id} className={`flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start sm:justify-between ${r.categoria === 'detrator' ? 'border-destructive/50' : 'border-border'}`}>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">{r.paciente_nome ?? 'Paciente'}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.respondida_em).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' })}{r.medico_nome ? ` · ${r.medico_nome}` : ''}{r.tipo_atendimento ? ` · ${r.tipo_atendimento}` : ''}</p>
                {r.comentario && <p className="whitespace-pre-wrap rounded-lg bg-muted p-2 text-sm text-foreground">{r.comentario}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${COR[r.categoria]}`}>{r.nota}</span>
                {chat && <Button variant="outline" size="sm" className="h-9" onClick={() => nav(`/app/inovachat?nps=${r.id}`)}><MessageCircle className="mr-1 h-4 w-4" />Abrir conversa</Button>}
              </div>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}
