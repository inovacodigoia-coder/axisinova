import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Truck, Printer, Download, ScanLine, X, CheckCircle2, AlertTriangle, Send, PackageCheck, Ban, FileText, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useApoioEntitlement, useApoioPermissions } from '@/hooks/useApoio'
import { TEMPERATURAS, TuboRemessa, ItemRemessa, gerarEpl, baixarTexto, gerarRomaneio } from './remessaDocs'
import { HistoricoRemessa } from '@/components/apoio/log/ApoioLogTab'
import { useSearchParams } from 'react-router-dom'
import { CancelarPardiniDialog } from './CancelarPardiniDialog'
import { imprimirDireto, imprimirRaw, textoParaBase64, servidorImpressaoAtivo } from '@/lib/impressaoLocal'

interface Remessa {
  id: string; cod_lote_lab: number; apoio_id: string; apoio_nome: string; created_at: string; criado_por_nome: string | null
  temperatura: string; exames: number; tubos: number; status: string; modo: string; entregue_a: string | null
  entregue_em: string | null; conferido_em: string | null; transmitido_em: string | null; conferencia_forcada: string | null
  conferir_apos_etiqueta: boolean
}
interface Disponivel {
  id: string; pedido_id: string; order_number: string; paciente: string; exame_id: string; exame_nome: string; material: string
  apoio_id: string; apoio_nome: string; codigo_apoio: string; tubo: string; criado_em: string
}

const STATUS: Record<string, { label: string; cls: string }> = {
  aberta: { label: 'Aberta', cls: 'bg-muted text-foreground' },
  conferida: { label: 'Conferida', cls: 'bg-primary/15 text-primary' },
  transmitindo: { label: 'Transmitindo', cls: 'bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,30%)]' },
  transmitida: { label: 'Transmitida', cls: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' },
  parcial: { label: 'Parcial', cls: 'bg-[hsl(38,92%,50%)]/15 text-[hsl(38,92%,30%)]' },
  erro: { label: 'Erro', cls: 'bg-destructive/15 text-destructive' },
  manual: { label: 'Manual', cls: 'bg-secondary text-secondary-foreground' },
  cancelada: { label: 'Cancelada', cls: 'bg-destructive/10 text-destructive' },
  cancelada_apoio: { label: 'Cancelada no apoio', cls: 'bg-destructive/15 text-destructive' },
  cancelada_parcial: { label: 'Cancelada parcialmente', cls: 'bg-[hsl(25,95%,53%)]/15 text-[hsl(25,95%,35%)]' },
}
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
const erroMsg = (e: any) => e?.message || String(e)

function beep(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.frequency.value = ok ? 880 : 220; o.connect(g); g.connect(ctx.destination)
    g.gain.value = 0.15; o.start(); o.stop(ctx.currentTime + (ok ? 0.12 : 0.4))
  } catch { /* sem áudio */ }
}

export function ApoioRemessasTab({ moduloLiberado }: { moduloLiberado: boolean }) {
  const { has } = useApoioPermissions()
  const pode = has('apoio.remessa.operar')
  const [lista, setLista] = useState<Remessa[]>([])
  const [aguardando, setAguardando] = useState(0)
  const [apoios, setApoios] = useState<{ id: string; nome: string; conferir_apos_etiqueta: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [fApoio, setFApoio] = useState(''); const [fStatus, setFStatus] = useState('')
  const [fTemp, setFTemp] = useState(''); const [fDe, setFDe] = useState(''); const [fAte, setFAte] = useState('')
  const [nova, setNova] = useState(false)
  const [urlParams] = useSearchParams()
  const [aberta, setAberta] = useState<string | null>(urlParams.get('remessa'))

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: r }, { data: d }, { data: a }] = await Promise.all([
      supabase.rpc('apoio_remessa_lista' as any),
      supabase.rpc('apoio_remessa_disponiveis' as any, {}),
      supabase.from('apoio_laboratorio').select('id, nome, conferir_apos_etiqueta').eq('ativo', true).order('nome'),
    ])
    setLista((r as any) || []); setAguardando(((d as any) || []).length); setApoios((a as any) || [])
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const filtrada = useMemo(() => lista.filter(r =>
    (!fApoio || r.apoio_id === fApoio) && (!fStatus || r.status === fStatus) && (!fTemp || r.temperatura === fTemp) &&
    (!fDe || r.created_at.slice(0, 10) >= fDe) && (!fAte || r.created_at.slice(0, 10) <= fAte)), [lista, fApoio, fStatus, fTemp, fDe, fAte])

  const sel = 'h-9 rounded-lg border border-input bg-background px-2 text-sm'
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <button onClick={() => pode && moduloLiberado && setNova(true)}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40">
          <Truck className="h-6 w-6 text-primary" />
          <div><p className="text-2xl font-bold text-foreground leading-none">{aguardando}</p>
            <p className="text-xs text-muted-foreground">exames aguardando remessa (coleta registrada)</p></div>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => carregar()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Atualizar
          </Button>
          <Button onClick={() => setNova(true)} disabled={!pode || !moduloLiberado} className="gap-2"><Plus className="h-4 w-4" />Nova remessa</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className={sel} value={fApoio} onChange={e => setFApoio(e.target.value)}>
          <option value="">Todos os apoios</option>{apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select className={sel} value={fStatus} onChange={e => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={sel} value={fTemp} onChange={e => setFTemp(e.target.value)}>
          <option value="">Todas as temperaturas</option>{Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input type="date" className="h-9 w-40" value={fDe} onChange={e => setFDe(e.target.value)} />
        <Input type="date" className="h-9 w-40" value={fAte} onChange={e => setFAte(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        {!loading && filtrada.length === 0 ? (
          <EmptyState icon={<Truck className="h-10 w-10" />} title="Nenhuma remessa" description="Crie uma remessa com os exames já coletados." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{['Nº', 'Apoio', 'Criada em', 'Por', 'Temperatura', 'Exames', 'Tubos', 'Status', 'Modo', 'Entregue a / em', ''].map(h =>
                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtrada.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 cursor-pointer" onClick={() => setAberta(r.id)}>
                  <td className="px-3 py-2 font-mono font-bold">{r.cod_lote_lab}</td>
                  <td className="px-3 py-2">{r.apoio_nome}</td>
                  <td className="px-3 py-2">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2">{r.criado_por_nome || '—'}</td>
                  <td className="px-3 py-2">{TEMPERATURAS[r.temperatura]}</td>
                  <td className="px-3 py-2">{r.exames}</td>
                  <td className="px-3 py-2">{r.tubos}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label || r.status}</span></td>
                  <td className="px-3 py-2">{r.modo === 'manual' ? 'Manual' : 'Auto'}</td>
                  <td className="px-3 py-2">{r.entregue_a ? `${r.entregue_a} · ${fmt(r.entregue_em)}` : '—'}</td>
                  <td className="px-3 py-2"><Button size="sm" variant="ghost">Abrir</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {nova && <NovaRemessa apoios={apoios} onClose={() => setNova(false)} onCriada={(id) => { setNova(false); carregar(); setAberta(id) }} />}
      {aberta && <DetalheRemessa id={aberta} remessa={lista.find(r => r.id === aberta)} pode={pode} onClose={() => setAberta(null)} onChanged={carregar} />}
    </div>
  )
}

/* ---------------- Seleção de exames ---------------- */
function SelecaoExames({ apoioId, onSel, selecionados }: { apoioId: string; selecionados: string[]; onSel: (ids: string[]) => void }) {
  const [itens, setItens] = useState<Disponivel[]>([])
  const [fMat, setFMat] = useState('')
  useEffect(() => {
    if (!apoioId) { setItens([]); return }
    supabase.rpc('apoio_remessa_disponiveis' as any, { _apoio: apoioId }).then(({ data }) => setItens((data as any) || []))
  }, [apoioId])
  const vis = itens.filter(i => !fMat || (i.material || '').toLowerCase().includes(fMat.toLowerCase()))
  const grupos = useMemo(() => {
    const m = new Map<string, Disponivel[]>()
    vis.forEach(i => { const k = `${i.paciente}|${i.order_number}`; m.set(k, [...(m.get(k) || []), i]) })
    return [...m.entries()]
  }, [vis])
  const todos = vis.length > 0 && vis.every(i => selecionados.includes(i.id))
  const toggle = (ids: string[], on: boolean) => onSel(on ? [...new Set([...selecionados, ...ids])] : selecionados.filter(s => !ids.includes(s)))
  if (!apoioId) return <p className="text-sm text-muted-foreground">Escolha o apoio.</p>
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input placeholder="Filtrar por material" value={fMat} onChange={e => setFMat(e.target.value)} className="h-9 max-w-xs" />
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={todos} onCheckedChange={v => toggle(vis.map(i => i.id), !!v)} />Selecionar todos</label>
        <span className="ml-auto text-xs text-muted-foreground">{selecionados.length} selecionado(s)</span>
      </div>
      {grupos.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum exame com coleta registrada aguardando remessa para este apoio.</p>}
      {grupos.map(([k, g]) => (
        <div key={k} className="rounded-lg border border-border">
          <label className="flex items-center gap-2 bg-muted/30 px-3 py-2 text-sm font-medium">
            <Checkbox checked={g.every(i => selecionados.includes(i.id))} onCheckedChange={v => toggle(g.map(i => i.id), !!v)} />
            {g[0].paciente} <span className="text-muted-foreground">· Pedido {g[0].order_number} · Tubo {g[0].tubo}</span>
          </label>
          {g.map(i => (
            <label key={i.id} className="flex items-center gap-2 px-3 py-1.5 text-sm border-t border-border">
              <Checkbox checked={selecionados.includes(i.id)} onCheckedChange={v => toggle([i.id], !!v)} />
              {i.exame_nome} <span className="text-xs text-muted-foreground">{i.codigo_apoio} · {i.material || '—'}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

function NovaRemessa({ apoios, onClose, onCriada }: { apoios: { id: string; nome: string }[]; onClose: () => void; onCriada: (id: string) => void }) {
  const [apoio, setApoio] = useState(''); const [temp, setTemp] = useState('')
  const [sel, setSel] = useState<string[]>([]); const [salvando, setSalvando] = useState(false)
  const criar = async () => {
    if (!apoio || !temp) return toast.error('Escolha o apoio e a temperatura')
    if (!sel.length) return toast.error('Selecione ao menos um exame')
    setSalvando(true)
    const { data, error } = await supabase.rpc('apoio_remessa_criar' as any, { _apoio: apoio, _temperatura: temp, _ids: sel })
    setSalvando(false)
    if (error) return toast.error(erroMsg(error))
    toast.success(`Remessa nº ${(data as any).cod_lote_lab} criada`)
    onCriada((data as any).id)
  }
  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader><SheetTitle>Nova remessa</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Apoio*
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2" value={apoio} onChange={e => { setApoio(e.target.value); setSel([]) }}>
                <option value="">Selecione</option>{apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select></label>
            <label className="text-sm">Temperatura*
              <select className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2" value={temp} onChange={e => setTemp(e.target.value)}>
                <option value="">Selecione</option>{Object.entries(TEMPERATURAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></label>
          </div>
          <SelecaoExames apoioId={apoio} selecionados={sel} onSel={setSel} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={criar} disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar remessa</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ---------------- Detalhe ---------------- */
function DetalheRemessa({ id, remessa: r0, pode, onClose, onChanged }: { id: string; remessa?: Remessa; pode: boolean; onClose: () => void; onChanged: () => void }) {
  const { companyId } = useApoioEntitlement()
  const { has } = useApoioPermissions()
  const [r, setR] = useState<Remessa | undefined>(r0)
  const [itens, setItens] = useState<(ItemRemessa & { status: string; cod_ped_apoio?: string | null; cancel?: any })[]>([])
  const [cancelarSel, setCancelarSel] = useState<string[] | null>(null)
  const [nomes, setNomes] = useState<Record<string, string>>({})
  const [tubos, setTubos] = useState<TuboRemessa[]>([])
  const [recip, setRecip] = useState<any[]>([])
  const [bipando, setBipando] = useState(false)
  const [adicionar, setAdicionar] = useState(false); const [addSel, setAddSel] = useState<string[]>([])
  const [forcar, setForcar] = useState(false); const [just, setJust] = useState('')
  const [entrega, setEntrega] = useState(false); const [entA, setEntA] = useState(''); const [entEm, setEntEm] = useState('')
  const [transmitindo, setTransmitindo] = useState(false)
  const [labNome, setLabNome] = useState('')
  const [colisao, setColisao] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    supabase.from('apoio_remessa').select('colisao').eq('id', id).maybeSingle().then(({ data }) => setColisao((data as any)?.colisao ?? null))
    const [{ data: l }, { data: pe }, { data: t }, { data: rc }] = await Promise.all([
      supabase.rpc('apoio_remessa_lista' as any),
      supabase.from('apoio_pedido_exame').select('id, pedido_id, exame_id, codigo_apoio, status, apoio_id, cod_ped_apoio, info_complementar, exams(name), attendance_orders(order_number, patient_name)').eq('remessa_id', id),
      supabase.rpc('apoio_remessa_tubos' as any, { _remessa: id }),
      supabase.from('apoio_recipiente').select('*').eq('remessa_id', id).order('cod_bar_apoio'),
    ])
    setR(((l as any) || []).find((x: Remessa) => x.id === id))
    const tb = ((t as any) || []) as TuboRemessa[]
    setTubos(tb); setRecip((rc as any) || [])
    const mat = await Promise.all(((pe as any) || []).map((p: any) => supabase.rpc('apoio_item_material' as any, { _pedido: p.pedido_id, _exame: p.exame_id })))
    setItens(((pe as any) || []).map((p: any, i: number) => ({
      id: p.id, status: p.status, cod_ped_apoio: p.cod_ped_apoio, cancel: p.info_complementar?.cancel_apoio || null, paciente: p.attendance_orders?.patient_name || '', order_number: p.attendance_orders?.order_number || '',
      exame: p.exams?.name || p.codigo_apoio, material: (mat[i].data as any) || '',
      tubo: tb.find(x => x.pedido_id === p.pedido_id)?.codigo || '',
    })))
    const ids = [...new Set(((pe as any) || []).map((p: any) => p.info_complementar?.cancel_apoio?.por).filter(Boolean))] as string[]
    if (ids.length) supabase.from('profiles').select('id, full_name').in('id', ids).then(({ data }) => setNomes(Object.fromEntries(((data as any) || []).map((x: any) => [x.id, x.full_name]))))
  }, [id])
  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    if (!companyId) return
    supabase.from('companies').select('name, nome_fantasia').eq('id', companyId).maybeSingle().then(({ data }) => setLabNome((data as any)?.nome_fantasia || (data as any)?.name || ''))
  }, [companyId])

  const atualizar = () => { carregar(); onChanged() }
  const rpc = async (fn: string, args: any, ok: string) => {
    const { error } = await supabase.rpc(fn as any, args)
    if (error) { toast.error(erroMsg(error)); return false }
    toast.success(ok); atualizar(); return true
  }

  if (!r) return null
  const podeEditar = pode && ['aberta', 'conferida'].includes(r.status)
  const transmitida = ['transmitida', 'parcial', 'manual', 'cancelada_apoio', 'cancelada_parcial'].includes(r.status)
  const podeTransmitir = pode && (r.status === 'conferida' || (r.status === 'aberta' && r.conferir_apos_etiqueta))

  const transmitir = async () => {
    setTransmitindo(true)
    const { data, error } = await supabase.functions.invoke('apoio-transmitir', { body: { remessa_id: r.id } })
    setTransmitindo(false)
    if (error) return toast.error(erroMsg(error))
    if ((data as any)?.ok) { toast.success('Remessa transmitida'); atualizar() }
    else toast.warning((data as any)?.motivo || 'Não foi possível transmitir')
  }

  const enfileirar = async (tipo: 'etiqueta_epl' | 'romaneio_pdf', conteudo: string, referencia: string) => {
    const { error } = await supabase.from('apoio_impressao_fila' as any).insert({ empresa_id: companyId, tipo, conteudo, referencia })
    if (error) { toast.error(erroMsg(error)); return false }
    return true
  }
  const eplDe = (rc: any) => rc.etiqueta_epl || gerarEpl(rc.cod_bar_apoio, r.apoio_nome, rc.cod_ped_apoio || '')
  void enfileirar
  const servidorOk = async () => {
    if (await servidorImpressaoAtivo()) return true
    toast.error('Servidor de Impressão AisAxius não está aberto. Abra o programa na bandeja do Windows e tente de novo.')
    return false
  }
  const contarImpressao = async (lista: any[]) => {
    await Promise.all(lista.map(rc => supabase.from('apoio_recipiente').update({ impressoes: (rc.impressoes || 0) + 1 }).eq('id', rc.id)))
    carregar()
  }
  const imprimirEtiqueta = async (rc: any) => {
    if (rc.cancelado) return toast.error('Tubo cancelado no Pardini')
    if (!(await servidorOk())) return
    try {
      const res = await imprimirRaw('etiqueta_apoio_pardini', textoParaBase64(eplDe(rc)))
      toast.success(res?.mensagem || 'Etiqueta enviada para impressão.')
      await contarImpressao([rc])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao imprimir a etiqueta.')
    }
  }
  const imprimirTodas = async () => {
    if (!recipAtivos.length) { toast.error('Nenhum recipiente para imprimir.'); return }
    if (!(await servidorOk())) return
    try {
      const res = await imprimirRaw('etiqueta_apoio_pardini', recipAtivos.map(rc => textoParaBase64(eplDe(rc))))
      toast.success(`${res?.etiquetas ?? recip.length} etiqueta(s) enviada(s) para impressão.`)
      await contarImpressao(recip)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao imprimir as etiquetas.')
    }
  }

  const itensAtivos = itens.filter(i => !(i.status === 'cancelado' && i.cancel?.estado === 'cancelado'))
  const recipAtivos = recip.filter(rc => !rc.cancelado)
  const romaneio = () => gerarRomaneio({ laboratorio: labNome, apoio: r.apoio_nome, numero: r.cod_lote_lab, temperatura: r.temperatura, itens: itensAtivos, totalTubos: tubos.length - (recip.length - recipAtivos.length) })
  const podeCancelarApoio = has('apoio.remessa.cancelar') && ['transmitida', 'parcial', 'cancelada_parcial'].includes(r.status) && r.modo !== 'manual'
  const cancelaveis = itens.filter(i => i.cod_ped_apoio && i.status !== 'cancelado')
  const baixarPdf = () => romaneio().save(`romaneio-remessa-${r.cod_lote_lab}.pdf`)
  const imprimirRomaneio = async () => {
    if (r.status === 'cancelada_apoio') return toast.error('Remessa cancelada no Pardini: romaneio bloqueado.')
    if (!(await servidorOk())) return
    try {
      const res = await imprimirDireto('romaneio_apoio_pardini', romaneio().output('blob'))
      toast.success(res?.mensagem || 'Romaneio enviado para impressão.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao imprimir o romaneio.')
    }
  }

  const etapas = [
    { k: 'Criada', em: r.created_at }, { k: 'Conferida', em: r.conferido_em },
    { k: 'Transmitida', em: r.transmitido_em }, { k: 'Entregue', em: r.entregue_em },
  ]

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">Remessa nº {r.cod_lote_lab}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[transmitindo ? 'transmitindo' : r.status]?.cls}`}>{STATUS[transmitindo ? 'transmitindo' : r.status]?.label}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Apoio</p>{r.apoio_nome}</div>
          <div><p className="text-xs text-muted-foreground">Temperatura</p>{TEMPERATURAS[r.temperatura]}</div>
          <div><p className="text-xs text-muted-foreground">Modo</p>{r.modo === 'manual' ? 'Manual' : 'Automático'}</div>
          <div><p className="text-xs text-muted-foreground">Por</p>{r.criado_por_nome || '—'}</div>
        </div>
        <div className="mt-4 flex items-center gap-1">
          {etapas.map((e, i) => (
            <div key={e.k} className="flex flex-1 items-center gap-1">
              <div className={`flex flex-col items-center text-center ${e.em ? 'text-primary' : 'text-muted-foreground'}`}>
                <CheckCircle2 className="h-5 w-5" /><span className="text-xs font-medium">{e.k}</span><span className="text-[10px]">{fmt(e.em)}</span>
              </div>
              {i < etapas.length - 1 && <div className={`h-0.5 flex-1 ${etapas[i + 1].em ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
        {colisao && r.status === 'erro' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="flex-1"><b>Número já usado no Pardini.</b> {colisao}. Nada foi enviado com este número; gere um número novo e transmita de novo.</span>
            {pode && <Button size="sm" variant="outline" onClick={async () => {
              const { data, error } = await supabase.rpc('apoio_remessa_renumerar' as any, { _remessa: r.id })
              if (error) return toast.error(erroMsg(error))
              toast.success(`Número novo gerado: ${data}. Agora é só transmitir de novo.`); atualizar()
            }}>Gerar número novo</Button>}
          </div>
        )}
        {r.conferencia_forcada && <p className="mt-2 text-xs text-[hsl(38,92%,30%)]">Conferência forçada: {r.conferencia_forcada}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled={!pode || r.status === 'cancelada'} onClick={() => setBipando(true)}><ScanLine className="h-4 w-4" />Conferir por leitura</Button>
          <Button size="sm" className="gap-2" disabled={!podeTransmitir || transmitindo} onClick={transmitir}>
            {transmitindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{transmitindo ? 'Transmitindo…' : 'Transmitir'}</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={imprimirRomaneio} disabled={!pode || r.status === 'cancelada_apoio'}><Printer className="h-4 w-4" />Imprimir romaneio</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={baixarPdf}><FileText className="h-4 w-4" />Baixar PDF</Button>
          <Button variant="outline" size="sm" className="gap-2" disabled={!pode || r.status === 'cancelada'} onClick={() => { setEntA(r.entregue_a || ''); setEntEm(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)); setEntrega(true) }}><PackageCheck className="h-4 w-4" />Registrar entrega</Button>
          {has('apoio.remessa.operar') && r.status === 'aberta' && <Button variant="outline" size="sm" onClick={() => setForcar(true)}>Forçar conferência</Button>}
          {podeCancelarApoio && !r.entregue_em && cancelaveis.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => setCancelarSel(cancelaveis.map(i => i.id))}><Ban className="h-4 w-4" />Cancelar no Pardini</Button>
          )}
          {podeCancelarApoio && r.entregue_em && <p className="w-full text-xs text-muted-foreground">A amostra já foi entregue ao Pardini. O cancelamento é feito direto com o apoio.</p>}
          {pode && !transmitida && r.status !== 'cancelada' && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => { if (confirm('Cancelar esta remessa? Os exames voltam para "aguardando remessa".')) rpc('apoio_remessa_cancelar', { _remessa: r.id }, 'Remessa cancelada') }}><Ban className="h-4 w-4" />Cancelar remessa</Button>
          )}
        </div>

        <HistoricoRemessa remessaId={r.id} />

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Exames ({itens.length}) · Tubos ({tubos.length})</h3>
            {podeEditar && <Button size="sm" variant="ghost" className="gap-1" onClick={() => { setAddSel([]); setAdicionar(true) }}><Plus className="h-4 w-4" />Adicionar exames</Button>}
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground"><tr>{['Paciente', 'Pedido', 'Tubo', 'Exame', 'Material', ''].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
            <tbody>{itens.map(i => {
              const canc = i.cancel?.estado === 'cancelado' && i.status === 'cancelado'
              const semConf = i.cancel?.estado === 'sem_confirmacao' && i.status !== 'cancelado'
              return (<Fragment key={i.id}>
              <tr key={i.id} className={`border-t border-border ${canc ? 'text-muted-foreground line-through' : ''}`}>
                <td className="px-2 py-1.5">{i.paciente}</td><td className="px-2 py-1.5">{i.order_number}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{i.tubo}{tubos.find(t => t.codigo === i.tubo)?.bipado && <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-[hsl(var(--success))]" />}</td>
                <td className="px-2 py-1.5">{i.exame}</td><td className="px-2 py-1.5">{i.material || '—'}</td>
                <td className="px-2 py-1.5 text-right">{podeEditar && <Button size="sm" variant="ghost" onClick={() => rpc('apoio_remessa_remover', { _pedido_exame: i.id }, 'Exame removido da remessa')}><X className="h-4 w-4" /></Button>}
                  {podeCancelarApoio && !r.entregue_em && i.cod_ped_apoio && i.status !== 'cancelado' && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelarSel([i.id])}>{semConf ? 'Tentar de novo' : 'Cancelar no Pardini'}</Button>}</td>
              </tr>
              {(canc || semConf) && <tr key={i.id + ':c'}><td colSpan={6} className={`px-2 pb-1.5 text-xs ${semConf ? 'text-[hsl(38,92%,30%)]' : 'text-destructive'}`}>
                {canc ? `Cancelado no apoio · ${i.cancel.destino === 'fila' ? 'voltou para a fila do apoio' : 'cancelado no atendimento'}` : 'Cancelamento sem confirmação do Pardini'} · Motivo: {i.cancel.motivo} · {nomes[i.cancel.por] || 'Usuário'} · {fmt(i.cancel.em)}
              </td></tr>}
              </Fragment>)})}</tbody>
          </table>
        </div>

        {transmitida && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Recipientes do apoio</h3>
              <Button size="sm" variant="outline" className="gap-2" disabled={!pode || !recipAtivos.length} onClick={imprimirTodas}><Printer className="h-4 w-4" />Imprimir todas</Button></div>
            {recip.length === 0 ? <p className="text-sm text-muted-foreground">O apoio ainda não devolveu recipientes.</p> : (
              <table className="w-full text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr>{['Código de barras do apoio', 'Exames do tubo', 'Impressões', ''].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>{recip.map(rc => (
                  <tr key={rc.id} className={`border-t border-border ${rc.cancelado ? 'text-muted-foreground' : ''}`}>
                    <td className="px-2 py-1.5 font-mono"><span className={rc.cancelado ? 'line-through' : ''}>{rc.cod_bar_apoio}</span>{rc.cancelado && <span className="ml-2 text-xs text-destructive no-underline">Tubo cancelado no Pardini</span>}</td>
                    <td className="px-2 py-1.5">{tubos.find(t => t.codigo === rc.cod_bar_apoio)?.exames || '—'}</td>
                    <td className="px-2 py-1.5">{rc.impressoes}</td>
                    <td className="px-2 py-1.5 text-right space-x-1">
                      <Button size="sm" variant="outline" disabled={!pode || rc.cancelado} onClick={() => imprimirEtiqueta(rc)}><Printer className="mr-1 h-3.5 w-3.5" />Imprimir etiqueta</Button>
                      <Button size="sm" variant="ghost" disabled={rc.cancelado} onClick={() => baixarTexto(`${rc.cod_bar_apoio}.epl`, eplDe(rc))}><Download className="mr-1 h-3.5 w-3.5" />Baixar .epl</Button>
                    </td>
                  </tr>))}</tbody></table>
            )}
          </div>
        )}

        {bipando && <Bipagem remessaId={r.id} tubos={tubos} onClose={() => setBipando(false)} onChanged={atualizar} />}

        <Dialog open={adicionar} onOpenChange={setAdicionar}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Adicionar exames à remessa</DialogTitle></DialogHeader>
            <SelecaoExames apoioId={r.apoio_id} selecionados={addSel} onSel={setAddSel} />
            <DialogFooter><Button disabled={!addSel.length} onClick={async () => { if (await rpc('apoio_remessa_adicionar', { _remessa: r.id, _ids: addSel }, 'Exames adicionados')) setAdicionar(false) }}>Adicionar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={forcar} onOpenChange={setForcar}>
          <DialogContent><DialogHeader><DialogTitle>Forçar conferência</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Somente administrador. Informe por que a conferência não foi feita por leitura.</p>
            <Textarea value={just} onChange={e => setJust(e.target.value)} placeholder="Justificativa" />
            <DialogFooter><Button disabled={just.trim().length < 5} onClick={async () => { if (await rpc('apoio_remessa_forcar_conferencia', { _remessa: r.id, _justificativa: just }, 'Conferência registrada')) setForcar(false) }}>Confirmar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={entrega} onOpenChange={setEntrega}>
          <DialogContent><DialogHeader><DialogTitle>Registrar entrega</DialogTitle></DialogHeader>
            <label className="text-sm">Quem levou*<Input value={entA} onChange={e => setEntA(e.target.value)} /></label>
            <label className="text-sm">Data e hora*<Input type="datetime-local" value={entEm} onChange={e => setEntEm(e.target.value)} /></label>
            <DialogFooter><Button disabled={!entA.trim() || !entEm} onClick={async () => { if (await rpc('apoio_remessa_entrega', { _remessa: r.id, _entregue_a: entA, _entregue_em: new Date(entEm).toISOString() }, 'Entrega registrada')) setEntrega(false) }}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        <CancelarPardiniDialog open={!!cancelarSel} marcados={cancelarSel || []} onClose={() => setCancelarSel(null)} onDone={atualizar}
          itens={(cancelarSel && cancelarSel.length === 1 ? itens.filter(i => i.id === cancelarSel[0]) : cancelaveis).map(i => ({ id: i.id, paciente: i.paciente, order_number: i.order_number, exame: i.exame, tubo: i.tubo }))} />
      </SheetContent>
    </Sheet>
  )
}

/* ---------------- Bipagem ---------------- */
function Bipagem({ remessaId, tubos: iniciais, onClose, onChanged }: { remessaId: string; tubos: TuboRemessa[]; onClose: () => void; onChanged: () => void }) {
  const [tubos, setTubos] = useState(iniciais)
  const [codigo, setCodigo] = useState('')
  const [ultimo, setUltimo] = useState<{ ok: boolean; msg: string } | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { const t = setInterval(() => { if (document.activeElement !== ref.current) ref.current?.focus() }, 400); return () => clearInterval(t) }, [])
  const faltam = tubos.filter(t => !t.bipado)
  const ler = async (e: React.FormEvent) => {
    e.preventDefault()
    const cod = codigo.trim(); setCodigo('')
    if (!cod) return
    const { data, error } = await supabase.rpc('apoio_remessa_bipar' as any, { _remessa: remessaId, _codigo: cod })
    if (error) { beep(false); setUltimo({ ok: false, msg: erroMsg(error) }); return }
    const d = data as any
    if (d.resultado === 'nao_pertence') { beep(false); setUltimo({ ok: false, msg: `${d.codigo} não é desta remessa` }); return }
    beep(true)
    setUltimo({ ok: true, msg: d.resultado === 'repetido' ? `${d.codigo} já tinha sido lido` : `${d.codigo} conferido` })
    setTubos(ts => ts.map(t => t.codigo.toUpperCase() === d.codigo ? { ...t, bipado: true } : t))
    if (d.faltam === 0) { toast.success('Todos os tubos conferidos — remessa conferida'); onChanged() }
  }
  return (
    <Dialog open onOpenChange={o => { if (!o) { onChanged(); onClose() } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Conferir por leitura</DialogTitle></DialogHeader>
        <form onSubmit={ler}><Input ref={ref} autoFocus value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Leia o código de barras do tubo" className="h-12 font-mono text-lg" /></form>
        {ultimo && (
          <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${ultimo.ok ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-destructive/15 text-destructive'}`}>
            {ultimo.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}{ultimo.msg}
          </div>
        )}
        <p className="text-sm font-semibold">{faltam.length === 0 ? 'Todos os tubos conferidos' : `Faltam ${faltam.length} tubo(s) de ${tubos.length}`}</p>
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {faltam.map(t => <div key={t.codigo} className="flex justify-between rounded border border-border px-2 py-1 text-sm"><span className="font-mono">{t.codigo}</span><span className="text-muted-foreground truncate ml-2">{t.paciente} {t.exames}</span></div>)}
        </div>
        <Badge variant="outline" className="w-fit">{tubos.some(t => t.pos_transmissao) ? 'Bipe a etiqueta do apoio' : 'Bipe a etiqueta do nosso tubo (APOIO)'}</Badge>
      </DialogContent>
    </Dialog>
  )
}
