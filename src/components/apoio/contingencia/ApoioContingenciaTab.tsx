import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hand, Zap, Send, Printer, Search, AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useApoioEntitlement, useApoioPermissions } from '@/hooks/useApoio'
import { gerarEpl } from '../remessa/remessaDocs'

export const STATUS_APOIO: Record<string, string> = {
  aguardando_remessa: 'Aguardando remessa', em_remessa: 'Em remessa', transmitido: 'Transmitido', recebido_apoio: 'Recebido pelo apoio',
  em_analise: 'Em análise', pendencia_tecnica: 'Pendência técnica', nova_coleta: 'Nova coleta', liberado_apoio: 'Liberado pelo apoio',
  importado: 'Importado', importado_com_pendencia: 'Importado c/ pendência', liberado_local: 'Liberado', cancelado: 'Cancelado',
  erro_transmissao: 'Erro de transmissão',
}
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
const err = (e: any) => e?.message || String(e)

interface Lab { id: string; nome: string; conector: string; modo_contingencia: boolean; modo_manual_desde: string | null; modo_manual_por: string | null }

export function ApoioContingenciaTab({ moduloLiberado, onChanged }: { moduloLiberado: boolean; onChanged?: () => void }) {
  const { has } = useApoioPermissions()
  const pode = moduloLiberado && has('apoio.manual.operar')
  const [labs, setLabs] = useState<Lab[]>([])
  const [apoioId, setApoioId] = useState('')
  const [porNome, setPorNome] = useState('')
  const [sub, setSub] = useState<'envio' | 'status' | 'resultado'>('envio')
  const [confirmar, setConfirmar] = useState(false)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('apoio_laboratorio').select('id, nome, conector, modo_contingencia, modo_manual_desde, modo_manual_por').eq('ativo', true).order('nome')
    const l = (data as any as Lab[]) || []
    setLabs(l); setApoioId(a => a || l[0]?.id || '')
  }, [])
  useEffect(() => { carregar() }, [carregar])
  const lab = labs.find(l => l.id === apoioId)
  useEffect(() => {
    setPorNome('')
    if (lab?.modo_manual_por) supabase.from('profiles').select('full_name').eq('id', lab.modo_manual_por).maybeSingle().then(({ data }) => setPorNome((data as any)?.full_name || ''))
  }, [lab?.modo_manual_por])

  const alternar = async () => {
    if (!lab) return
    const { error } = await supabase.from('apoio_laboratorio').update({ modo_contingencia: !lab.modo_contingencia }).eq('id', lab.id)
    setConfirmar(false)
    if (error) return toast.error(err(error))
    toast.success(lab.modo_contingencia ? 'Voltou ao modo automático' : 'Modo manual ativado')
    carregar(); onChanged?.()
  }

  if (!labs.length) return <div className="rounded-2xl border border-border bg-card"><EmptyState icon={<Hand className="h-10 w-10" />} title="Nenhum laboratório de apoio ativo" description="Cadastre um apoio na aba Laboratórios." /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center">
        <select className="h-10 rounded-lg border border-input bg-background px-2 text-sm" value={apoioId} onChange={e => setApoioId(e.target.value)}>
          {labs.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        {lab?.modo_contingencia ? (
          <span className="flex items-center gap-2 rounded-full bg-[hsl(38,92%,50%)]/15 px-3 py-1.5 text-sm font-semibold text-[hsl(38,92%,30%)]">
            <Hand className="h-4 w-4" />MODO MANUAL ATIVO{lab.modo_manual_desde && ` desde ${fmt(lab.modo_manual_desde)}`}{porNome && ` por ${porNome}`}
          </span>
        ) : (
          <span className="flex items-center gap-2 rounded-full bg-[hsl(var(--success))]/15 px-3 py-1.5 text-sm font-semibold text-[hsl(var(--success))]"><Zap className="h-4 w-4" />Integração automática ativa</span>
        )}
        <Button variant="outline" className="md:ml-auto" disabled={!moduloLiberado || !has('apoio.laboratorio.gerenciar') && !has('apoio.manual.operar')} onClick={() => setConfirmar(true)}>
          {lab?.modo_contingencia ? 'Voltar ao automático' : 'Ativar modo manual'}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([['envio', 'Envio manual'], ['status', 'Status manual'], ['resultado', 'Resultado manual']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} className={`px-4 py-2 text-sm font-medium border-b-2 ${sub === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{l}</button>
        ))}
      </div>

      {lab && sub === 'envio' && <EnvioManual lab={lab} pode={pode} />}
      {lab && sub === 'status' && <StatusManual lab={lab} pode={pode} />}
      {lab && sub === 'resultado' && <ResultadoManual lab={lab} />}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lab?.modo_contingencia ? 'Voltar ao modo automático?' : 'Ativar modo manual?'}</AlertDialogTitle>
            <AlertDialogDescription>{lab?.modo_contingencia
              ? 'Os próximos envios e resultados voltam a passar pela integração.'
              : 'Os envios e resultados deste apoio passam a ser feitos pelo portal e registrados aqui. A mudança fica na auditoria.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={alternar}>Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ---------- 1. Envio manual ---------- */
interface PedidoEnvio { pedido_id: string; order_number: string; paciente: string; tubo: string; exames: { id: string; nome: string; material: string; status: string }[] }

function EnvioManual({ lab, pode }: { lab: Lab; pode: boolean }) {
  const { companyId } = useApoioEntitlement()
  const pardini = /pardini/i.test(`${lab.conector} ${lab.nome}`)
  const [remessas, setRemessas] = useState<any[]>([])
  const [dados, setDados] = useState<Record<string, PedidoEnvio[]>>({})
  const [valores, setValores] = useState<Record<string, { cod: string; bar: string }>>({})
  const [salvando, setSalvando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data: rs } = await supabase.from('apoio_remessa').select('id, cod_lote_lab, status, temperatura, created_at').eq('apoio_id', lab.id).in('status', ['aberta', 'conferida', 'erro']).order('cod_lote_lab')
    const { data: pes } = await supabase.from('apoio_pedido_exame').select('id, remessa_id, pedido_id, exame_id, status, codigo_apoio, exams(name), attendance_orders(order_number, patient_name)')
      .eq('apoio_id', lab.id).in('status', ['em_remessa', 'erro_transmissao']).not('remessa_id', 'is', null)
    const map: Record<string, PedidoEnvio[]> = {}
    for (const p of ((pes as any) || [])) {
      const lista = (map[p.remessa_id] ||= [])
      let ped = lista.find(x => x.pedido_id === p.pedido_id)
      if (!ped) {
        const { data: tubo } = await supabase.rpc('apoio_codigo_aliquota' as any, { _pedido: p.pedido_id, _apoio: lab.id })
        ped = { pedido_id: p.pedido_id, order_number: p.attendance_orders?.order_number, paciente: p.attendance_orders?.patient_name || '', tubo: (tubo as any) || '', exames: [] }
        lista.push(ped)
      }
      const { data: mat } = await supabase.rpc('apoio_item_material' as any, { _pedido: p.pedido_id, _exame: p.exame_id })
      ped.exames.push({ id: p.id, nome: p.exams?.name || p.codigo_apoio, material: (mat as any) || '', status: p.status })
    }
    const idsComErro = new Set(((pes as any) || []).filter((p: any) => p.status === 'erro_transmissao').map((p: any) => p.remessa_id))
    const extra = idsComErro.size ? (await supabase.from('apoio_remessa').select('id, cod_lote_lab, status, temperatura, created_at').in("id", [...idsComErro] as string[])).data || [] : []
    const todas = [...(rs || []), ...extra.filter((e: any) => !(rs || []).some((r: any) => r.id === e.id))]
    setRemessas(todas); setDados(map)
  }, [lab.id])
  useEffect(() => { carregar() }, [carregar])

  const valido = (cod: string) => pardini ? /^[A-Z0-9]{7}$/.test(cod.toUpperCase()) : cod.trim().length > 0 && cod.length <= 40
  const confirmar = async (rid: string) => {
    const peds = dados[rid] || []
    for (const p of peds) {
      const cod = (valores[p.pedido_id]?.cod || '').trim()
      if (!cod) return toast.error(`Informe o nº do pedido no apoio (pedido ${p.order_number})`)
      if (!valido(cod)) return toast.error(`Nº inválido no pedido ${p.order_number}${pardini ? ': use 7 letras/números' : ''}`)
    }
    setSalvando(rid)
    const itens = peds.map(p => ({ pedido_id: p.pedido_id, cod_ped_apoio: valores[p.pedido_id].cod.trim().toUpperCase(), cod_bar_apoio: valores[p.pedido_id]?.bar?.trim() || null }))
    const { data, error } = await supabase.rpc('apoio_envio_manual' as any, { _remessa: rid, _itens: itens })
    setSalvando(null)
    if (error) return toast.error(err(error))
    toast.success(`Envio manual confirmado: ${data} exame(s) transmitido(s)`); carregar()
  }
  const etiquetaInterna = async (p: PedidoEnvio, e: PedidoEnvio['exames'][number]) => {
    const conteudo = gerarEpl(p.tubo, p.paciente, `${valores[p.pedido_id]?.cod || p.order_number} ${e.nome} ${e.material}`)
    const { error } = await supabase.from('apoio_impressao_fila' as any).insert({ empresa_id: companyId, tipo: 'etiqueta_epl', conteudo, referencia: `interna:${p.tubo}` })
    if (error) return toast.error(err(error))
    toast.success('Etiqueta interna enviada para a fila de impressão')
  }

  if (!remessas.length) return <div className="rounded-2xl border border-border bg-card"><EmptyState icon={<Send className="h-10 w-10" />} title="Nada para enviar" description="Não há remessas abertas/conferidas nem exames com erro de transmissão para este apoio." /></div>
  return (
    <div className="space-y-4">
      {remessas.map(r => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Remessa nº {r.cod_lote_lab} <span className="text-xs font-normal text-muted-foreground">· {r.status}</span></h3>
            <Button size="sm" className="gap-2" disabled={!pode || salvando === r.id || !(dados[r.id] || []).length} onClick={() => confirmar(r.id)}>
              {salvando === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Confirmar envio manual</Button>
          </div>
          {(dados[r.id] || []).map(p => {
            const v = valores[p.pedido_id] || { cod: '', bar: '' }
            const inval = v.cod && !valido(v.cod)
            return (
              <div key={p.pedido_id} className="border-t border-border py-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[200px] flex-1"><p className="text-sm font-medium">{p.paciente}</p><p className="text-xs text-muted-foreground">Pedido {p.order_number} · Tubo {p.tubo}</p></div>
                  <label className="text-xs">Nº do pedido no apoio*
                    <Input value={v.cod} maxLength={pardini ? 7 : 40} onChange={e => setValores(s => ({ ...s, [p.pedido_id]: { ...v, cod: e.target.value.toUpperCase() } }))} className={`h-9 w-40 font-mono ${inval ? 'border-destructive' : ''}`} placeholder={pardini ? '7 caracteres' : ''} />
                    {inval && <span className="text-destructive">{pardini ? '7 letras/números' : 'Inválido'}</span>}
                  </label>
                  <label className="text-xs">Código de barras do tubo (opcional)
                    <Input value={v.bar} onChange={e => setValores(s => ({ ...s, [p.pedido_id]: { ...v, bar: e.target.value } }))} className="h-9 w-48 font-mono" />
                  </label>
                </div>
                <div className="mt-2 space-y-1">
                  {p.exames.map(e => (
                    <div key={e.id} className="flex items-center gap-2 text-sm">
                      <span>{e.nome}</span><span className="text-xs text-muted-foreground">{e.material}</span>
                      {e.status === 'erro_transmissao' && <span className="rounded-full bg-destructive/15 px-2 text-xs text-destructive">Erro de transmissão</span>}
                      <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1" disabled={!pode} onClick={() => etiquetaInterna(p, e)}><Printer className="h-3.5 w-3.5" />Imprimir etiqueta interna</Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ---------- 2. Status manual ---------- */
function StatusManual({ lab, pode }: { lab: Lab; pode: boolean }) {
  const [q, setQ] = useState('')
  const [itens, setItens] = useState<any[]>([])
  const [sel, setSel] = useState<string[]>([])
  const [modal, setModal] = useState<{ ids: string[]; status: string } | null>(null)
  const [motivo, setMotivo] = useState(''); const [pend, setPend] = useState({ pendencia: '', detalhamento: '', disposicao: '' })
  const [salvando, setSalvando] = useState(false)

  const buscar = useCallback(async () => {
    const { data, error } = await supabase.rpc('apoio_manual_buscar' as any, { _apoio: lab.id, _q: q })
    if (error) return toast.error(err(error))
    setItens((data as any) || []); setSel([])
  }, [lab.id, q])
  useEffect(() => { buscar() }, [lab.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const selecionados = itens.filter(i => sel.includes(i.id))
  const mesmaRemessa = selecionados.length > 0 && selecionados.every(i => i.remessa_id && i.remessa_id === selecionados[0].remessa_id && i.proximos?.includes('recebido_apoio'))
  const comPend = modal && ['pendencia_tecnica', 'nova_coleta'].includes(modal.status)

  const salvar = async () => {
    if (!modal) return
    if (!motivo.trim()) return toast.error('Informe o motivo')
    if (comPend && !pend.pendencia.trim()) return toast.error('Informe a pendência')
    setSalvando(true)
    for (const id of modal.ids) {
      const { error } = await supabase.rpc('apoio_manual_mudar_status' as any, {
        _pe: id, _status: modal.status, _motivo: motivo,
        _pendencia: comPend ? pend.pendencia : null, _detalhamento: comPend ? pend.detalhamento : null, _disposicao: comPend ? pend.disposicao : null,
      })
      if (error) { setSalvando(false); return toast.error(err(error)) }
    }
    setSalvando(false); toast.success('Status atualizado'); setModal(null); setMotivo(''); setPend({ pendencia: '', detalhamento: '', disposicao: '' }); buscar()
  }

  return (
    <div className="space-y-3">
      <form onSubmit={e => { e.preventDefault(); buscar() }} className="flex gap-2">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Paciente, pedido, código do apoio ou código de barras" className="h-10 max-w-lg" />
        <Button type="submit" variant="outline" className="gap-2"><Search className="h-4 w-4" />Buscar</Button>
        <Button type="button" className="ml-auto" disabled={!pode || !mesmaRemessa} onClick={() => { setMotivo('Recebido pelo apoio (confirmado no portal)'); setModal({ ids: sel, status: 'recebido_apoio' }) }}>Marcar como recebidos pelo apoio</Button>
      </form>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{['', 'Paciente', 'Pedido', 'Exame', 'Nº apoio', 'Remessa', 'Status atual', 'Próximos status'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>{itens.map(i => (
            <tr key={i.id} className="border-t border-border align-top">
              <td className="px-3 py-2"><Checkbox checked={sel.includes(i.id)} onCheckedChange={v => setSel(s => v ? [...s, i.id] : s.filter(x => x !== i.id))} /></td>
              <td className="px-3 py-2">{i.paciente}</td><td className="px-3 py-2">{i.order_number}</td>
              <td className="px-3 py-2">{i.exame} <span className="text-xs text-muted-foreground">{i.codigo_apoio}</span></td>
              <td className="px-3 py-2 font-mono text-xs">{i.cod_ped_apoio || '—'}</td>
              <td className="px-3 py-2">{i.cod_lote_lab || '—'}</td>
              <td className="px-3 py-2 font-medium">{STATUS_APOIO[i.status] || i.status}</td>
              <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{(i.proximos || []).map((s: string) => (
                <Button key={s} size="sm" variant="outline" className="h-7 text-xs" disabled={!pode} onClick={() => { setMotivo(''); setModal({ ids: [i.id], status: s }) }}>{STATUS_APOIO[s] || s}</Button>
              ))}</div></td>
            </tr>))}</tbody>
        </table>
        {!itens.length && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum exame encontrado.</p>}
      </div>

      <Dialog open={!!modal} onOpenChange={o => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mudar para "{modal && (STATUS_APOIO[modal.status] || modal.status)}"{modal && modal.ids.length > 1 ? ` (${modal.ids.length} exames)` : ''}</DialogTitle></DialogHeader>
          <label className="text-sm">Motivo*<Textarea value={motivo} onChange={e => setMotivo(e.target.value)} /></label>
          {comPend && <>
            <label className="text-sm">Pendência*<Input value={pend.pendencia} onChange={e => setPend(p => ({ ...p, pendencia: e.target.value }))} /></label>
            <label className="text-sm">Detalhamento<Textarea value={pend.detalhamento} onChange={e => setPend(p => ({ ...p, detalhamento: e.target.value }))} /></label>
            <label className="text-sm">Disposição<Input value={pend.disposicao} onChange={e => setPend(p => ({ ...p, disposicao: e.target.value }))} /></label>
          </>}
          <DialogFooter><Button disabled={salvando || !motivo.trim()} onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------- 3. Resultado manual (atalho) ---------- */
function ResultadoManual({ lab }: { lab: Lab }) {
  const navigate = useNavigate()
  const [itens, setItens] = useState<any[]>([])
  useEffect(() => {
    supabase.from('apoio_pedido_exame').select('id, status, codigo_apoio, exams(name), attendance_orders(order_number, patient_name)')
      .eq('apoio_id', lab.id).in('status', ['transmitido', 'recebido_apoio', 'em_analise', 'liberado_apoio']).order('updated_at', { ascending: false }).limit(300)
      .then(({ data }) => setItens((data as any) || []))
  }, [lab.id])
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p>O resultado manual é digitado na <b>Digitação de Resultados</b>. Clique num exame para abrir já filtrado no pedido. Exames que exigem PDF (anatomia, citologia) só aceitam resultado com o PDF do portal anexado.</p>
          <p><b>Dupla conferência:</b> outro usuário, diferente de quem digitou, precisa conferir contra o PDF/portal antes de liberar (status Validação).</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border-2 border-[hsl(38,92%,50%)]/40 bg-[hsl(38,92%,50%)]/10 p-3 text-sm text-[hsl(38,92%,28%)]">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p><b>Volta ao automático:</b> se depois chegar pela integração o resultado de um exame digitado à mão, o sistema compara os dois. Iguais → a versão manual fica confirmada. Diferentes → versão divergente, alerta vermelho no Kanban e liberação bloqueada até alguém decidir.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card">
        {itens.map(i => (
          <button key={i.id} onClick={() => navigate(`/app/lab/analise?pedido=${encodeURIComponent(i.attendance_orders?.order_number || '')}`)} className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left text-sm last:border-0 hover:bg-muted/30">
            <span className="flex-1">{i.attendance_orders?.patient_name} <span className="text-muted-foreground">· Pedido {i.attendance_orders?.order_number}</span></span>
            <span>{i.exams?.name || i.codigo_apoio}</span>
            <span className="w-40 text-right text-xs text-muted-foreground">{STATUS_APOIO[i.status]}</span>
          </button>
        ))}
        {!itens.length && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum exame deste apoio aguardando resultado.</p>}
      </div>
    </div>
  )
}
