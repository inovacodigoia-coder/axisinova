import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ExternalLink, Loader2, RotateCcw, Search, Trash2, UserPlus, XCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { ORIGENS, TEMPERATURAS, fmtDataHora, isoParaLocal, localParaIso, tempInfo, type CrmEtapa, type CrmLead, type CrmMotivo, type CrmTag, type CrmUsuario } from '@/lib/crm'
import { selCls } from './LeadFormDialog'
import { MotivoPerdaDialog } from './MotivoPerdaDialog'

interface Props {
  lead: CrmLead | null; etapas: CrmEtapa[]; tags: CrmTag[]; motivos: CrmMotivo[]; usuarios: CrmUsuario[]
  podeGerenciar: boolean; onClose: () => void; onMudou: () => void
}

const ROTULO: Record<string, string> = { criado: 'Lead criado', etapa: 'Etapa', temperatura: 'Temperatura', tag: 'Tag', responsavel: 'Responsável', nota: 'Nota', conversao: 'Convertido em paciente', proximo_contato: 'Próximo contato', edicao: 'Edição' }

export function LeadDrawer({ lead, etapas, tags, motivos, usuarios, podeGerenciar, onClose, onMudou }: Props) {
  return (
    <Sheet open={!!lead} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {lead && <Corpo key={lead.id} {...{ lead, etapas, tags, motivos, usuarios, podeGerenciar, onClose, onMudou }} />}
      </SheetContent>
    </Sheet>
  )
}

function Corpo({ lead, etapas, tags, motivos, usuarios, podeGerenciar, onClose, onMudou }: Props & { lead: CrmLead }) {
  const navigate = useNavigate()
  const ed = lead.pode_editar
  const etapa = etapas.find(e => e.id === lead.etapa_id)
  const [f, setF] = useState({ nome: lead.nome, interesse: lead.interesse ?? '', origem: lead.origem, valor: lead.valor_estimado?.toString() ?? '',
    responsavel: lead.responsavel_id ?? '', temperatura: lead.temperatura, proximo: isoParaLocal(lead.proximo_contato_em), tags: lead.tags })
  const [salvando, setSalvando] = useState(false)
  const [perda, setPerda] = useState(false)
  const [excluir, setExcluir] = useState(false)
  const [hist, setHist] = useState<any[] | null>(null)
  const [nota, setNota] = useState('')
  const [conv, setConv] = useState<{ status: string; conversa_id?: string } | null>(null)
  const [msgs, setMsgs] = useState<any[]>([])
  const [busca, setBusca] = useState(''); const [pacs, setPacs] = useState<any[]>([])

  const carregarHist = useCallback(async () => {
    const { data } = await supabase.rpc('crm_lead_historico' as any, { p_lead: lead.id }); setHist((data as any[]) ?? [])
  }, [lead.id])
  useEffect(() => { void carregarHist() }, [carregarHist, lead])

  const rpc = async (fn: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await supabase.rpc(fn as any, args as any)
    if (error) { toast.error(error.message || 'Não foi possível concluir.'); return false }
    toast.success(ok); onMudou(); void carregarHist(); return true
  }

  const salvar = async () => {
    setSalvando(true)
    await rpc('crm_lead_editar', { p_lead: lead.id, p: { nome: f.nome, interesse: f.interesse, origem: f.origem, valor_estimado: f.valor ? Number(f.valor.replace(',', '.')) : null,
      responsavel_id: f.responsavel || null, temperatura: f.temperatura, proximo_contato_em: localParaIso(f.proximo), tags: f.tags } }, 'Lead atualizado.')
    setSalvando(false)
  }
  const mover = (id: string) => {
    const e = etapas.find(x => x.id === id)
    if (e?.tipo === 'perdido') { setPerda(true); return }
    void rpc('crm_lead_mover', { p_lead: lead.id, p_etapa: id }, `Movido para ${e?.nome}.`)
  }
  const perdido = etapas.find(e => e.tipo === 'perdido' && e.ativa)

  const abrirConversa = async () => {
    if (conv) return
    const { data, error } = await supabase.rpc('crm_lead_conversa' as any, { p_lead: lead.id })
    if (error) { setConv({ status: 'sem_acesso' }); return }
    const r = data as any; setConv(r)
    if (r?.status === 'ok') {
      const { data: m } = await supabase.from('whatsapp_mensagens').select('id, direcao, origem, tipo, texto, criado_em, enviada_por_nome').eq('conversa_id', r.conversa_id).order('criado_em', { ascending: false }).limit(100)
      setMsgs(((m ?? []) as any[]).reverse())
    }
  }

  useEffect(() => {
    if (busca.trim().length < 3) { setPacs([]); return }
    const t = setTimeout(() => { void supabase.rpc('crm_buscar_paciente' as any, { p_q: busca }).then(({ data }) => setPacs((data as any[]) ?? [])) }, 300)
    return () => clearTimeout(t)
  }, [busca])

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {lead.nome}
          {etapa && <span className="rounded-full px-2 py-0.5 text-xs text-primary-foreground" style={{ background: etapa.cor }}>{etapa.nome}</span>}
        </SheetTitle>
        {!ed && <p className="text-xs text-muted-foreground">Somente leitura: apenas o responsável ou o gestor do CRM edita este lead.</p>}
      </SheetHeader>
      <Tabs defaultValue="resumo" className="mt-4" onValueChange={v => { if (v === 'conversa') void abrirConversa() }}>
        <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="resumo">Resumo</TabsTrigger><TabsTrigger value="conversa">Conversa</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>

        <TabsContent value="resumo" className="space-y-4">
          <fieldset disabled={!ed} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1"><Label>Nome</Label><Input value={f.nome} maxLength={120} onChange={e => setF({ ...f, nome: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Interesse</Label><Input value={f.interesse} maxLength={120} onChange={e => setF({ ...f, interesse: e.target.value })} /></div>
            <div className="space-y-1"><Label>Origem</Label><select className={selCls} value={f.origem} onChange={e => setF({ ...f, origem: e.target.value })}>{ORIGENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="space-y-1"><Label>Temperatura</Label><select className={selCls} value={f.temperatura} onChange={e => setF({ ...f, temperatura: e.target.value as any })}>{TEMPERATURAS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div className="space-y-1"><Label>Responsável</Label><select className={selCls} value={f.responsavel} onChange={e => setF({ ...f, responsavel: e.target.value })}><option value="">Sem responsável</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
            <div className="space-y-1"><Label>Valor estimado (R$)</Label><Input inputMode="decimal" value={f.valor} onChange={e => setF({ ...f, valor: e.target.value.replace(/[^\d,.]/g, '') })} /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Próximo contato</Label><Input type="datetime-local" value={f.proximo} onChange={e => setF({ ...f, proximo: e.target.value })} /></div>
            <div className="sm:col-span-2 space-y-1"><Label>Tags</Label>
              <div className="flex flex-wrap gap-2">{tags.filter(t => t.ativa || f.tags.includes(t.id)).map(t => {
                const on = f.tags.includes(t.id)
                return <button key={t.id} type="button" onClick={() => setF({ ...f, tags: on ? f.tags.filter(x => x !== t.id) : [...f.tags, t.id] })}
                  className={cn('min-h-[36px] rounded-full border px-3 text-xs', on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: t.cor }} />{t.nome}</button>
              })}</div></div>
          </fieldset>
          {lead.motivo_perda_id && <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">Motivo da perda: {motivos.find(m => m.id === lead.motivo_perda_id)?.nome}{lead.motivo_perda_texto ? ` — ${lead.motivo_perda_texto}` : ''}</p>}
          {ed && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void salvar()} disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              {!lead.fechado_em && (
                <select className={cn(selCls, 'w-auto')} value="" onChange={e => e.target.value && mover(e.target.value)}>
                  <option value="">Mover etapa…</option>{etapas.filter(e => e.ativa && e.id !== lead.etapa_id).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              )}
              {!lead.fechado_em && perdido && <Button variant="outline" onClick={() => setPerda(true)}><XCircle className="mr-1 h-4 w-4" />Marcar como perdido</Button>}
              {lead.fechado_em && <Button variant="outline" onClick={() => void rpc('crm_lead_reabrir', { p_lead: lead.id }, 'Lead reaberto.')}><RotateCcw className="mr-1 h-4 w-4" />Reabrir</Button>}
              {podeGerenciar && <Button variant="ghost" className="text-destructive" onClick={() => setExcluir(true)}><Trash2 className="mr-1 h-4 w-4" />Excluir lead</Button>}
            </div>
          )}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paciente</p>
            {lead.paciente_id ? <p className="text-sm text-foreground">Vinculado a um cadastro de paciente.</p> : ed ? (
              <>
                <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Vincular a paciente existente (nome ou CPF)" value={busca} onChange={e => setBusca(e.target.value)} /></div>
                {pacs.map(p => (
                  <button key={p.id} className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => void rpc('crm_lead_vincular_paciente', { p_lead: lead.id, p_paciente: p.id }, 'Lead convertido em paciente.')}>
                    <span>{p.nome}</span><span className="text-xs text-muted-foreground">CPF final {p.cpf_final || '—'}</span>
                  </button>
                ))}
                <Button variant="outline" size="sm" onClick={() => navigate('/app/recepcao/cadastro-direto')}><UserPlus className="mr-1 h-4 w-4" />Cadastrar paciente</Button>
                <p className="text-[11px] text-muted-foreground">Depois de cadastrar, volte aqui e vincule o paciente.</p>
              </>
            ) : <p className="text-sm text-muted-foreground">Ainda não é paciente.</p>}
          </div>
        </TabsContent>

        <TabsContent value="conversa" className="space-y-3">
          {!conv ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            : conv.status === 'sem_conversa' ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
            : conv.status === 'sem_acesso' ? <p className="py-6 text-center text-sm text-muted-foreground">Sem acesso a esta conversa.</p>
            : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(`/app/inovachat?c=${conv.conversa_id}`)}><ExternalLink className="mr-1 h-4 w-4" />Abrir no InovaChat</Button>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-3">
                  {msgs.length === 0 && <p className="text-center text-xs text-muted-foreground">Sem mensagens.</p>}
                  {msgs.map(m => (
                    <div key={m.id} className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm', m.direcao === 'saida' ? 'ml-auto bg-primary/15' : 'bg-card border border-border')}>
                      <p className="whitespace-pre-wrap break-words text-foreground">{m.texto || `[${m.tipo}]`}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{m.enviada_por_nome ? `${m.enviada_por_nome} · ` : ''}{fmtDataHora(m.criado_em)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-3">
          {ed && (
            <div className="space-y-2">
              <Textarea placeholder="Nota interna (não vai para o paciente)" value={nota} maxLength={1000} onChange={e => setNota(e.target.value)} />
              <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{nota.length}/1000</span>
                <Button size="sm" disabled={!nota.trim()} onClick={async () => { if (await rpc('crm_lead_nota', { p_lead: lead.id, p_texto: nota }, 'Nota adicionada.')) setNota('') }}>Adicionar nota</Button></div>
            </div>
          )}
          {hist === null ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /> : (
            <ol className="space-y-2 border-l border-border pl-4">
              {hist.map(e => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full gradient-bg" />
                  <p className="text-sm text-foreground"><strong>{ROTULO[e.tipo] ?? e.tipo}</strong>
                    {e.tipo === 'temperatura' ? `: ${tempInfo(e.de).label} → ${tempInfo(e.para).label}`
                      : e.tipo === 'tag' ? (e.para ? `: adicionada ${e.para}` : `: removida ${e.de}`)
                      : e.de || e.para ? `: ${e.de ?? '—'} → ${e.para ?? '—'}` : ''}</p>
                  {e.texto && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{e.texto}</p>}
                  <p className="text-[11px] text-muted-foreground">{e.usuario ?? 'Sistema'} · {fmtDataHora(e.criado_em)}</p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>

      <MotivoPerdaDialog open={perda} motivos={motivos} onClose={() => setPerda(false)} onConfirmar={async (m, t) => {
        if (perdido && await rpc('crm_lead_mover', { p_lead: lead.id, p_etapa: perdido.id, p_motivo: m, p_motivo_texto: t }, 'Lead marcado como perdido.')) setPerda(false)
      }} />
      <AlertDialog open={excluir} onOpenChange={setExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir este lead?</AlertDialogTitle>
            <AlertDialogDescription>O lead, suas notas e o histórico serão apagados. A conversa no InovaChat não muda.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (await rpc('crm_lead_excluir', { p_lead: lead.id }, 'Lead excluído.')) onClose() }}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
