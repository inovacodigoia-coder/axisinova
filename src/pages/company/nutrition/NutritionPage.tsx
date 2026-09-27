import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useCompanyContext } from '@/context/CompanyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Utensils, Users, Printer, Download, Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { rpc } from '@/hooks/useCollectionPosts'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useLabelConfig } from '@/hooks/useLabelConfig'
import { servidorImpressaoAtivo, imprimirDireto, TIPOS_DOCUMENTO } from '@/lib/impressaoLocal'
import { gerarPdfEtiquetas } from '@/lib/labelPdf'
import { useNutricaoLabelConfig } from '@/hooks/useNutricaoLabelConfig'
import Barcode from 'react-barcode'
import type { PermissionAction } from '@/types/permissions.types'

const db = supabase as any

export const REFEICOES = [
  { key: 'cafe', label: 'Café da Manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lanche', label: 'Lanche' },
  { key: 'janta', label: 'Janta' },
  { key: 'ceia', label: 'Ceia' },
] as const
type RefKey = typeof REFEICOES[number]['key']

interface Dieta { id: string; nome: string; ordem: number; ativo: boolean }
interface Paciente {
  requestId: string; bedId: string; nome: string; leito: string; setor: string; acompanhante: boolean; acompConfirmado: boolean
  dietaId: string | null; dieta: string | null; obs: string
}
interface Marca { admission_request_id: string; refeicao: RefKey; conferido_em: string | null; servido_em: string | null }

const hojeISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

function useNutritionPerms() {
  const { user } = useAuth()
  const { activeProfile } = useCompanyContext()
  return useMemo(() => {
    const admin = user?.role === 'company_admin' || user?.role === 'super_admin'
    const list: PermissionAction[] = (activeProfile?.permissions as any)?.nutrition || []
    const has = (a: PermissionAction) => admin || list.includes(a)
    return { dieta: has('edit'), conferir: has('approve'), servir: has('create'), relatorio: has('export') }
  }, [user, activeProfile])
}

export default function NutritionPage() {
  const { user } = useAuth()
  const companyId = user?.companyId
  const perms = useNutritionPerms()
  const [dietas, setDietas] = useState<Dieta[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [data, setData] = useState(hojeISO())
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Paciente | null>(null)

  const load = useCallback(async () => {
    if (!companyId) return
    const [b, u, d, m] = await Promise.all([
      db.from('inpatient_beds').select('id,name,unit_id,current_request_id').eq('company_id', companyId).eq('status', 'occupied'),
      db.from('inpatient_units').select('id,name').eq('company_id', companyId),
      db.from('nutricao_dieta').select('*').eq('company_id', companyId).order('ordem').order('nome'),
      db.from('nutricao_refeicao').select('admission_request_id,refeicao,conferido_em,servido_em').eq('company_id', companyId).eq('data', data),
    ])
    const beds = (b.data || []).filter((x: any) => x.current_request_id)
    const ids = beds.map((x: any) => x.current_request_id)
    const [r, np] = ids.length ? await Promise.all([
      db.from('admission_requests').select('id,patient_name,has_companion,companion_confirmed').in('id', ids),
      db.from('nutricao_paciente').select('*').in('admission_request_id', ids),
    ]) : [{ data: [] }, { data: [] }]
    const dl: Dieta[] = d.data || []
    const unitName = (id: string) => (u.data || []).find((x: any) => x.id === id)?.name || ''
    setDietas(dl)
    setPacientes(beds.map((bed: any) => {
      const req = (r.data || []).find((x: any) => x.id === bed.current_request_id)
      const n = (np.data || []).find((x: any) => x.admission_request_id === bed.current_request_id)
      return {
        requestId: bed.current_request_id, bedId: bed.id, nome: req?.patient_name || '—', leito: bed.name, setor: unitName(bed.unit_id),
        acompanhante: !!req?.has_companion, acompConfirmado: !!req?.companion_confirmed, dietaId: n?.dieta_id || null,
        dieta: dl.find(x => x.id === n?.dieta_id)?.nome || null, obs: n?.observacoes || '',
      }
    }).sort((a: Paciente, b: Paciente) => (a.setor + a.leito).localeCompare(b.setor + b.leito)))
    setMarcas(m.data || [])
    setLoading(false)
  }, [companyId, data])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!companyId) return
    const f = `company_id=eq.${companyId}`
    const ch = supabase.channel('nutri-' + companyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inpatient_beds', filter: f }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admission_requests', filter: f }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutricao_paciente', filter: f }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutricao_refeicao', filter: f }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, load])

  const totalAcomp = pacientes.filter(p => p.acompanhante).length
  const pendentes = pacientes.filter(p => !p.dieta || !p.acompConfirmado)
  const porDieta = useMemo(() => {
    const map = new Map<string, { pacientes: number; acomp: number }>()
    pacientes.forEach(p => {
      const k = p.dieta || 'Sem dieta definida'
      const v = map.get(k) || { pacientes: 0, acomp: 0 }
      v.pacientes++; if (p.acompanhante) v.acomp++
      map.set(k, v)
    })
    return [...map.entries()]
  }, [pacientes])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Utensils className="h-6 w-6 text-primary" />Nutrição</h1>
        <div className="flex items-center gap-2 text-sm">Data <Input type="date" className="w-40" value={data} onChange={e => setData(e.target.value)} /></div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Pacientes internados</p><p className="text-3xl font-bold">{pacientes.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Acompanhantes</p><p className="text-3xl font-bold">{totalAcomp}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Refeições por refeição (pacientes + acompanhantes)</p><p className="text-3xl font-bold">{pacientes.length + totalAcomp}</p><p className="text-xs text-muted-foreground">{(pacientes.length + totalAcomp) * 5} no dia</p></CardContent></Card>
      </div>
      {pendentes.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="pt-4 space-y-2">
            <p className="font-semibold flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Pendências: {pendentes.length} paciente(s)
              <span className="text-sm font-normal text-muted-foreground">({pendentes.filter(p => !p.dieta).length} sem dieta · {pendentes.filter(p => !p.acompConfirmado).length} sem acompanhante confirmado)</span></p>
            <div className="divide-y">{pendentes.map(p => (
              <div key={p.requestId} className="flex items-center justify-between gap-2 py-1.5 text-sm flex-wrap">
                <span><b>{p.nome}</b> · {p.setor} · {p.leito}
                  {!p.dieta && <Badge variant="destructive" className="ml-2">Sem dieta</Badge>}
                  {!p.acompConfirmado && <Badge variant="outline" className="ml-2">Acompanhante não confirmado</Badge>}</span>
                <span className="flex gap-2">
                  {!p.dieta && perms.dieta && <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Definir dieta</Button>}
                  {!p.acompConfirmado && <Button size="sm" variant="outline" asChild><a href={`/app/internacao?leito=${p.bedId}`}>Abrir leito</a></Button>}
                </span>
              </div>
            ))}</div>
          </CardContent>
        </Card>
      )}
      {porDieta.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {porDieta.map(([k, v]) => <Badge key={k} variant={k === 'Sem dieta definida' ? 'destructive' : 'secondary'}>{k}: {v.pacientes}{v.acomp ? ` + ${v.acomp} acomp.` : ''}</Badge>)}
        </div>
      )}

      <Tabs defaultValue="painel">
        <TabsList>
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="refeicoes">Refeições</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="dietas">Tipos de dieta</TabsTrigger>
        </TabsList>

        <TabsContent value="painel">
          {loading ? null : pacientes.length === 0 ? <EmptyState title="Nenhum paciente internado" description="Os pacientes aparecem aqui quando ocupam um leito da Internação." /> : (
            <Card><CardContent className="pt-4">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Paciente</th><th>Setor · Leito</th><th>Acompanhante</th><th>Dieta</th><th>Observações</th><th /></tr></thead>
                <tbody>{pacientes.map(p => (
                  <tr key={p.requestId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{p.nome}</td>
                    <td>{p.setor} · {p.leito}</td>
                    <td>{p.acompanhante ? <Badge>Sim</Badge> : <span className="text-muted-foreground">Não</span>}</td>
                    <td>{p.dieta || <Badge variant="destructive">Não definida</Badge>}</td>
                    <td className="text-muted-foreground max-w-xs truncate">{p.obs}</td>
                    <td className="text-right">{perms.dieta && <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Dieta</Button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="refeicoes">
          <Refeicoes pacientes={pacientes} marcas={marcas} data={data} perms={perms} reload={load} />
        </TabsContent>

        <TabsContent value="relatorio">
          {perms.relatorio ? <Relatorio pacientes={pacientes} marcas={marcas} data={data} /> : <p className="text-sm text-muted-foreground p-4">Sem permissão para o relatório de Nutrição.</p>}
        </TabsContent>

        <TabsContent value="etiquetas">
          <Etiquetas pacientes={pacientes} />
        </TabsContent>

        <TabsContent value="dietas">
          <Dietas dietas={dietas} companyId={companyId} canEdit={perms.dieta} reload={load} />
        </TabsContent>
      </Tabs>

      {editing && <DietaDialog p={editing} dietas={dietas.filter(d => d.ativo || d.id === editing.dietaId)} companyId={companyId!} onClose={() => { setEditing(null); load() }} />}
    </div>
  )
}

function DietaDialog({ p, dietas, companyId, onClose }: { p: Paciente; dietas: Dieta[]; companyId: string; onClose: () => void }) {
  const [dieta, setDieta] = useState(p.dietaId || '')
  const [obs, setObs] = useState(p.obs)
  const salvar = async () => {
    const { data: u } = await supabase.auth.getUser()
    const { error } = await db.from('nutricao_paciente').upsert({ admission_request_id: p.requestId, company_id: companyId, dieta_id: dieta || null, observacoes: obs.trim() || null, updated_by: u.user?.id, updated_at: new Date().toISOString() })
    if (error) return toast.error(error.message)
    toast.success('Dieta salva'); onClose()
  }
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dieta — {p.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{p.setor} · {p.leito} · Acompanhante: {p.acompanhante ? 'Sim' : 'Não'} (alterado só na Internação)</p>
          <Select value={dieta} onValueChange={setDieta}>
            <SelectTrigger><SelectValue placeholder="Tipo de dieta" /></SelectTrigger>
            <SelectContent>{dietas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder='Observações (ex.: "sem lactose", "alergia a camarão")' value={obs} onChange={e => setObs(e.target.value)} />
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!dieta} onClick={salvar}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Refeicoes({ pacientes, marcas, data, perms, reload }: { pacientes: Paciente[]; marcas: Marca[]; data: string; perms: ReturnType<typeof useNutritionPerms>; reload: () => void }) {
  const [ref, setRef] = useState<RefKey>('cafe')
  const marca = (id: string) => marcas.find(m => m.admission_request_id === id && m.refeicao === ref)
  const marcar = async (id: string, etapa: 'conferir' | 'servir', valor: boolean) => {
    await rpc('nutricao_marcar', { _request_id: id, _data: data, _refeicao: ref, _etapa: etapa, _valor: valor })
    reload()
  }
  const grupos = useMemo(() => {
    const m = new Map<string, Paciente[]>()
    pacientes.forEach(p => { const k = p.dieta || 'Sem dieta definida'; m.set(k, [...(m.get(k) || []), p]) })
    return [...m.entries()]
  }, [pacientes])
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">{REFEICOES.map(r => {
        const serv = pacientes.filter(p => marcas.some(m => m.admission_request_id === p.requestId && m.refeicao === r.key && m.servido_em)).length
        return <Button key={r.key} size="sm" variant={ref === r.key ? 'default' : 'outline'} onClick={() => setRef(r.key)}>{r.label} <span className="ml-1 opacity-70">{serv}/{pacientes.length}</span></Button>
      })}</div>
      <p className="text-xs text-muted-foreground">Fluxo: a nutricionista confere a bandeja; depois a equipe marca como servido.</p>
      {grupos.map(([dieta, lista]) => (
        <Card key={dieta}>
          <CardHeader className="py-3"><CardTitle className="text-base">{dieta} <span className="text-sm font-normal text-muted-foreground">— {lista.length} paciente(s) + {lista.filter(p => p.acompanhante).length} acompanhante(s)</span></CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {lista.map(p => { const mk = marca(p.requestId); return (
              <div key={p.requestId} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span><b>{p.nome}</b> · {p.setor} · {p.leito}{p.acompanhante && <Badge variant="secondary" className="ml-2"><Users className="h-3 w-3 mr-1" />+ acompanhante</Badge>}{p.obs && <span className="text-muted-foreground"> · {p.obs}</span>}</span>
                <span className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5"><Checkbox disabled={!perms.conferir || !p.dieta || !!mk?.servido_em} checked={!!mk?.conferido_em} onCheckedChange={v => marcar(p.requestId, 'conferir', !!v)} />Conferido</label>
                  <label className="flex items-center gap-1.5"><Checkbox disabled={!perms.servir || !mk?.conferido_em} checked={!!mk?.servido_em} onCheckedChange={v => marcar(p.requestId, 'servir', !!v)} />Servido</label>
                </span>
              </div>
            ) })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function Relatorio({ pacientes, marcas, data }: { pacientes: Paciente[]; marcas: Marca[]; data: string }) {
  const [ref, setRef] = useState<'dia' | RefKey>('dia')
  const refs = ref === 'dia' ? REFEICOES : REFEICOES.filter(r => r.key === ref)
  const linhas = useMemo(() => {
    const m = new Map<string, { p: number; a: number }>()
    pacientes.forEach(p => { const k = p.dieta || 'Sem dieta definida'; const v = m.get(k) || { p: 0, a: 0 }; v.p++; if (p.acompanhante) v.a++; m.set(k, v) })
    return [...m.entries()].sort()
  }, [pacientes])
  const n = refs.length
  const tot = linhas.reduce((s, [, v]) => ({ p: s.p + v.p, a: s.a + v.a }), { p: 0, a: 0 })
  const servidas = marcas.filter(m => m.servido_em && refs.some(r => r.key === m.refeicao)).length
  const titulo = `Nutrição — ${ref === 'dia' ? 'Dia completo' : refs[0].label} — ${data.split('-').reverse().join('/')}`
  const csv = () => {
    const rows = [['Dieta', 'Pacientes', 'Acompanhantes', 'Refeições'], ...linhas.map(([k, v]) => [k, v.p, v.a, (v.p + v.a) * n]), ['Total', tot.p, tot.a, (tot.p + tot.a) * n]]
    const blob = new Blob(['\ufeff' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nutricao-${data}-${ref}.csv`; a.click()
  }
  const imprimir = () => {
    const el = document.getElementById('nutri-relatorio'); if (!el) return
    const w = window.open('', '_blank'); if (!w) return
    w.document.write(`<html><head><title>${titulo}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px;text-align:left}</style></head><body>${el.innerHTML}</body></html>`)
    w.document.close(); w.focus(); w.print()
  }
  return (
    <Card><CardContent className="pt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={ref} onValueChange={v => setRef(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="dia">Dia completo</SelectItem>{REFEICOES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={imprimir}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
        <Button size="sm" variant="outline" onClick={csv}><Download className="h-4 w-4 mr-1" />Excel (CSV)</Button>
      </div>
      <div id="nutri-relatorio">
        <h3 className="font-semibold mb-2">{titulo}</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-1">Dieta</th><th>Pacientes</th><th>Acompanhantes</th><th>Refeições a preparar</th></tr></thead>
          <tbody>
            {linhas.map(([k, v]) => <tr key={k} className="border-b"><td className="py-1">{k}</td><td>{v.p}</td><td>{v.a}</td><td>{(v.p + v.a) * n}</td></tr>)}
            <tr className="font-bold"><td className="py-1">Total</td><td>{tot.p}</td><td>{tot.a}</td><td>{(tot.p + tot.a) * n}</td></tr>
          </tbody>
        </table>
        <p className="text-sm mt-2">Bandejas de paciente servidas: {servidas} de {tot.p * n}</p>
      </div>
    </CardContent></Card>
  )
}

function Etiquetas({ pacientes }: { pacientes: Paciente[] }) {
  const [ref, setRef] = useState<RefKey>('almoco')
  const [sel, setSel] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { config: labConfig } = useLabelConfig()
  const { config: nc } = useNutricaoLabelConfig()
  const w = nc?.widthMm ?? labConfig.widthMm, h = nc?.heightMm ?? labConfig.heightMm
  const refLabel = REFEICOES.find(r => r.key === ref)!.label
  const escolhidos = pacientes.filter(p => sel.includes(p.requestId))
  const semDieta = escolhidos.filter(p => !p.dieta)

  const imprimir = async () => {
    if (semDieta.length) return toast.error(`Defina a dieta antes de imprimir: ${semDieta.map(p => p.nome).join(', ')}`)
    setBusy(true)
    try {
      const els = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.nutri-label') || [])
      // Só envia direto à impressora quando o tipo "Etiqueta de Nutrição" está configurado.
      if (nc && await servidorImpressaoAtivo()) {
        try {
          const pdf = await gerarPdfEtiquetas(els, w, h)
          const r = await imprimirDireto(TIPOS_DOCUMENTO.etiquetaNutricao, pdf)
          toast.success(r.mensagem || 'Etiquetas enviadas para impressão'); return
        } catch (e) {
          toast.warning(`${e instanceof Error ? e.message : 'Falha no servidor de impressão'} — usando a impressão do navegador.`)
        }
      }
      const d = document
      const portal = d.createElement('div'); portal.id = 'receipt-print-portal'
      portal.innerHTML = `<style>@media print{@page{size:${w}mm ${h}mm;margin:0}.nutri-label{page-break-after:always;border:none!important}}</style>` + (rootRef.current?.innerHTML || '')
      d.body.appendChild(portal); d.body.classList.add('printing-receipt')
      const cleanup = () => { d.body.classList.remove('printing-receipt'); portal.remove(); window.removeEventListener('afterprint', cleanup) }
      window.addEventListener('afterprint', cleanup)
      setTimeout(() => { window.print(); setTimeout(cleanup, 800) }, 60)
    } finally { setBusy(false) }
  }

  const txt = { fontSize: `${nc?.textoSizePt ?? 7}pt`, fontWeight: nc?.textoBold ? 700 : 400 }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={ref} onValueChange={v => setRef(v as RefKey)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{REFEICOES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setSel(sel.length === pacientes.length ? [] : pacientes.map(p => p.requestId))}>{sel.length === pacientes.length ? 'Desmarcar todos' : 'Marcar todos'}</Button>
        <Button size="sm" disabled={!sel.length || busy} onClick={imprimir}><Printer className="h-4 w-4 mr-1" />Imprimir {sel.length || ''}</Button>
        <span className="text-xs text-muted-foreground">Etiqueta {w}×{h} mm · {nc ? 'Etiqueta de Nutrição configurada (direto na impressora)' : 'Etiqueta de Nutrição não configurada — imprime pelo navegador'}</span>
      </div>
      {semDieta.length > 0 && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{semDieta.length} paciente(s) sem dieta — a impressão fica bloqueada até definir.</p>}
      <div className="grid gap-1 md:grid-cols-2">{pacientes.map(p => (
        <label key={p.requestId} className="flex items-center gap-2 text-sm border rounded p-2">
          <Checkbox checked={sel.includes(p.requestId)} onCheckedChange={v => setSel(v ? [...sel, p.requestId] : sel.filter(x => x !== p.requestId))} />
          {p.nome} · {p.setor} · {p.leito} {!p.dieta && <Badge variant="destructive">Sem dieta</Badge>}
        </label>
      ))}</div>
      <div ref={rootRef} className="flex flex-wrap gap-3">
        {escolhidos.map(p => (
          <div key={p.requestId} className="nutri-label border bg-background text-foreground overflow-hidden" style={{ width: `${w}mm`, height: `${h}mm`, padding: `${nc?.marginMm ?? 1.5}mm`, lineHeight: 1.15, fontFamily: 'sans-serif', ...txt }}>
            <div style={{ fontWeight: (nc?.nomeBold ?? true) ? 700 : 400, fontSize: `${nc?.nomeSizePt ?? 8.5}pt`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome}</div>
            <div>{p.setor} · {p.leito}</div>
            <div><b>{refLabel}</b> · Dieta: <b>{p.dieta || '—'}</b></div>
            {p.obs && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Obs: {p.obs}</div>}
            {p.acompanhante && <div style={{ fontWeight: 700 }}>+ BANDEJA DO ACOMPANHANTE</div>}
            {nc?.barcode && <Barcode value={p.requestId.slice(0, 8).toUpperCase()} height={18} width={1} fontSize={8} margin={0} displayValue={false} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function Dietas({ dietas, companyId, canEdit, reload }: { dietas: Dieta[]; companyId?: string; canEdit: boolean; reload: () => void }) {
  const [nome, setNome] = useState('')
  const add = async () => {
    if (!nome.trim() || !companyId) return
    const { error } = await db.from('nutricao_dieta').insert({ company_id: companyId, nome: nome.trim(), ordem: dietas.length + 1 })
    if (error) return toast.error(error.message.includes('duplicate') ? 'Essa dieta já existe' : error.message)
    setNome(''); reload()
  }
  const toggle = async (d: Dieta) => { const { error } = await db.from('nutricao_dieta').update({ ativo: !d.ativo }).eq('id', d.id); if (error) toast.error(error.message); reload() }
  return (
    <Card><CardContent className="pt-4 space-y-3">
      {canEdit && <div className="flex gap-2 max-w-md"><Input placeholder="Novo tipo de dieta" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /><Button onClick={add}><Plus className="h-4 w-4" /></Button></div>}
      {dietas.map(d => (
        <div key={d.id} className="flex items-center justify-between border-b last:border-0 py-1.5 text-sm max-w-md">
          <span className={d.ativo ? '' : 'text-muted-foreground line-through'}>{d.nome}</span>
          {canEdit && <Button size="sm" variant="ghost" onClick={() => toggle(d)}>{d.ativo ? 'Inativar' : 'Reativar'}</Button>}
        </div>
      ))}
    </CardContent></Card>
  )
}
