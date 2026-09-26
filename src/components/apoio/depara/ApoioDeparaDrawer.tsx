import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { brl, carregarCatalogo, db, exigePdfSugerido, norm, sugerir, type CatItem, type ExameLis } from './deparaUtils'

export interface DeparaRow { id: string; exame_id: string; apoio_id: string; codigo_apoio: string; exige_pdf: boolean; ativo: boolean; conservacao?: string | null }

export function ApoioDeparaDrawer({ open, depara, exameInicial, exames, apoios, deparas, companyId, readOnly, onClose, onSaved }: {
  open: boolean; depara: DeparaRow | null; exameInicial: string | null; exames: ExameLis[]; apoios: { id: string; nome: string }[]
  deparas: DeparaRow[]; companyId: string; readOnly: boolean; onClose: () => void; onSaved: (id: string) => void
}) {
  const [exameId, setExameId] = useState('')
  const [buscaEx, setBuscaEx] = useState('')
  const [apoioId, setApoioId] = useState('')
  const [cat, setCat] = useState<CatItem[] | null>(null)
  const [catLoading, setCatLoading] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [buscaCat, setBuscaCat] = useState('')
  const [exigePdf, setExigePdf] = useState(false)
  const [conservacao, setConservacao] = useState('nao_informado')
  const [ref, setRef] = useState<{ tem_preco: boolean; preco: number | null; ficticio: boolean; prazo_dias: number | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEditId(depara?.id || null)
    setExameId(depara?.exame_id || exameInicial || '')
    setApoioId(depara?.apoio_id || (apoios.length === 1 ? apoios[0].id : ''))
    setCodigo(depara?.codigo_apoio || '')
    setExigePdf(depara?.exige_pdf || false)
    setConservacao(depara?.conservacao || 'nao_informado')
    setBuscaEx(''); setBuscaCat(''); setRef(null)
  }, [open, depara, exameInicial, apoios])

  // Se o exame escolhido já for terceirizado com este apoio, abre em edição
  useEffect(() => {
    if (!open || depara || !exameId || !apoioId) return
    const ex = deparas.find(d => d.exame_id === exameId && d.apoio_id === apoioId)
    if (ex && ex.id !== editId) { setEditId(ex.id); setCodigo(ex.codigo_apoio); setExigePdf(ex.exige_pdf); setConservacao(ex.conservacao || 'nao_informado'); toast.info('Este exame já é terceirizado com este apoio: abrindo em edição') }
    if (!ex && editId && !depara) { setEditId(null) }
  }, [exameId, apoioId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!apoioId) { setCat(null); return }
    setCatLoading(true)
    carregarCatalogo(apoioId).then(setCat).catch(() => toast.error('Erro ao carregar a referência do apoio')).finally(() => setCatLoading(false))
  }, [apoioId])

  const exame = exames.find(e => e.id === exameId) || null
  const sugestoes = useMemo(() => (exame && cat ? sugerir(exame, cat) : []), [exame, cat])

  // Pré-sugestão (o usuário confirma)
  useEffect(() => {
    if (!codigo && sugestoes[0] && !editId) {
      setCodigo(sugestoes[0].item.codigo)
      setExigePdf(exigePdfSugerido(sugestoes[0].item.descricao))
    }
  }, [sugestoes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!apoioId || !codigo) { setRef(null); return }
    db.rpc('apoio_depara_referencia', { _apoio_id: apoioId, _codigo: codigo }).then(({ data }: any) => setRef(data))
  }, [apoioId, codigo])

  const selecionado = cat?.find(c => c.codigo === codigo) || null
  const resultadosCat = useMemo(() => {
    if (!cat || !buscaCat.trim()) return []
    const q = norm(buscaCat)
    return cat.filter(c => c.codigo.toUpperCase().includes(buscaCat.trim().toUpperCase()) || norm(c.descricao).includes(q)).slice(0, 30)
  }, [cat, buscaCat])
  const resultadosEx = useMemo(() => {
    const q = norm(buscaEx)
    if (!q) return []
    return exames.filter(e => norm(e.name).includes(q) || norm(e.internal_code || '').includes(q)).slice(0, 20)
  }, [exames, buscaEx])

  const escolher = (c: CatItem) => { setCodigo(c.codigo); setBuscaCat(''); if (exigePdfSugerido(c.descricao)) setExigePdf(true) }

  const salvar = async () => {
    if (!exameId) return toast.error('Escolha o nosso exame')
    if (!apoioId) return toast.error('Escolha o apoio')
    if (!codigo) return toast.error('Escolha o exame no apoio')
    setSaving(true)
    try {
      let id = editId
      const payload = { codigo_apoio: codigo, exige_pdf: exigePdf, conservacao, ativo: true }
      if (id) {
        const antigo = deparas.find(d => d.id === id)
        const extra = antigo && antigo.codigo_apoio !== codigo ? { codigo_formato: null, modelo: null, modelo_mudou: false, codigo_formato_anterior: null, modelo_anterior: null } : {}
        const { error } = await db.from('apoio_depara_exame').update({ ...payload, ...extra }).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await db.from('apoio_depara_exame').insert({ ...payload, company_id: companyId, exame_id: exameId, apoio_id: apoioId }).select('id').single()
        if (error) throw error
        id = data.id
      }
      toast.success('Terceirização salva. Agora faça o De/Para de analitos.')
      onSaved(id!)
    } catch (e: any) {
      const msg = String(e?.message || '')
      toast.error('Não foi possível salvar', { description: msg.includes('row-level security') ? 'Você não tem permissão para esta ação.' : msg })
    } finally { setSaving(false) }
  }

  const input = 'mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm'
  const label = 'text-xs font-medium text-muted-foreground'

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{editId ? 'Editar terceirização' : 'Terceirizar exame'}</SheetTitle></SheetHeader>
        <fieldset disabled={readOnly || saving} className="mt-4 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold">1. Nosso exame *</h3>
            {exame ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span><b>{exame.internal_code || '—'}</b> · {exame.name} {exame.default_material && <span className="text-muted-foreground">({exame.default_material})</span>}</span>
                {!depara && <button type="button" onClick={() => { setExameId(''); setCodigo('') }} className="text-muted-foreground"><X className="h-4 w-4" /></button>}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input className={input + ' pl-9'} placeholder="Buscar no catálogo do LIS por nome ou código" value={buscaEx} onChange={e => setBuscaEx(e.target.value)} />
                {resultadosEx.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                    {resultadosEx.map(e => (
                      <li key={e.id}><button type="button" onClick={() => { setExameId(e.id); setCodigo(''); setBuscaEx('') }} className="w-full px-3 py-2 text-left text-sm hover:bg-muted">
                        <b>{e.internal_code || '—'}</b> · {e.name} {deparas.some(d => d.exame_id === e.id) && <Badge variant="secondary" className="ml-1">terceirizado</Badge>}
                      </button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">2. Apoio e exame no apoio *</h3>
            <div>
              <label className={label}>Apoio *</label>
              <select className={input} value={apoioId} disabled={!!depara} onChange={e => { setApoioId(e.target.value); setCodigo('') }}>
                <option value="">Selecione…</option>
                {apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            {apoioId && (
              catLoading ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando referência…</p>
              : cat && cat.length === 0 ? <p className="text-xs text-warning">A referência deste apoio está vazia. Atualize o catálogo na aba Laboratórios.</p>
              : (
                <>
                  {selecionado && (
                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm space-y-1">
                      <p><b>{selecionado.codigo}</b> · {selecionado.descricao} {!selecionado.ativo && <Badge variant="destructive">desativado no apoio</Badge>}</p>
                      <p className="text-xs text-muted-foreground">Material: {selecionado.materiais.join(', ') || '—'} · Conservante: {selecionado.conservantes.filter(Boolean).join(', ') || '—'}</p>
                      <p className="text-xs">{selecionado.info_comp.length ? <span className="text-warning">Pede informação complementar: {selecionado.info_comp.join('; ')}</span> : <span className="text-muted-foreground">Não pede informação complementar</span>}</p>
                    </div>
                  )}
                  {exame && sugestoes.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Sugestões por nome e material (confirme)</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {sugestoes.map(s => <button type="button" key={s.item.codigo} onClick={() => escolher(s.item)} className={`rounded-full border px-2.5 py-1 text-xs ${s.item.codigo === codigo ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>{s.item.codigo} · {s.item.descricao}</button>)}
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <label className={label}>Buscar outro exame na referência (código ou descrição)</label>
                    <input className={input} value={buscaCat} placeholder="Ex.: S|URE ou UREIA" onChange={e => setBuscaCat(e.target.value)} />
                    {resultadosCat.length > 0 && (
                      <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                        {resultadosCat.map(c => (
                          <li key={c.codigo}><button type="button" onClick={() => escolher(c)} className="w-full px-3 py-2 text-left text-xs hover:bg-muted">
                            <b>{c.codigo}</b> · {c.descricao} <span className="text-muted-foreground">— {c.materiais.join(', ')}{c.info_comp.length ? ' · pede info complementar' : ''}</span>{!c.ativo && ' (desativado)'}
                          </button></li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">3. Opções</h3>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-primary" checked={exigePdf} onChange={e => setExigePdf(e.target.checked)} />
              <span>Exige PDF<span className="block text-[11px] text-muted-foreground">Marque em anatomia patológica, citologia, imuno-histoquímica e biópsia</span></span>
            </label>
            <div>
              <label className={label}>Conservação para transporte</label>
              <select className={input} value={conservacao} onChange={e => setConservacao(e.target.value)}>
                <option value="nao_informado">Não informado</option>
                <option value="ambiente">Ambiente</option>
                <option value="refrigerado">Refrigerado</option>
                <option value="congelado">Congelado</option>
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">Previsão do laboratório. Depois da transmissão, vale o que vier na etiqueta do apoio.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3"><p className={label}>Preço vigente</p>
                {!codigo ? '—' : ref?.tem_preco ? <p className="font-semibold">{ref.preco != null ? brl(ref.preco) : 'definido'} {ref.ficticio && <Badge className="ml-1 bg-warning text-warning-foreground">fictício</Badge>}</p> : <p className="font-semibold text-warning">Sem preço</p>}
              </div>
              <div className="rounded-lg border border-border p-3"><p className={label}>Prazo do apoio</p><p className="font-semibold">{!codigo ? '—' : ref?.prazo_dias != null ? `${ref.prazo_dias} dias` : <span className="text-warning">sem prazo</span>}</p></div>
            </div>
            <p className="text-[11px] text-muted-foreground">O apoio que recebe o exame é definido pela Bancada Técnica do exame. Um exame pode ter De/Para com mais de um apoio.</p>
          </section>
        </fieldset>
        <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-border bg-background py-3">
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">{readOnly ? 'Fechar' : 'Cancelar'}</button>
          {!readOnly && <button onClick={salvar} disabled={saving} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar e mapear analitos</button>}
        </div>
      </SheetContent>
    </Sheet>
  )
}
