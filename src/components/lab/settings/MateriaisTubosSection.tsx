import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { AlertTriangle, Download, Edit2, FileSpreadsheet, Loader2, Plus, Search, TestTube, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { useMateriaisTubos, recarregarTubos, regraAntiga, normMat, type Material, type Recipiente } from '@/lib/tubos'
import { TUBE_TYPES } from '@/types/lab.types'

const db = supabase as any
const POR_PAGINA = 20
const CORES = [
  { nome: 'Amarela', hex: '#FACC15' }, { nome: 'Vermelha', hex: '#DC2626' }, { nome: 'Roxa', hex: '#9333EA' },
  { nome: 'Azul', hex: '#2563EB' }, { nome: 'Cinza', hex: '#9CA3AF' }, { nome: 'Verde', hex: '#16A34A' },
  { nome: 'Preta', hex: '#111827' }, { nome: 'Laranja', hex: '#F97316' }, { nome: 'Branca', hex: '#F8FAFC' },
]

export const Bolinha = ({ hex }: { hex?: string | null }) => (
  <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-border" style={{ backgroundColor: hex || 'transparent' }} />
)

const numOuNulo = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

export function RecipienteSelect({ value, onChange, recipientes, vazio = '— escolher —' }: { value: string; onChange: (v: string) => void; recipientes: Recipiente[]; vazio?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
      <option value="">{vazio}</option>
      {recipientes.filter(r => r.ativo || r.id === value).map(r => <option key={r.id} value={r.id}>{r.nome} ({r.sigla})</option>)}
    </select>
  )
}

export default function MateriaisTubosSection() {
  const { user } = useAuth()
  const cid = user?.companyId
  const cad = useMateriaisTubos(cid)
  const [uso, setUso] = useState<Record<string, number>>({})
  const [aba, setAba] = useState('materiais')
  const [busca, setBusca] = useState('')
  const [pendentes, setPendentes] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [editMat, setEditMat] = useState<Partial<Material> | null>(null)
  const [editRec, setEditRec] = useState<Partial<Recipiente> | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState<{ tipo: 'mat' | 'rec'; item: any; emUso: number } | null>(null)
  const [configurar, setConfigurar] = useState(false)
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const arquivo = useRef<HTMLInputElement>(null)

  const carregarUso = async () => {
    const { data } = await db.rpc('lab_materiais_uso')
    setUso(Object.fromEntries((data ?? []).map((r: any) => [r.material_id, r.exames])))
  }
  useEffect(() => {
    if (!cid) return
    ;(async () => {
      const { count } = await db.from('lab_recipiente').select('id', { count: 'exact', head: true }).eq('company_id', cid)
      if (!count) { await db.rpc('lab_materiais_seed', { _company: cid }); await recarregarTubos(cid) }
      carregarUso()
    })()
  }, [cid])

  const [condicoes, setCondicoes] = useState<{ id: string; nome: string; ativo: boolean }[]>([])
  useEffect(() => { if (cid) db.from('triagem_condicao_transporte').select('id, nome, ativo').eq('company_id', cid).order('ordem').then(({ data }: any) => setCondicoes(data ?? [])) }, [cid])
  const recs = cad.recipientes
  const recDe = (id?: string | null) => recs.find(r => r.id === id)
  const usoRec = (id: string) => cad.materiais.filter(m => m.recipiente_id === id).length
  const semTubo = cad.materiais.filter(m => m.ativo && !m.recipiente_id)

  const listaMat = useMemo(() => cad.materiais
    .filter(m => !pendentes || !m.recipiente_id)
    .filter(m => !busca || normMat(`${m.nome} ${m.sigla ?? ''}`).includes(normMat(busca))), [cad.materiais, pendentes, busca])
  const listaRec = useMemo(() => recs.filter(r => !busca || normMat(`${r.nome} ${r.sigla} ${r.aditivo ?? ''}`).includes(normMat(busca))), [recs, busca])
  const lista: any[] = aba === 'materiais' ? listaMat : listaRec
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const visiveis = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  useEffect(() => setPagina(1), [aba, busca, pendentes])

  const salvarMat = async () => {
    const m = editMat!; const e: Record<string, string> = {}
    if (!m.nome?.trim()) e.nome = 'Informe o nome'
    else if (cad.materiais.some(x => x.id !== m.id && normMat(x.nome) === normMat(m.nome))) e.nome = 'Já existe um material com esse nome'
    if ([m.estab_ambiente_h, m.estab_refrigerado_h, m.estab_congelado_h].some(v => v !== null && v !== undefined && (v as any) !== '' && !(Number(v) > 0))) e.estab = 'Estabilidade deve ser maior que zero (ou vazia)'
    if (!m.recipiente_id && !(m.id && m.legado)) e.recipiente_id = 'Escolha o tubo/recipiente padrão'
    setErros(e); if (Object.keys(e).length) return
    setSalvando(true)
    const row = { company_id: cid, nome: m.nome!.trim(), sigla: m.sigla?.trim() || null, recipiente_id: m.recipiente_id || null, descricao: m.descricao?.trim() || null, condicao_transporte_id: m.condicao_transporte_id || null, estab_ambiente_h: numOuNulo(m.estab_ambiente_h), estab_refrigerado_h: numOuNulo(m.estab_refrigerado_h), estab_congelado_h: numOuNulo(m.estab_congelado_h), ativo: m.ativo ?? true, ordem: m.ordem ?? 0, updated_at: new Date().toISOString() }
    const { error } = m.id ? await db.from('lab_material').update(row).eq('id', m.id) : await db.from('lab_material').insert(row)
    setSalvando(false)
    if (error) return toast.error('Não foi possível salvar o material', { description: 'Confira os campos e tente de novo.' })
    toast.success(m.id ? 'Material atualizado' : 'Material criado')
    setEditMat(null); recarregarTubos(cid); carregarUso()
  }

  const salvarRec = async () => {
    const r = editRec!; const e: Record<string, string> = {}
    if (!r.nome?.trim()) e.nome = 'Informe o nome'
    else if (recs.some(x => x.id !== r.id && normMat(x.nome) === normMat(r.nome))) e.nome = 'Já existe um tubo com esse nome'
    if (!r.sigla?.trim()) e.sigla = 'Informe a sigla da etiqueta'
    if (r.volume_ml != null && (isNaN(Number(r.volume_ml)) || Number(r.volume_ml) < 0)) e.volume_ml = 'Volume inválido'
    setErros(e); if (Object.keys(e).length) return
    setSalvando(true)
    const row = { company_id: cid, nome: r.nome!.trim(), sigla: r.sigla!.trim().toUpperCase(), cor_tampa: r.cor_tampa || null, cor_hex: r.cor_hex || null, aditivo: r.aditivo?.trim() || null, volume_ml: r.volume_ml === null || r.volume_ml === undefined || (r.volume_ml as any) === '' ? null : Number(r.volume_ml), observacao: r.observacao?.trim() || null, ativo: r.ativo ?? true, ordem: r.ordem ?? 0, updated_at: new Date().toISOString() }
    const { error } = r.id ? await db.from('lab_recipiente').update(row).eq('id', r.id) : await db.from('lab_recipiente').insert(row)
    setSalvando(false)
    if (error) return toast.error('Não foi possível salvar o tubo', { description: 'Confira os campos e tente de novo.' })
    toast.success(r.id ? 'Tubo atualizado' : 'Tubo criado')
    setEditRec(null); recarregarTubos(cid)
  }

  const pedirExclusao = (tipo: 'mat' | 'rec', item: any) => setExcluir({ tipo, item, emUso: tipo === 'mat' ? (uso[item.id] ?? 0) : usoRec(item.id) })
  const confirmarExclusao = async (inativar: boolean) => {
    if (!excluir) return
    const tab = excluir.tipo === 'mat' ? 'lab_material' : 'lab_recipiente'
    const { error } = inativar
      ? await db.from(tab).update({ ativo: false }).eq('id', excluir.item.id)
      : await db.from(tab).delete().eq('id', excluir.item.id)
    if (error) toast.error(inativar ? 'Não foi possível inativar' : 'Não foi possível excluir: está em uso. Inative em vez de excluir.')
    else toast.success(inativar ? 'Inativado' : 'Excluído')
    setExcluir(null); recarregarTubos(cid); carregarUso()
  }

  const salvarTubos = async () => {
    const linhas = Object.entries(escolhas).filter(([, v]) => v)
    if (!linhas.length) return toast.error('Escolha o tubo de pelo menos um material')
    setSalvando(true)
    const res = await Promise.all(linhas.map(([id, rec]) => db.from('lab_material').update({ recipiente_id: rec, updated_at: new Date().toISOString() }).eq('id', id)))
    setSalvando(false)
    if (res.some((r: any) => r.error)) toast.error('Alguns tubos não foram salvos')
    else toast.success(`${linhas.length} material(is) com tubo definido`)
    setEscolhas({}); setConfigurar(false); recarregarTubos(cid)
  }

  // ---- Planilha ----
  const exportar = (modelo = false) => {
    const wb = XLSX.utils.book_new()
    const tubos = modelo ? [{ Nome: 'Tubo com gel separador', Sigla: 'GEL', 'Cor da tampa': 'Amarela', Aditivo: 'Ativador de coágulo + gel', 'Volume (mL)': 5, Observação: '' }]
      : recs.map(r => ({ Nome: r.nome, Sigla: r.sigla, 'Cor da tampa': r.cor_tampa ?? '', Aditivo: r.aditivo ?? '', 'Volume (mL)': r.volume_ml ?? '', Observação: r.observacao ?? '', Ativo: r.ativo ? 'Sim' : 'Não' }))
    const mats = modelo ? [{ Nome: 'Soro', Sigla: 'SOR', 'Tubo (sigla)': 'GEL', Descrição: '' }]
      : cad.materiais.map(m => ({ Nome: m.nome, Sigla: m.sigla ?? '', 'Tubo (sigla)': recDe(m.recipiente_id)?.sigla ?? '', Descrição: m.descricao ?? '', Ativo: m.ativo ? 'Sim' : 'Não' }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tubos), 'Tubos e Frascos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mats), 'Materiais')
    XLSX.writeFile(wb, modelo ? 'modelo_materiais_tubos.xlsx' : 'materiais_tubos.xlsx')
  }
  const importar = async (f: File) => {
    try {
      const wb = XLSX.read(await f.arrayBuffer())
      const tubos: any[] = wb.Sheets['Tubos e Frascos'] ? XLSX.utils.sheet_to_json(wb.Sheets['Tubos e Frascos']) : []
      const mats: any[] = wb.Sheets['Materiais'] ? XLSX.utils.sheet_to_json(wb.Sheets['Materiais']) : []
      let n = 0
      for (const t of tubos) {
        if (!t.Nome || !t.Sigla) continue
        const ex = recs.find(r => normMat(r.nome) === normMat(t.Nome))
        const cor = CORES.find(c => normMat(c.nome) === normMat(t['Cor da tampa']))
        const row = { company_id: cid, nome: String(t.Nome).trim(), sigla: String(t.Sigla).trim().toUpperCase(), cor_tampa: t['Cor da tampa'] || null, cor_hex: cor?.hex ?? null, aditivo: t.Aditivo || null, volume_ml: t['Volume (mL)'] === '' || t['Volume (mL)'] == null ? null : Number(t['Volume (mL)']), observacao: t['Observação'] || null }
        const { error } = ex ? await db.from('lab_recipiente').update(row).eq('id', ex.id) : await db.from('lab_recipiente').insert(row)
        if (!error) n++
      }
      await recarregarTubos(cid)
      const { data: recsNovos } = await db.from('lab_recipiente').select('id, sigla').eq('company_id', cid)
      for (const m of mats) {
        if (!m.Nome) continue
        const rec = (recsNovos ?? []).find((r: any) => normMat(r.sigla) === normMat(m['Tubo (sigla)']))
        const ex = cad.materiais.find(x => normMat(x.nome) === normMat(m.Nome))
        const row: any = { company_id: cid, nome: String(m.Nome).trim(), sigla: m.Sigla || null, descricao: m['Descrição'] || null }
        if (rec) row.recipiente_id = rec.id
        const { error } = ex ? await db.from('lab_material').update(row).eq('id', ex.id) : await db.from('lab_material').insert(row)
        if (!error) n++
      }
      toast.success(`${n} linha(s) importada(s)`)
      recarregarTubos(cid); carregarUso()
    } catch { toast.error('Não foi possível ler a planilha', { description: 'Use o botão Modelo para ver o formato.' }) }
  }

  const sugestao = (m: Material) => {
    const t = regraAntiga(m.nome)
    return t ? TUBE_TYPES.find(x => x.type === t)?.label ?? '—' : 'nenhum (hoje sairia gel por padrão)'
  }

  if (!cad.carregado) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>

  const Erro = ({ k }: { k: string }) => (erros[k] ? <p className="text-xs text-destructive">{erros[k]}</p> : null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold"><TestTube className="h-5 w-5 text-primary" />Materiais e Tubos</h3>
          <p className="text-sm text-muted-foreground">O tubo de cada material define o que sai na etiqueta de coleta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportar(true)}><FileSpreadsheet className="mr-1 h-4 w-4" />Modelo</Button>
          <Button variant="outline" size="sm" onClick={() => arquivo.current?.click()}><Upload className="mr-1 h-4 w-4" />Importar Planilha</Button>
          <Button variant="outline" size="sm" onClick={() => exportar()}><Download className="mr-1 h-4 w-4" />Exportar</Button>
          <input ref={arquivo} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
        </div>
      </div>

      {semTubo.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />{semTubo.length} materiais sem tubo.</p>
          <Button size="sm" onClick={() => { setEscolhas({}); setConfigurar(true) }}>Configurar agora</Button>
        </div>
      )}

      <Tabs value={aba} onValueChange={setAba}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="materiais">Materiais ({cad.materiais.length})</TabsTrigger>
            <TabsTrigger value="tubos">Tubos e Frascos ({recs.length})</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" className="h-9 w-56 pl-8" /></div>
            {aba === 'materiais' && <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={pendentes} onChange={e => setPendentes(e.target.checked)} />Recipiente: definir</label>}
            <Button size="sm" onClick={() => { setErros({}); aba === 'materiais' ? setEditMat({ ativo: true }) : setEditRec({ ativo: true }) }}><Plus className="mr-1 h-4 w-4" />Novo</Button>
          </div>
        </div>

        <TabsContent value="materiais">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Nome</th><th className="p-2">Sigla</th><th className="p-2">Recipiente padrão</th><th className="p-2">Exames</th><th className="p-2">Ativo</th><th className="p-2" /></tr></thead>
              <tbody>
                {visiveis.map((m: Material) => { const r = recDe(m.recipiente_id); return (
                  <tr key={m.id} className={`border-t border-border ${m.ativo ? '' : 'opacity-50'}`}>
                    <td className="p-2 font-medium">{m.nome}</td><td className="p-2">{m.sigla || '—'}</td>
                    <td className="p-2">{r ? <span className="flex items-center gap-2"><Bolinha hex={r.cor_hex} />{r.nome} ({r.sigla})</span> : <span className="font-semibold text-warning">Recipiente: definir</span>}</td>
                    <td className="p-2">{uso[m.id] ?? 0}</td><td className="p-2">{m.ativo ? 'Sim' : 'Não'}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => { setErros({}); setEditMat(m) }} aria-label="Editar"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => pedirExclusao('mat', m)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>) })}
                {!visiveis.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum material encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="tubos">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Nome</th><th className="p-2">Sigla</th><th className="p-2">Cor</th><th className="p-2">Aditivo</th><th className="p-2">Volume</th><th className="p-2">Materiais</th><th className="p-2" /></tr></thead>
              <tbody>
                {visiveis.map((r: Recipiente) => (
                  <tr key={r.id} className={`border-t border-border ${r.ativo ? '' : 'opacity-50'}`}>
                    <td className="p-2 font-medium">{r.nome}</td><td className="p-2 font-mono">{r.sigla}</td>
                    <td className="p-2"><span className="flex items-center gap-2"><Bolinha hex={r.cor_hex} />{r.cor_tampa || '—'}</span></td>
                    <td className="p-2">{r.aditivo || '—'}</td><td className="p-2">{r.volume_ml != null ? `${r.volume_ml} mL` : '—'}</td><td className="p-2">{usoRec(r.id)}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => { setErros({}); setEditRec(r) }} aria-label="Editar"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => pedirExclusao('rec', r)} aria-label="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>))}
                {!visiveis.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum tubo encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
        {paginas > 1 && (
          <div className="mt-2 flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
            <span>{pagina} de {paginas}</span>
            <Button variant="outline" size="sm" disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </Tabs>

      {/* Material */}
      <Dialog open={!!editMat} onOpenChange={o => !o && setEditMat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editMat?.id ? 'Editar material' : 'Novo material'}</DialogTitle></DialogHeader>
          {editMat && <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={editMat.nome ?? ''} onChange={e => setEditMat({ ...editMat, nome: e.target.value })} placeholder="Ex.: Soro" /><Erro k="nome" /></div>
            <div><Label>Sigla</Label><Input value={editMat.sigla ?? ''} onChange={e => setEditMat({ ...editMat, sigla: e.target.value })} /></div>
            <div><Label>Recipiente padrão *</Label><RecipienteSelect value={editMat.recipiente_id ?? ''} onChange={v => setEditMat({ ...editMat, recipiente_id: v || null })} recipientes={recs} vazio="Recipiente: definir" /><Erro k="recipiente_id" /></div>
            <div><Label>Descrição</Label><Input value={editMat.descricao ?? ''} onChange={e => setEditMat({ ...editMat, descricao: e.target.value })} /></div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transporte e estabilidade</p>
              <div><Label>Condição de transporte padrão</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={editMat.condicao_transporte_id ?? ''} onChange={e => setEditMat({ ...editMat, condicao_transporte_id: e.target.value || null })}>
                  <option value="">Não definida</option>
                  {condicoes.filter(c => c.ativo || c.id === editMat.condicao_transporte_id).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([['estab_ambiente_h', 'Ambiente (h)'], ['estab_refrigerado_h', 'Refrigerado (h)'], ['estab_congelado_h', 'Congelado (h)']] as const).map(([k, l]) => (
                  <div key={k}><Label className="text-xs">{l}</Label><Input type="number" min={0} step="0.5" placeholder="não se aplica" value={(editMat as any)[k] ?? ''} onChange={e => setEditMat({ ...editMat, [k]: e.target.value === '' ? null : Number(e.target.value) })} /></div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Defina conforme a bula do fabricante / POP; o sistema avisa quando a amostra se aproximar do limite. Vazio = não se aplica.</p>
              <Erro k="estab" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editMat.ativo ?? true} onChange={e => setEditMat({ ...editMat, ativo: e.target.checked })} />Ativo</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditMat(null)}>Cancelar</Button><Button onClick={salvarMat} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tubo */}
      <Dialog open={!!editRec} onOpenChange={o => !o && setEditRec(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRec?.id ? 'Editar tubo/frasco' : 'Novo tubo/frasco'}</DialogTitle></DialogHeader>
          {editRec && <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={editRec.nome ?? ''} onChange={e => setEditRec({ ...editRec, nome: e.target.value })} placeholder="Ex.: Tubo com gel separador" /><Erro k="nome" /></div>
            <div><Label>Sigla na etiqueta *</Label><Input value={editRec.sigla ?? ''} onChange={e => setEditRec({ ...editRec, sigla: e.target.value })} placeholder="GEL" /><Erro k="sigla" /></div>
            <div><Label>Cor da tampa</Label>
              <div className="flex items-center gap-2">
                <select value={editRec.cor_tampa ?? ''} onChange={e => { const c = CORES.find(x => x.nome === e.target.value); setEditRec({ ...editRec, cor_tampa: e.target.value || null, cor_hex: c?.hex ?? editRec.cor_hex ?? null }) }} className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">—</option>{CORES.map(c => <option key={c.nome}>{c.nome}</option>)}
                </select>
                <input type="color" value={editRec.cor_hex || '#ffffff'} onChange={e => setEditRec({ ...editRec, cor_hex: e.target.value })} className="h-9 w-10 rounded border border-input" aria-label="Cor" />
              </div>
            </div>
            <div><Label>Aditivo/conservante</Label><Input value={editRec.aditivo ?? ''} onChange={e => setEditRec({ ...editRec, aditivo: e.target.value })} /></div>
            <div><Label>Volume padrão (mL)</Label><Input type="number" min={0} value={editRec.volume_ml ?? ''} onChange={e => setEditRec({ ...editRec, volume_ml: e.target.value === '' ? null : Number(e.target.value) })} /><Erro k="volume_ml" /></div>
            <div className="col-span-2"><Label>Observação de coleta</Label><Input value={editRec.observacao ?? ''} onChange={e => setEditRec({ ...editRec, observacao: e.target.value })} /></div>
            <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={editRec.ativo ?? true} onChange={e => setEditRec({ ...editRec, ativo: e.target.checked })} />Ativo</label>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEditRec(null)}>Cancelar</Button><Button onClick={salvarRec} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir */}
      <Dialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Excluir {excluir?.item?.nome}?</DialogTitle>
            <DialogDescription>{excluir?.emUso ? `Não dá para excluir: está em uso por ${excluir.emUso} ${excluir.tipo === 'mat' ? 'exame(s)' : 'material(is)'}. Você pode inativar.` : 'Esta ação não pode ser desfeita.'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluir(null)}>Cancelar</Button>
            <Button variant="outline" onClick={() => confirmarExclusao(true)}>Inativar</Button>
            {!excluir?.emUso && <Button variant="destructive" onClick={() => confirmarExclusao(false)}>Excluir</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configurar tubos */}
      <Dialog open={configurar} onOpenChange={setConfigurar}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Configurar tubos</DialogTitle>
            <DialogDescription>Escolha o tubo de cada material. Só as linhas preenchidas são salvas. A sugestão é o tubo que a etiqueta usa hoje.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Material</th><th className="p-2">Exames</th><th className="p-2 w-64">Tubo</th><th className="p-2">Sugestão</th></tr></thead>
              <tbody>{semTubo.map(m => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-2 font-medium">{m.nome}</td><td className="p-2">{uso[m.id] ?? 0}</td>
                  <td className="p-2"><RecipienteSelect value={escolhas[m.id] ?? ''} onChange={v => setEscolhas(s => ({ ...s, [m.id]: v }))} recipientes={recs} /></td>
                  <td className="p-2 text-muted-foreground">{sugestao(m)}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setConfigurar(false)}>Fechar</Button><Button onClick={salvarTubos} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar tubos</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
