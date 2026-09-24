import { materialPorNome, useMateriaisTubos } from '@/lib/tubos'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boxes, History, ListChecks, Loader2, MoreHorizontal, Pencil, Plus, Power, Search, Trash2, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/feedback/EmptyState'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApoioEntitlement, useApoioPermissions } from '@/hooks/useApoio'
import { brl, db, norm, type ExameLis } from './deparaUtils'
import { ApoioDeparaDrawer, type DeparaRow } from './ApoioDeparaDrawer'
import { ApoioAnalitosSheet } from './ApoioAnalitosSheet'
import { ApoioLoteDialog } from './ApoioLoteDialog'
import { CadastrarPardiniDialog } from './CadastrarPardiniDialog'

type Falta = 'orientacoes' | 'critico' | 'preco' | 'tuss' | 'tubo'
const FALTA_LABEL: Record<Falta, string> = { orientacoes: 'Orientações ao paciente', critico: 'Valor crítico', preco: 'Preço real', tuss: 'TUSS', tubo: 'Tubo' }
const faltas = (e: any, d: { ficticio: boolean; tem_preco: boolean }): Falta[] => {
  const f: Falta[] = []
  if (!String(e.preparation_instructions || '').trim()) f.push('orientacoes')
  f.push('critico')
  if (!d.tem_preco || d.ficticio) f.push('preco')
  if (!String(e.tuss_code || '').trim()) f.push('tuss')
  const mats: string[] = Array.isArray(e.selected_materials) ? e.selected_materials : []
  if (mats.some(m => { const x = materialPorNome(m); return !x || !x.recipiente_id })) f.push('tubo')
  return f
}

interface Lista extends DeparaRow {
  apoio_nome: string; descricao_apoio: string | null; catalogo_ativo: boolean; tem_preco: boolean; preco: number | null; ficticio: boolean
  prazo_dias: number | null; analitos_total: number; analitos_mapeados: number; modelo_mudou: boolean
}
type Sit = 'sem_preco' | 'modelo_mudou' | 'desativado' | 'incompleto'
const SIT_LABEL: Record<Sit, string> = { sem_preco: 'Sem preço', modelo_mudou: 'Modelo do apoio mudou', desativado: 'Desativado no apoio', incompleto: 'Incompleto' }
const situacoes = (d: Lista): Sit[] => {
  if (!d.ativo) return []
  const s: Sit[] = []
  if (!d.tem_preco) s.push('sem_preco')
  if (d.modelo_mudou) s.push('modelo_mudou')
  if (!d.catalogo_ativo) s.push('desativado')
  if (d.analitos_total === 0 || d.analitos_mapeados < d.analitos_total) s.push('incompleto')
  return s
}

export function ApoioExamesTab({ moduloLiberado }: { moduloLiberado: boolean }) {
  const { companyId } = useApoioEntitlement()
  const cadTubos = useMateriaisTubos(companyId)
  const { has } = useApoioPermissions()
  const pode = has('apoio.depara.gerenciar') && moduloLiberado
  const [sp, setSp] = useSearchParams()
  const filtro = (sp.get('filtro') || 'terceirizados') as 'terceirizados' | 'nao' | 'todos'
  const fApoio = sp.get('apoio') || '', fSit = (sp.get('situacao') || '') as Sit | 'alerta' | '', fSetor = sp.get('setor') || '', fFalta = (sp.get('falta') || '') as Falta | '', q = sp.get('q') || ''
  const setP = (k: string, v: string) => setSp(p => { if (v) p.set(k, v); else p.delete(k); return p }, { replace: true })

  const [loading, setLoading] = useState(true)
  const [exames, setExames] = useState<ExameLis[]>([])
  const [setores, setSetores] = useState<Record<string, string>>({})
  const [apoios, setApoios] = useState<{ id: string; nome: string }[]>([])
  const [lista, setLista] = useState<Lista[]>([])
  const [drawer, setDrawer] = useState<{ open: boolean; depara: DeparaRow | null; exame: string | null }>({ open: false, depara: null, exame: null })
  const [analitos, setAnalitos] = useState<{ id: string; nome: string } | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [lote, setLote] = useState(false)
  const [cadPardini, setCadPardini] = useState(false)
  const [hist, setHist] = useState<{ d: Lista; rows: any[] | null } | null>(null)
  const [excluir, setExcluir] = useState<{ d: Lista; envios: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [ex, wb, ap, li] = await Promise.all([
      db.from('exams').select('id, internal_code, name, workbench_id, default_material, selected_materials, preparation_instructions, tuss_code').eq('type', 'lab').eq('is_active', true).order('name').limit(5000),
      db.from('lab_workbenches').select('id, name'),
      db.from('apoio_laboratorio').select('id, nome').eq('ativo', true).order('nome'),
      db.rpc('apoio_depara_lista'),
    ])
    if (li.error) toast.error('Erro ao carregar exames terceirizados')
    setExames(ex.data || [])
    setSetores(Object.fromEntries((wb.data || []).map((w: any) => [w.id, w.name])))
    setApoios(ap.data || [])
    setLista(li.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const exMap = useMemo(() => new Map(exames.map(e => [e.id, e])), [exames])
  const porExame = useMemo(() => {
    const m = new Map<string, Lista[]>()
    for (const d of lista) m.set(d.exame_id, [...(m.get(d.exame_id) || []), d])
    return m
  }, [lista])
  const terceirizado = (id: string) => (porExame.get(id) || []).some(d => d.ativo)

  const ativos = lista.filter(d => d.ativo && exMap.has(d.exame_id))
  const cards = {
    total: new Set(ativos.map(d => d.exame_id)).size,
    incompleto: ativos.filter(d => situacoes(d).includes('incompleto')).length,
    sem_preco: ativos.filter(d => !d.tem_preco).length,
    alerta: ativos.filter(d => d.modelo_mudou || !d.catalogo_ativo).length,
  }

  const linhas = useMemo(() => {
    const qn = norm(q)
    type L = { exame: ExameLis; d: Lista | null }
    const out: L[] = []
    for (const e of exames) {
      const ds = porExame.get(e.id) || []
      const t = ds.some(d => d.ativo)
      if (filtro === 'terceirizados' && !t) continue
      if (filtro === 'nao' && t) continue
      if (fSetor && e.workbench_id !== fSetor) continue
      const alvo = filtro === 'nao' ? [] : (filtro === 'terceirizados' ? ds.filter(d => d.ativo) : ds)
      const rows: L[] = alvo.length ? alvo.map(d => ({ exame: e, d })) : [{ exame: e, d: null }]
      for (const r of rows) {
        if (fApoio && r.d?.apoio_id !== fApoio) continue
        if (fSit) {
          if (!r.d) continue
          const s = situacoes(r.d)
          if (fSit === 'alerta' ? !(s.includes('modelo_mudou') || s.includes('desativado')) : !s.includes(fSit)) continue
        }
        if (fFalta && (!r.d || !faltas(e, r.d).includes(fFalta))) continue
        if (qn && !(norm(e.name).includes(qn) || norm(e.internal_code || '').includes(qn) || (r.d?.codigo_apoio || '').toUpperCase().includes(q.trim().toUpperCase()))) continue
        out.push(r)
      }
    }
    return out
  }, [exames, porExame, filtro, fApoio, fSit, fSetor, fFalta, q, cadTubos])

  const [limite, setLimite] = useState(50)
  useEffect(() => setLimite(50), [filtro, fApoio, fSit, fSetor, fFalta, q])

  const alternarAtivo = async (d: Lista) => {
    const { error } = await db.from('apoio_depara_exame').update({ ativo: !d.ativo }).eq('id', d.id)
    if (error) return toast.error('Não foi possível alterar', { description: error.message })
    toast.success(d.ativo ? 'Terceirização inativada: o exame volta a ser interno. Pedidos já enviados não mudam.' : 'Terceirização reativada')
    load()
  }
  const pedirExclusao = async (d: Lista) => {
    const { data } = await db.rpc('apoio_depara_envios', { _ids: [d.id] })
    setExcluir({ d, envios: Number(data?.[0]?.envios || 0) })
  }
  const confirmarExclusao = async () => {
    if (!excluir) return
    const { error } = await db.from('apoio_depara_exame').delete().eq('id', excluir.d.id)
    if (error) toast.error('Não foi possível excluir', { description: error.message })
    else { toast.success('Terceirização excluída'); load() }
    setExcluir(null)
  }
  const verHistorico = async (d: Lista) => {
    setHist({ d, rows: null })
    const { data, error } = await db.from('apoio_preco').select('preco, prazo_dias, vigencia_inicio, vigencia_fim, ficticio').eq('apoio_id', d.apoio_id).eq('codigo', d.codigo_apoio).order('vigencia_inicio', { ascending: false })
    setHist({ d, rows: error ? [] : data || [] })
  }

  const Card = ({ k, t, n, icon }: { k: string; t: string; n: number; icon: React.ReactNode }) => (
    <button onClick={() => { setP('filtro', 'terceirizados'); setP('situacao', k === 'total' ? '' : k) }}
      className={`flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:shadow-md ${(fSit || 'total') === k ? 'border-primary' : 'border-border'}`}>
      <div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div>
      <div><p className="text-xs text-muted-foreground">{t}</p><p className="text-2xl font-bold">{n}</p></div>
    </button>
  )
  const selecionados = exames.filter(e => sel.has(e.id))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card k="total" t="Exames terceirizados" n={cards.total} icon={<Boxes className="h-5 w-5" />} />
        <Card k="incompleto" t="Incompletos" n={cards.incompleto} icon={<ListChecks className="h-5 w-5" />} />
        <Card k="sem_preco" t="Sem preço" n={cards.sem_preco} icon={<FlaskConical className="h-5 w-5" />} />
        <Card k="alerta" t="Com alerta" n={cards.alerta} icon={<History className="h-5 w-5" />} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setP('q', e.target.value)} placeholder="Buscar por nosso exame ou código do apoio" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={filtro} onChange={e => { setP('filtro', e.target.value); setSel(new Set()) }} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="terceirizados">Terceirizados</option><option value="nao">Não terceirizados</option><option value="todos">Todos</option>
        </select>
        <select value={fApoio} onChange={e => setP('apoio', e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todos os apoios</option>{apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <select value={fSit} onChange={e => setP('situacao', e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todas as situações</option>{(Object.keys(SIT_LABEL) as Sit[]).map(s => <option key={s} value={s}>{SIT_LABEL[s]}</option>)}<option value="alerta">Com alerta</option>
        </select>
        <select value={fSetor} onChange={e => setP('setor', e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todos os setores</option>{Object.entries(setores).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
        <select value={fFalta} onChange={e => setP('falta', e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Falta preencher: todos</option>{(Object.keys(FALTA_LABEL) as Falta[]).map(k => <option key={k} value={k}>{FALTA_LABEL[k]}</option>)}
        </select>
        <button disabled={!pode || apoios.length === 0} onClick={() => setCadPardini(true)} className="whitespace-nowrap rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50">Cadastrar exame do Pardini no LIS</button>
        {filtro === 'nao' && sel.size > 0 && <button disabled={!pode} onClick={() => setLote(true)} className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">Terceirizar vários ({sel.size})</button>}
        <button disabled={!pode || apoios.length === 0} onClick={() => setDrawer({ open: true, depara: null, exame: null })} className="gradient-bg flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-50"><Plus className="h-4 w-4" />Terceirizar exame</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : linhas.length === 0 ? (
          <EmptyState icon={<Boxes className="h-10 w-10" />} title={filtro === 'terceirizados' && !q && !fSit ? 'Nenhum exame terceirizado ainda' : 'Nenhum exame encontrado'}
            description={apoios.length === 0 ? 'Cadastre um laboratório de apoio na aba Laboratórios primeiro.' : filtro === 'terceirizados' ? 'Use "Terceirizar exame" ou o filtro "Não terceirizados" para escolher exames do catálogo.' : 'Ajuste a busca ou os filtros.'} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                {filtro === 'nao' && <th className="px-3 py-3"><input type="checkbox" className="accent-primary" checked={linhas.length > 0 && linhas.every(l => sel.has(l.exame.id))} onChange={e => setSel(e.target.checked ? new Set(linhas.map(l => l.exame.id)) : new Set())} /></th>}
                <th className="px-3 py-3">Nosso exame</th><th className="px-3 py-3">Setor</th><th className="px-3 py-3">Apoio</th><th className="px-3 py-3">Código no apoio</th>
                <th className="px-3 py-3">Descrição no apoio</th><th className="px-3 py-3">Preço vigente</th><th className="px-3 py-3">Prazo</th><th className="px-3 py-3">Analitos</th>
                <th className="px-3 py-3">PDF</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3">Falta preencher</th><th className="px-3 py-3">Ativo</th><th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {linhas.slice(0, limite).map(({ exame: e, d }) => {
                const outros = (porExame.get(e.id) || []).filter(x => x.id !== d?.id && x.ativo).length
                return (
                  <tr key={e.id + (d?.id || '')} className="border-t border-border hover:bg-muted/30">
                    {filtro === 'nao' && <td className="px-3 py-2"><input type="checkbox" className="accent-primary" checked={sel.has(e.id)} onChange={ev => setSel(s => { const n = new Set(s); ev.target.checked ? n.add(e.id) : n.delete(e.id); return n })} /></td>}
                    <td className="px-3 py-2"><b className="text-xs">{e.internal_code || '—'}</b> <span>{e.name}</span></td>
                    <td className="px-3 py-2 text-xs">{(e.workbench_id && setores[e.workbench_id]) || '—'}</td>
                    {d ? (<>
                      <td className="px-3 py-2 text-xs">{d.apoio_nome}{outros > 0 && <span className="ml-1 text-muted-foreground">+{outros}</span>}</td>
                      <td className="px-3 py-2 font-mono text-xs">{d.codigo_apoio}</td>
                      <td className="px-3 py-2 text-xs">{d.descricao_apoio || '—'}</td>
                      <td className="px-3 py-2 text-xs">{d.tem_preco ? <>{d.preco != null ? brl(d.preco) : '•••'}{d.ficticio && <Badge className="ml-1 bg-warning text-warning-foreground text-[10px]">fictício</Badge>}</> : <span className="text-warning">—</span>}</td>
                      <td className="px-3 py-2 text-xs">{d.prazo_dias != null ? `${d.prazo_dias} d` : '—'}</td>
                      <td className="px-3 py-2 text-xs"><button onClick={() => setAnalitos({ id: d.id, nome: e.name })} className={`font-semibold hover:underline ${d.analitos_total === 0 || d.analitos_mapeados < d.analitos_total ? 'text-destructive' : 'text-success'}`}>{d.analitos_mapeados}/{d.analitos_total}</button></td>
                      <td className="px-3 py-2 text-xs">{d.exige_pdf ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{situacoes(d).map(s => <Badge key={s} variant={s === 'sem_preco' ? 'outline' : 'destructive'} className={`text-[10px] ${s === 'sem_preco' ? 'border-warning text-warning' : ''}`}>{SIT_LABEL[s]}</Badge>)}</div></td>
                      <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{faltas(e, d).map(f => <Badge key={f} variant="outline" className="cursor-pointer text-[10px]" onClick={() => setP('falta', f)}>{FALTA_LABEL[f]}</Badge>)}</div></td>
                      <td className="px-3 py-2 text-xs">{d.ativo ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label="Ações"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDrawer({ open: true, depara: d, exame: e.id })}><Pencil className="mr-2 h-4 w-4" />{pode ? 'Editar' : 'Ver detalhes'}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAnalitos({ id: d.id, nome: e.name })}><ListChecks className="mr-2 h-4 w-4" />De/Para de analitos</DropdownMenuItem>
                            <DropdownMenuItem disabled={!pode} onClick={() => setDrawer({ open: true, depara: null, exame: e.id })}><Plus className="mr-2 h-4 w-4" />Adicionar outro apoio</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => verHistorico(d)}><History className="mr-2 h-4 w-4" />Ver histórico de preço</DropdownMenuItem>
                            <DropdownMenuItem disabled={!pode} onClick={() => alternarAtivo(d)}><Power className="mr-2 h-4 w-4" />{d.ativo ? 'Inativar terceirização' : 'Reativar terceirização'}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={!pode} onClick={() => pedirExclusao(d)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </>) : (<>
                      <td colSpan={10} className="px-3 py-2 text-xs text-muted-foreground">Interno {terceirizado(e.id) ? '' : '· não terceirizado'}</td>
                      <td className="px-3 py-2 text-right"><button disabled={!pode || apoios.length === 0} onClick={() => setDrawer({ open: true, depara: null, exame: e.id })} className="text-xs font-medium text-primary hover:underline disabled:opacity-50">Terceirizar</button></td>
                    </>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {linhas.length > limite && (
          <div className="flex justify-center gap-2 border-t border-border p-3 text-sm">
            <button onClick={() => setLimite(l => l + 50)} className="rounded-lg border border-border px-4 py-1.5">Mostrar mais</button>
            <button onClick={() => setLimite(linhas.length)} className="rounded-lg border border-border px-4 py-1.5">Mostrar todos ({linhas.length})</button>
          </div>
        )}
      </div>

      <ApoioDeparaDrawer open={drawer.open} depara={drawer.depara} exameInicial={drawer.exame} exames={exames} apoios={apoios} deparas={lista} companyId={companyId} readOnly={!pode}
        onClose={() => setDrawer({ open: false, depara: null, exame: null })}
        onSaved={id => { const nome = exMap.get(drawer.exame || '')?.name || lista.find(l => l.id === id) && exMap.get(lista.find(l => l.id === id)!.exame_id)?.name || 'Exame'; setDrawer({ open: false, depara: null, exame: null }); load().then(() => setAnalitos({ id, nome })) }} />
      <ApoioAnalitosSheet deparaId={analitos?.id || null} exameNome={analitos?.nome || ''} readOnly={!pode} onClose={() => setAnalitos(null)} onChanged={load} />
      <CadastrarPardiniDialog open={cadPardini} apoios={apoios} companyId={companyId} onClose={() => { setCadPardini(false); load() }} />
      <ApoioLoteDialog open={lote} exames={selecionados} apoios={apoios} companyId={companyId} onClose={() => setLote(false)} onSaved={() => { setSel(new Set()); load() }} />

      <Dialog open={!!hist} onOpenChange={o => !o && setHist(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Histórico de preço — {hist?.d.codigo_apoio}</DialogTitle></DialogHeader>
          {!hist?.rows ? <Loader2 className="h-5 w-5 animate-spin" /> : hist.rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum preço registrado (ou você não tem permissão para ver custos).</p> : (
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground"><tr><th className="py-1">Vigência</th><th>Preço</th><th>Prazo</th></tr></thead>
              <tbody>{hist.rows.map((r, i) => (
                <tr key={i} className="border-t border-border"><td className="py-1.5">{r.vigencia_inicio.split('-').reverse().join('/')} → {r.vigencia_fim ? r.vigencia_fim.split('-').reverse().join('/') : 'atual'}</td><td>{brl(r.preco)} {r.ficticio && <Badge className="bg-warning text-warning-foreground text-[10px]">fictício</Badge>}</td><td>{r.prazo_dias ?? '—'}</td></tr>
              ))}</tbody>
            </table>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{excluir?.envios ? 'Não é possível excluir' : 'Excluir terceirização?'}</AlertDialogTitle>
            <AlertDialogDescription>{excluir?.envios ? `Esta terceirização já foi usada em ${excluir.envios} envio(s). Inative em vez de excluir.` : 'O De/Para de analitos deste exame também será apagado.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {excluir?.envios
              ? (excluir.d.ativo && <AlertDialogAction onClick={() => { alternarAtivo(excluir.d); setExcluir(null) }}>Inativar</AlertDialogAction>)
              : <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
