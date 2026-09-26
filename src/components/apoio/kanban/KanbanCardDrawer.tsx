import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Eye, Hand, Loader2, MessageSquare, Printer, RefreshCw, RotateCcw, Send, UserPlus, XCircle, CheckCircle2, ArrowRightLeft, Phone, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApoioPermissions } from '@/hooks/useApoio'
import { useApoioCancelamento } from '@/components/apoio/useApoioCancelamento'
import { STATUS_APOIO } from '@/components/apoio/contingencia/ApoioContingenciaTab'
import { gerarEpl } from '@/components/apoio/remessa/remessaDocs'
import { type KCard, corPrazo, fmtData, fmtDataHora } from './kanbanShared'

const err = (e: any) => e?.message || String(e)
const ORIGEM: Record<string, string> = { sistema: 'Sistema', integracao: 'Integração', manual: 'Manual' }
const CONTATO: Record<string, string> = { avisado: 'Avisado', nao_atendeu: 'Não atendeu', numero_errado: 'Número errado' }

export function KanbanCardDrawer({ card, companyId, usuarios, onClose, onChanged, onMudarStatus }: {
  card: KCard | null; companyId: string; usuarios: { id: string; nome: string }[]
  onClose: () => void; onChanged: () => void; onMudarStatus: (c: KCard, status: string) => void
}) {
  const navigate = useNavigate()
  const { has } = useApoioPermissions()
  const { cancelarNoApoio, dialog } = useApoioCancelamento()
  const [hist, setHist] = useState<any[]>([])
  const [pend, setPend] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [acoes, setAcoes] = useState<any[]>([])
  const [info, setInfo] = useState<any>({})
  const [proximos, setProximos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [comentario, setComentario] = useState('')
  const [feito, setFeito] = useState<{ id: string; obs: string } | null>(null)
  const [recoleta, setRecoleta] = useState<{ motivo: string; data: string; avisar: boolean } | null>(null)
  const [contato, setContato] = useState<{ id: string; resultado: string; obs: string } | null>(null)
  const [cancelar, setCancelar] = useState<string | null>(null)
  const nome = (id?: string | null) => usuarios.find(u => u.id === id)?.nome || (id ? 'Usuário' : '—')

  const carregar = useCallback(async () => {
    if (!card) return
    setLoading(true)
    const [h, p, d, a, pe, px] = await Promise.all([
      supabase.from('apoio_pedido_exame_historico').select('*').eq('pedido_exame_id', card.id).order('created_at'),
      supabase.from('apoio_pendencia_tecnica').select('*').eq('pedido_exame_id', card.id).order('created_at'),
      supabase.from('apoio_documento').select('*').eq('pedido_exame_id', card.id).order('created_at'),
      supabase.from('apoio_acao_pendente' as any).select('*').eq('pedido_exame_id', card.id).order('created_at'),
      supabase.from('apoio_pedido_exame').select('info_complementar').eq('id', card.id).maybeSingle(),
      supabase.rpc('apoio_proximos_status', { _de: card.status as any }),
    ])
    setHist(h.data || []); setPend(p.data || []); setDocs(d.data || []); setAcoes((a.data as any) || [])
    setInfo((pe.data as any)?.info_complementar || {}); setProximos(((px.data as any) || []).filter((s: string) => s !== card.status))
    setLoading(false)
  }, [card])
  useEffect(() => { carregar() }, [carregar])

  if (!card) return null
  const prazo = corPrazo(card)
  const podeManual = has('apoio.manual.operar')
  const refresh = () => { carregar(); onChanged() }

  const rpc = async (fn: string, args: any, ok: string) => {
    const { error } = await supabase.rpc(fn as any, args)
    if (error) { toast.error(err(error)); return false }
    toast.success(ok); refresh(); return true
  }
  const abrirDoc = async (path: string, baixar: boolean) => {
    const { data, error } = await supabase.storage.from('apoio-documentos').createSignedUrl(path, 300, baixar ? { download: true } : undefined)
    if (error || !data) return toast.error('Não foi possível abrir o documento')
    window.open(data.signedUrl, '_blank')
  }
  const imprimir = async () => {
    const cod = card.cod_barras?.[card.cod_barras.length - 1] || card.cod_barras?.[0] || card.pedido_numero || ''
    const { error } = await supabase.from('apoio_impressao_fila' as any).insert({ empresa_id: companyId, tipo: 'etiqueta_epl', referencia: `kanban:${card.id}`,
      conteudo: gerarEpl(cod, card.paciente_nome || '', `${card.cod_ped_apoio || card.pedido_numero || ''} ${card.exame_nome || ''}`) })
    if (error) return toast.error(err(error))
    toast.success('Etiqueta enviada para a fila de impressão')
  }
  const confirmarCancelar = async () => {
    const motivo = cancelar?.trim()
    if (!motivo) return toast.error('Informe o motivo')
    setCancelar(null)
    await cancelarNoApoio(card.pedido_id, card.exame_id, motivo)
    refresh()
  }

  return (
    <>
      <Sheet open={!!card} onOpenChange={o => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-left">{card.paciente_nome}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 text-left">
              <Badge variant="outline">{STATUS_APOIO[card.status] || card.status}</Badge>
              {prazo.texto && <Badge variant="outline" className={prazo.cls}>{prazo.texto}</Badge>}
              <Badge variant="secondary">{card.apoio_manual ? 'Modo manual' : 'Automático'}</Badge>
            </div>
          </SheetHeader>

          {card.acao_pendente_id && (() => {
            const a = acoes.find(x => x.id === card.acao_pendente_id)
            const aviso = a?.tipo === 'avisar_paciente'
            const d = a?.dados || {}
            const podeAvisar = podeManual || has('apoio.remessa.operar')
            return (
            <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Hand className="h-4 w-4" />Ação manual pendente</p>
              <p className="mt-1">{aviso ? a.descricao : card.acao_pendente}</p>
              {aviso && <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div><dt className="text-muted-foreground">Paciente</dt><dd className="font-medium">{d.nome || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Telefone</dt><dd className="font-medium">{d.telefone || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Celular</dt><dd className="font-medium">{d.celular || '—'}</dd></div>
                <div><dt className="text-muted-foreground">E-mail</dt><dd className="font-medium break-all">{d.email || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Tentativas</dt><dd className="font-medium">{a.tentativas || 0}</dd></div>
                {a.proxima_tentativa && <div><dt className="text-muted-foreground">Tentar de novo em</dt><dd className="font-medium">{fmtDataHora(a.proxima_tentativa)}</dd></div>}
              </dl>}
              {aviso && (d.contatos || []).length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{d.contatos.map((c: any, i: number) =>
                <li key={i}>{fmtDataHora(c.em)} · {nome(c.por)} · {CONTATO[c.resultado] || c.resultado}{c.observacao ? ` — ${c.observacao}` : ''}</li>)}</ul>}
              {aviso ? podeAvisar && <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setContato({ id: a.id, resultado: 'avisado', obs: '' })}><Phone className="mr-1 h-4 w-4" />Liguei / avisei</Button>
                <Button size="sm" variant="outline" onClick={() => rpc('apoio_acao_adiar', { _id: a.id }, 'Reagendado para amanhã')}><Clock className="mr-1 h-4 w-4" />Tentar de novo depois</Button>
              </div>
                : podeManual && <Button size="sm" className="mt-2" onClick={() => setFeito({ id: card.acao_pendente_id!, obs: '' })}><CheckCircle2 className="mr-1 h-4 w-4" />Marcar como feito</Button>}
            </div>)
          })()}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['Pedido', card.pedido_numero || card.pedido_protocolo], ['Exame', `${card.exame_nome || ''}${card.exame_codigo ? ` (${card.exame_codigo})` : ''}`],
              ['Apoio', card.apoio_nome], ['Código no apoio', card.codigo_apoio], ['Nº do pedido no apoio', card.cod_ped_apoio],
              ['Código de barras', (card.cod_barras || []).join(' · ')], ['Prazo previsto', fmtData(card.prazo_previsto)],
              ['Responsável', card.responsavel_nome || '—'], ['Status no apoio', [card.status_apoio_cod, card.status_apoio_desc].filter(Boolean).join(' — ')],
            ].map(([k, v]) => <div key={k as string}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v || '—'}</dd></div>)}
            <div><dt className="text-xs text-muted-foreground">Remessa</dt><dd>{card.remessa_id
              ? <button className="font-medium text-primary underline" onClick={() => navigate(`/app/apoio/terceirizacao?aba=remessas&remessa=${card.remessa_id}`)}>Nº {card.cod_lote_lab}</button> : '—'}</dd></div>
          </dl>

          <h4 className="mt-6 text-sm font-semibold">Ações</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <Select value={card.responsavel_id || 'none'} onValueChange={v => rpc('apoio_kanban_atribuir', { _pe: card.id, _usuario: v === 'none' ? null : v }, 'Responsável atualizado')}>
              <SelectTrigger className="h-9 w-52"><UserPlus className="mr-1 h-4 w-4" /><SelectValue placeholder="Atribuir responsável" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Sem responsável</SelectItem>{usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
            </Select>
            {['pendencia_tecnica', 'transmitido', 'recebido_apoio', 'em_analise', 'aguardando_remessa', 'em_remessa', 'erro_transmissao'].includes(card.status) &&
              <Button size="sm" variant="outline" onClick={() => setRecoleta({ motivo: pend.find(p => !p.resolvida_em)?.pendencia || '', data: new Date().toISOString().slice(0, 10), avisar: true })}><RotateCcw className="mr-1 h-4 w-4" />Abrir recoleta</Button>}
            {!['cancelado', 'liberado_apoio', 'importado', 'importado_com_pendencia', 'liberado_local'].includes(card.status) &&
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelar('')}><XCircle className="mr-1 h-4 w-4" />Cancelar</Button>}
            {card.status === 'erro_transmissao' && has('apoio.remessa.operar') &&
              <Button size="sm" variant="outline" onClick={() => rpc('apoio_mudar_status', { p_pedido_exame_id: card.id, p_status_novo: 'em_remessa', p_origem: 'sistema', p_motivo: 'Reenvio pelo Kanban' }, 'Exame devolvido à remessa para reenvio')}><Send className="mr-1 h-4 w-4" />Reenviar</Button>}
            {['liberado_apoio', 'importado', 'importado_com_pendencia', 'recebido_apoio', 'em_analise', 'transmitido'].includes(card.status) &&
              <Button size="sm" variant="outline" onClick={() => navigate(`/app/lab/analise?pedido=${encodeURIComponent(card.pedido_numero || card.pedido_protocolo || '')}`)}><Eye className="mr-1 h-4 w-4" />Ir para conferência</Button>}
            <Button size="sm" variant="outline" onClick={imprimir}><Printer className="mr-1 h-4 w-4" />Imprimir etiqueta de novo</Button>
          </div>
          {card.apoio_manual && podeManual && proximos.length > 0 && (
            <div className="mt-3 rounded-xl border border-border p-3">
              <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><ArrowRightLeft className="h-3 w-3" />Mudar status manualmente (apoio em modo manual)</p>
              <div className="flex flex-wrap gap-2">{proximos.map(s => <Button key={s} size="sm" variant="secondary" onClick={() => onMudarStatus(card, s)}>{STATUS_APOIO[s] || s}</Button>)}</div>
            </div>
          )}

          <h4 className="mt-6 flex items-center gap-2 text-sm font-semibold">Linha do tempo {loading && <Loader2 className="h-3 w-3 animate-spin" />}</h4>
          <ol className="mt-2 space-y-3 border-l border-border pl-4">
            {hist.map(h => (
              <li key={h.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="font-medium">{STATUS_APOIO[h.status_para] || h.status_para}{h.status_de ? <span className="font-normal text-muted-foreground"> (de {STATUS_APOIO[h.status_de] || h.status_de})</span> : null}</p>
                <p className="text-xs text-muted-foreground">{fmtDataHora(h.created_at)} · {ORIGEM[h.origem] || h.origem} · {nome(h.usuario_id)}</p>
                {h.motivo && <p className="text-xs">Motivo: {h.motivo}</p>}
                {(h.dados?.status_apoio_cod || h.dados?.status_apoio_desc) && <p className="text-xs text-muted-foreground">Status do apoio: {h.dados.status_apoio_cod} {h.dados.status_apoio_desc}</p>}
              </li>
            ))}
            {!hist.length && <li className="text-sm text-muted-foreground">Sem histórico.</li>}
          </ol>

          {acoes.length > 0 && <>
            <h4 className="mt-6 text-sm font-semibold">Ações manuais</h4>
            <ul className="mt-2 space-y-2 text-sm">{acoes.map(a => (
              <li key={a.id} className="rounded-lg border border-border p-2">
                <p>{a.descricao}</p>
                <p className="text-xs text-muted-foreground">{a.concluida_em ? `Feito em ${fmtDataHora(a.concluida_em)} por ${nome(a.concluida_por)} — ${a.observacao}` : `Pendente desde ${fmtDataHora(a.created_at)}`}</p>
              </li>))}</ul>
          </>}

          <h4 className="mt-6 text-sm font-semibold">Pendências técnicas</h4>
          <ul className="mt-2 space-y-2 text-sm">
            {pend.map(p => (
              <li key={p.id} className="rounded-lg border border-border p-2">
                <p className="font-medium">{p.pendencia}</p>
                {p.detalhamento && <p className="text-xs">{p.detalhamento}</p>}
                {p.disposicao && <p className="text-xs text-muted-foreground">Disposição: {p.disposicao}</p>}
                <p className="text-xs text-muted-foreground">{p.resolvida_em ? `Resolvida em ${fmtDataHora(p.resolvida_em)}${p.resolucao ? ` — ${p.resolucao}` : ''}` : 'Em aberto'}</p>
              </li>))}
            {!pend.length && <li className="text-muted-foreground">Nenhuma.</li>}
          </ul>

          <h4 className="mt-6 text-sm font-semibold">Documentos</h4>
          <ul className="mt-2 space-y-2 text-sm">
            {docs.map(d => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-border p-2">
                <span>{d.tipo} · {fmtDataHora(d.created_at)}</span>
                <span className="flex gap-1">
                  <Button size="icon" variant="ghost" aria-label="Visualizar" onClick={() => abrirDoc(d.storage_path, false)}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Baixar" onClick={() => abrirDoc(d.storage_path, true)}><Download className="h-4 w-4" /></Button>
                </span>
              </li>))}
            {!docs.length && <li className="text-muted-foreground">Nenhum PDF.</li>}
          </ul>

          <h4 className="mt-6 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" />Comentários</h4>
          <ul className="mt-2 space-y-2 text-sm">{(info.comentarios || []).map((c: any, i: number) => (
            <li key={i} className="rounded-lg bg-muted p-2"><p>{c.texto}</p><p className="text-xs text-muted-foreground">{c.por_nome || nome(c.por)} · {fmtDataHora(c.em)}</p></li>))}</ul>
          <div className="mt-2 flex gap-2">
            <Input value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Adicionar comentário" />
            <Button size="sm" disabled={!comentario.trim()} onClick={async () => { if (await rpc('apoio_kanban_comentar', { _pe: card.id, _texto: comentario }, 'Comentário adicionado')) setComentario('') }}>Enviar</Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-4" onClick={refresh}><RefreshCw className="mr-1 h-4 w-4" />Atualizar</Button>
        </SheetContent>
      </Sheet>

      <Dialog open={!!feito} onOpenChange={o => !o && setFeito(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar ação como feita</DialogTitle></DialogHeader>
          <Label>Observação*</Label>
          <Textarea value={feito?.obs || ''} onChange={e => setFeito(f => f && { ...f, obs: e.target.value })} placeholder="Ex.: cancelado no portal às 10h por Fulano" />
          <DialogFooter><Button variant="outline" onClick={() => setFeito(null)}>Voltar</Button>
            <Button disabled={!feito?.obs.trim()} onClick={async () => { if (feito && await rpc('apoio_acao_concluir', { _id: feito.id, _observacao: feito.obs }, 'Ação concluída')) setFeito(null) }}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recoleta} onOpenChange={o => !o && setRecoleta(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir recoleta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Motivo*</Label><Textarea value={recoleta?.motivo || ''} onChange={e => setRecoleta(r => r && { ...r, motivo: e.target.value })} /></div>
            <div><Label>Nova data de coleta*</Label><Input type="date" value={recoleta?.data || ''} onChange={e => setRecoleta(r => r && { ...r, data: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!recoleta?.avisar} onCheckedChange={v => setRecoleta(r => r && { ...r, avisar: !!v })} />Avisar paciente (“Recoleta necessária (exame de apoio)”)</label>
            <p className="text-xs text-muted-foreground">O exame atual vai para “Nova coleta” e um novo exame entra em “Aguardando remessa”, ligado a este.</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setRecoleta(null)}>Voltar</Button>
            <Button disabled={!recoleta?.motivo.trim() || !recoleta?.data} onClick={async () => {
              if (recoleta && await rpc('apoio_recoleta', { _pe: card.id, _motivo: recoleta.motivo, _nova_data: recoleta.data, _avisar: recoleta.avisar }, 'Recoleta aberta')) setRecoleta(null)
            }}>Confirmar recoleta</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelar !== null} onOpenChange={o => !o && setCancelar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar exame no apoio</DialogTitle></DialogHeader>
          <Label>Motivo*</Label><Textarea value={cancelar || ''} onChange={e => setCancelar(e.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setCancelar(null)}>Voltar</Button><Button variant="destructive" disabled={!cancelar?.trim()} onClick={confirmarCancelar}>Cancelar exame</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  )
}
