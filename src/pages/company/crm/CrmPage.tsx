import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Flame, KanbanSquare, List, Loader2, MoreVertical, Plus, Search, Settings, Snowflake, ThermometerSun } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useCrmAcesso, useCrmSinais } from '@/hooks/useCrm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ORIGENS, TEMPERATURAS, diasDesde, fmtDataHora, iniciais, moeda, origemLabel, tempInfo, textoDias, vencido,
  type CrmEtapa, type CrmLead, type CrmMotivo, type CrmTag, type CrmUsuario } from '@/lib/crm'
import { LeadFormDialog, selCls } from '@/components/crm/LeadFormDialog'
import { LeadDrawer } from '@/components/crm/LeadDrawer'
import { MotivoPerdaDialog } from '@/components/crm/MotivoPerdaDialog'
import { CrmConfigDialog } from '@/components/crm/CrmConfigDialog'
import { CrmResults } from '@/components/crm/CrmResults'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const TempIcon = ({ t, className }: { t: string; className?: string }) => {
  const I = t === 'frio' ? Snowflake : t === 'quente' ? Flame : ThermometerSun
  return <I className={cn('h-4 w-4', tempInfo(t).cls, className)} aria-label={tempInfo(t).label} />
}

export default function CrmPage() {
  const acesso = useCrmAcesso()
  const [params, setParams] = useSearchParams()
  const [leads, setLeads] = useState<CrmLead[] | null>(null)
  const [resumo, setResumo] = useState({ abertos: 0, criados_30d: 0, convertidos_30d: 0, retornos_hoje: 0 })
  const [usuarios, setUsuarios] = useState<CrmUsuario[]>([])
  const [etapas, setEtapas] = useState<CrmEtapa[]>([])
  const [tags, setTags] = useState<CrmTag[]>([])
  const [motivos, setMotivos] = useState<CrmMotivo[]>([])
  const [modo, setModo] = useState<'kanban' | 'lista'>('kanban')
  const [fl, setFl] = useState({ meus: false, retornos: false, resp: '', temp: '', tag: '', origem: '', desde: '', ate: '', q: '' })
  const [novo, setNovo] = useState(false)
  const [config, setConfig] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [perda, setPerda] = useState<{ lead: string; etapa: string } | null>(null)
  const [ord, setOrd] = useState<{ k: keyof CrmLead; asc: boolean }>({ k: 'etapa_atualizada_em', asc: false })

  const carregar = useCallback(async () => {
    const [q, e, t, m] = await Promise.all([
      supabase.rpc('crm_quadro' as any),
      supabase.from('crm_etapas' as any).select('*').order('ordem'),
      supabase.from('crm_tags' as any).select('*').order('nome'),
      supabase.from('crm_motivos_perda' as any).select('*').order('nome'),
    ])
    if (q.error) { toast.error('Não foi possível carregar o CRM.'); setLeads([]); return }
    const d = q.data as any
    setLeads(d.leads ?? []); setResumo(d.resumo); setUsuarios(d.usuarios ?? [])
    setEtapas((e.data ?? []) as any); setTags((t.data ?? []) as any); setMotivos((m.data ?? []) as any)
  }, [])
  useEffect(() => { if (acesso?.ver) void carregar() }, [acesso?.ver, carregar])
  useCrmSinais(!!acesso?.ver, carregar)
  useEffect(() => { const l = params.get('lead'); if (l) { setSelId(l); params.delete('lead'); setParams(params, { replace: true }) } }, [params, setParams])

  const filtrados = useMemo(() => (leads ?? []).filter(l => {
    if (fl.retornos && (l.fechado_em || !l.proximo_contato_em || new Date(l.proximo_contato_em).toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }) > new Date().toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }))) return false
    if (fl.meus && l.responsavel_id !== acesso?.usuario_id) return false
    if (fl.resp && l.responsavel_id !== fl.resp) return false
    if (fl.temp && l.temperatura !== fl.temp) return false
    if (fl.tag && !l.tags.includes(fl.tag)) return false
    if (fl.origem && l.origem !== fl.origem) return false
    if (fl.desde && l.criado_em.slice(0, 10) < fl.desde) return false
    if (fl.ate && l.criado_em.slice(0, 10) > fl.ate) return false
    if (fl.q) {
      const q = fl.q.toLowerCase(); const d = fl.q.replace(/\D/g, '')
      if (!l.nome.toLowerCase().includes(q) && !(d.length >= 4 && l.telefone.includes(d))) return false
    }
    return true
  }), [leads, fl, acesso?.usuario_id])

  if (acesso === null) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!acesso.ver) return <Navigate to="/app" replace />

  const colunas = etapas.filter(e => e.ativa).sort((a, b) => a.ordem - b.ordem)
  const tagMap = Object.fromEntries(tags.map(t => [t.id, t]))
  const sel = leads?.find(l => l.id === selId) ?? null

  const mover = async (leadId: string, etapaId: string) => {
    const l = leads?.find(x => x.id === leadId); const e = etapas.find(x => x.id === etapaId)
    if (!l || !e || l.etapa_id === etapaId) return
    if (!l.pode_editar) { toast.error('Apenas o responsável ou o gestor do CRM pode mover este lead.'); return }
    if (e.tipo === 'perdido') { setPerda({ lead: leadId, etapa: etapaId }); return }
    const { error } = await supabase.rpc('crm_lead_mover' as any, { p_lead: leadId, p_etapa: etapaId })
    if (error) { toast.error(error.message); return }
    toast.success(`Movido para ${e.nome}.`); void carregar()
  }

  const Cartao = ({ l }: { l: CrmLead }) => {
    const lt = l.tags.map(id => tagMap[id]).filter(Boolean)
    return (
      <div draggable={l.pode_editar} onDragStart={() => setArrastando(l.id)} onDragEnd={() => setArrastando(null)} onClick={() => setSelId(l.id)}
        className={cn('cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition hover:border-primary/40', arrastando === l.id && 'opacity-50')}>
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{l.nome}</p>
          {l.nao_lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" title="Mensagem não lida" />}
          <TempIcon t={l.temperatura} />
          {l.temperatura_origem === 'automatica' && <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground" title={l.temperatura_regra ?? 'Temperatura automática'}>auto</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <button className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted md:hidden" aria-label="Mover para"><MoreVertical className="h-4 w-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onClick={e => e.stopPropagation()}>
              <DropdownMenuLabel>Mover para...</DropdownMenuLabel>
              {colunas.filter(c => c.id !== l.etapa_id).map(c => <DropdownMenuItem key={c.id} disabled={!l.pode_editar} onClick={() => void mover(l.id, c.id)}>{c.nome}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {l.interesse && <p className="truncate text-xs text-muted-foreground">{l.interesse}</p>}
        {lt.length > 0 && <div className="mt-2 flex flex-wrap gap-1">
          {lt.slice(0, 3).map(t => <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px] text-primary-foreground" style={{ background: t.cor }}>{t.nome}</span>)}
          {lt.length > 3 && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">+{lt.length - 3}</span>}
        </div>}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          {l.responsavel_nome && <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-bg text-[10px] font-semibold text-primary-foreground" title={l.responsavel_nome}>{iniciais(l.responsavel_nome)}</span>}
          <span className="flex-1">{textoDias(diasDesde(l.etapa_atualizada_em))}</span>
          {l.valor_estimado != null && <span className="font-medium text-foreground">{moeda(Number(l.valor_estimado))}</span>}
        </div>
        {l.proximo_contato_em && <p className={cn('mt-1 flex items-center gap-1 text-[11px]', vencido(l.proximo_contato_em) ? 'text-destructive font-medium' : 'text-muted-foreground')}>
          <CalendarClock className="h-3 w-3" />{fmtDataHora(l.proximo_contato_em)}</p>}
      </div>
    )
  }

  const ordenados = [...filtrados].sort((a, b) => {
    const x = a[ord.k] ?? '', y = b[ord.k] ?? ''
    return (x < y ? -1 : x > y ? 1 : 0) * (ord.asc ? 1 : -1)
  })
  const Th = ({ k, children }: { k: keyof CrmLead; children: React.ReactNode }) => (
    <th className="cursor-pointer px-3 py-2 text-left font-medium" onClick={() => setOrd({ k, asc: ord.k === k ? !ord.asc : true })}>{children}{ord.k === k ? (ord.asc ? ' ↑' : ' ↓') : ''}</th>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">Funil de leads ligado às conversas do WhatsApp</p>
        </div>
        <div className="flex rounded-md border border-border">
          <Button variant={modo === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setModo('kanban')}><KanbanSquare className="mr-1 h-4 w-4" />Kanban</Button>
          <Button variant={modo === 'lista' ? 'secondary' : 'ghost'} size="sm" onClick={() => setModo('lista')}><List className="mr-1 h-4 w-4" />Lista</Button>
        </div>
        {acesso.gerenciar && <Button variant="outline" size="icon" onClick={() => setConfig(true)} aria-label="Configurar CRM"><Settings className="h-4 w-4" /></Button>}
        {acesso.criar && <Button onClick={() => setNovo(true)} className="gradient-bg text-primary-foreground"><Plus className="mr-1 h-4 w-4" />Novo lead</Button>}
      </div>

      <Tabs defaultValue="quadro"><TabsList><TabsTrigger value="quadro">Quadro</TabsTrigger><TabsTrigger value="resultados">Resultados</TabsTrigger></TabsList>
      <TabsContent value="resultados"><CrmResults usuarios={usuarios} revision={leads} /></TabsContent>
      <TabsContent value="quadro" className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[['Leads abertos', resumo.abertos], ['Criados (30 dias)', resumo.criados_30d], ['Viraram paciente (30 dias)', resumo.convertidos_30d]].map(([r, v]) => (
          <div key={r as string} className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{r}</p><p className="text-xl font-bold text-foreground">{v}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou telefone" value={fl.q} onChange={e => setFl({ ...fl, q: e.target.value })} /></div>
        <Button variant={fl.meus ? 'secondary' : 'outline'} size="sm" className="h-10" onClick={() => setFl({ ...fl, meus: !fl.meus })}>Meus leads</Button>
        <Button variant={fl.retornos ? 'secondary' : 'outline'} size="sm" className="h-10" onClick={() => setFl({ ...fl, retornos: !fl.retornos })}><CalendarClock className="mr-1 h-4 w-4" />Retorno vencido ou hoje · {resumo.retornos_hoje ?? 0}</Button>
        <select className={cn(selCls, 'w-auto')} value={fl.resp} onChange={e => setFl({ ...fl, resp: e.target.value })}><option value="">Responsável</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
        <select className={cn(selCls, 'w-auto')} value={fl.temp} onChange={e => setFl({ ...fl, temp: e.target.value })}><option value="">Temperatura</option>{TEMPERATURAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        <select className={cn(selCls, 'w-auto')} value={fl.tag} onChange={e => setFl({ ...fl, tag: e.target.value })}><option value="">Tag</option>{tags.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
        <select className={cn(selCls, 'w-auto')} value={fl.origem} onChange={e => setFl({ ...fl, origem: e.target.value })}><option value="">Origem</option>{ORIGENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <Input type="date" className="w-auto" value={fl.desde} onChange={e => setFl({ ...fl, desde: e.target.value })} aria-label="Criados desde" />
        <Input type="date" className="w-auto" value={fl.ate} onChange={e => setFl({ ...fl, ate: e.target.value })} aria-label="Criados até" />
      </div>

      {leads === null ? (
        <div className="flex gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-72" />)}</div>
      ) : modo === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {colunas.map(c => {
            const itens = filtrados.filter(l => l.etapa_id === c.id)
            const soma = itens.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0)
            return (
              <div key={c.id} onDragOver={e => e.preventDefault()} onDrop={() => { if (arrastando) void mover(arrastando, c.id); setArrastando(null) }}
                className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 p-2">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="h-3 w-3 rounded-full" style={{ background: c.cor }} />
                  <span className="flex-1 truncate text-sm font-semibold text-foreground">{c.nome}</span>
                  <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{itens.length}</span>
                </div>
                {soma > 0 && <p className="mb-2 px-1 text-xs text-muted-foreground">{moeda(soma)}</p>}
                <div className="flex min-h-[80px] flex-col gap-2">{itens.map(l => <Cartao key={l.id} l={l} />)}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
              <Th k="nome">Nome</Th><Th k="etapa_id">Etapa</Th><Th k="temperatura">Temperatura</Th><Th k="responsavel_nome">Responsável</Th>
              <Th k="origem">Origem</Th><Th k="valor_estimado">Valor</Th><Th k="proximo_contato_em">Próximo contato</Th><Th k="criado_em">Criado em</Th>
            </tr></thead>
            <tbody>{ordenados.map(l => (
              <tr key={l.id} className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => setSelId(l.id)}>
                <td className="px-3 py-2 font-medium text-foreground">{l.nome}{l.nao_lida && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />}</td>
                <td className="px-3 py-2">{etapas.find(e => e.id === l.etapa_id)?.nome}</td>
                <td className="px-3 py-2"><span className="flex items-center gap-1"><TempIcon t={l.temperatura} />{tempInfo(l.temperatura).label}</span></td>
                <td className="px-3 py-2">{l.responsavel_nome ?? '—'}</td>
                <td className="px-3 py-2">{origemLabel(l.origem)}</td>
                <td className="px-3 py-2">{l.valor_estimado != null ? moeda(Number(l.valor_estimado)) : '—'}</td>
                <td className={cn('px-3 py-2', vencido(l.proximo_contato_em) && 'text-destructive')}>{fmtDataHora(l.proximo_contato_em) || '—'}</td>
                <td className="px-3 py-2">{fmtDataHora(l.criado_em)}</td>
              </tr>
            ))}
            {ordenados.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhum lead.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      </TabsContent></Tabs>
      <LeadFormDialog open={novo} onClose={() => setNovo(false)} usuarios={usuarios} euId={acesso.usuario_id}
        onCriado={id => { setNovo(false); void carregar().then(() => setSelId(id)) }} />
      <LeadDrawer lead={sel} etapas={etapas} tags={tags} motivos={motivos} usuarios={usuarios} podeGerenciar={acesso.gerenciar}
        onClose={() => setSelId(null)} onMudou={() => void carregar()} />
      <MotivoPerdaDialog open={!!perda} motivos={motivos} onClose={() => setPerda(null)} onConfirmar={async (m, t) => {
        if (!perda) return
        const { error } = await supabase.rpc('crm_lead_mover' as any, { p_lead: perda.lead, p_etapa: perda.etapa, p_motivo: m, p_motivo_texto: t })
        if (error) { toast.error(error.message); return }
        toast.success('Lead marcado como perdido.'); setPerda(null); void carregar()
      }} />
      {acesso.gerenciar && <CrmConfigDialog open={config} onClose={() => setConfig(false)} etapas={etapas} tags={tags} motivos={motivos} leads={leads ?? []} onMudou={() => void carregar()} />}
    </div>
  )
}
