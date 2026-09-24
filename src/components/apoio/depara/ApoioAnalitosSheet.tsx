import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CloudDownload, Copy, FileUp, Layers, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { db, norm } from './deparaUtils'
import { extrairTodos, lerXml, type ModeloItem } from './modelosXml'
import { AjustarLaudoDialog } from './AjustarLaudoDialog'

interface Param { id: string; name: string; unit: string | null; casas_decimais?: number | null }
interface Formato { codigo_formato: string; cod_exm_apoio: string; metodo: string | null; unidade_produtiva: string | null; ultima_liberacao: string | null; total: number; mapeados: number; recente: boolean; itens: ModeloItem[] }
type Mapa = Record<string, string>
interface Previa { fmt: string; casados: { chave: string; nome: string; valor: string }[]; naoCasados: string[] }

const MSG_PARDINI = "O Pardini não conseguiu gerar os modelos agora (falha do lado do Pardini). Use 'Enviar modelos.xml manualmente'."

function motivoUpload(raw: string) {
  if (/row-level security|permiss/i.test(raw)) return 'você não tem permissão para esta ação'
  if (/XML inválido|parsererror/i.test(raw)) return 'o arquivo não é um XML válido'
  if (/Contagem não confere/i.test(raw)) return 'a quantidade gravada não conferiu com a do arquivo'
  if (/nenhum modelo/i.test(raw)) return 'nenhum modelo encontrado no arquivo'
  if (/fetch|network|Failed to/i.test(raw)) return 'falha de conexão durante o envio'
  return 'erro inesperado ao gravar'
}

export function ApoioAnalitosSheet({ deparaId, exameNome, readOnly, onClose, onChanged }: {
  deparaId: string | null; exameNome: string; readOnly: boolean; onClose: () => void; onChanged: () => void
}) {
  const [dp, setDp] = useState<any>(null)
  const [params, setParams] = useState<Param[]>([])
  const [formatos, setFormatos] = useState<Formato[]>([])
  const [fmt, setFmt] = useState<string>('')
  const [maps, setMaps] = useState<Record<string, Mapa>>({})
  const [casasAll, setCasasAll] = useState<Record<string, Record<string, number | null>>>({})
  const [busy, setBusy] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [destacarManual, setDestacarManual] = useState(false)
  const [podeAuto, setPodeAuto] = useState<boolean | null>(null)
  const [nomeExame, setNomeExame] = useState('')
  const [previa, setPrevia] = useState<Previa[] | null>(null)
  const [ajustar, setAjustar] = useState(false)
  const fecharAjuste = useCallback(() => setAjustar(false), [])

  const load = useCallback(async (manter?: string) => {
    if (!deparaId) return
    const { data: d } = await db.from('apoio_depara_exame').select('id, company_id, apoio_id, exame_id, codigo_apoio, codigo_formato, modelo, modelo_mudou').eq('id', deparaId).single()
    const [{ data: ex }, { data: lab }, { data: fs }, { data: ps }, { data: an }] = await Promise.all([
      db.from('exams').select('internal_code, name').eq('id', d.exame_id).maybeSingle(),
      db.from('apoio_laboratorio').select('conector, cod_lab, senha_secret_id, senha_cifrada').eq('id', d.apoio_id).maybeSingle(),
      db.rpc('apoio_depara_formatos', { _depara: deparaId }),
      db.from('lab_exam_parameters').select('id, name, unit, casas_decimais').eq('exam_id', d.exame_id).order('sort_order'),
      db.from('apoio_depara_analito').select('codigo_formato, chave_analito, parametro_id, ignorar, casas_decimais').eq('depara_exame_id', deparaId),
    ])
    setNomeExame(ex ? [ex.internal_code, ex.name].filter(Boolean).join(' · ') : '')
    setPodeAuto(!!lab && String(lab.conector || 'pardini').toLowerCase().includes('pardini') && !!lab.cod_lab && !!(lab.senha_secret_id || lab.senha_cifrada))
    let lista: Formato[] = []
    if (fs?.length) {
      const cods = [...new Set((fs as any[]).map(f => f.cod_exm_apoio))]
      const { data: ms } = await db.from('apoio_modelo_resultado').select('cod_exm_apoio, codigo_formato, modelo_json').eq('apoio_id', d.apoio_id).in('cod_exm_apoio', cods)
      const byKey = new Map((ms || []).map((m: any) => [`${m.cod_exm_apoio}|${m.codigo_formato}`, m.modelo_json]))
      lista = (fs as any[]).map(f => ({ ...f, itens: (byKey.get(`${f.cod_exm_apoio}|${f.codigo_formato}`) || []) as ModeloItem[] }))
    } else if (d.modelo?.length) {
      // Legado: modelo único guardado no próprio De/Para
      lista = [{ codigo_formato: d.codigo_formato || '', cod_exm_apoio: d.codigo_apoio, metodo: null, unidade_produtiva: null, ultima_liberacao: null, total: d.modelo.length, mapeados: 0, recente: true, itens: d.modelo }]
    }
    const m: Record<string, Mapa> = {}, cs: Record<string, Record<string, number | null>> = {}
    for (const f of lista) { m[f.codigo_formato] = {}; cs[f.codigo_formato] = {}; for (const i of f.itens) cs[f.codigo_formato][i.chave] = i.casas ?? null }
    for (const r of an || []) {
      const k = r.codigo_formato || ''
      ;(m[k] ||= {})[r.chave_analito] = r.ignorar ? 'ignorar' : r.parametro_id || ''
      if (r.casas_decimais != null) (cs[k] ||= {})[r.chave_analito] = r.casas_decimais
    }
    for (const f of lista) f.mapeados = f.itens.filter(i => m[f.codigo_formato]?.[i.chave]).length
    setParams(ps || []); setFormatos(lista); setMaps(m); setCasasAll(cs); setDp(d)
    setFmt(prev => { const k = manter ?? prev; return lista.some(f => f.codigo_formato === k) ? k : lista[0]?.codigo_formato ?? '' })
  }, [deparaId])
  useEffect(() => { setDp(null); setFmt(''); load('') }, [load])

  const atual = formatos.find(f => f.codigo_formato === fmt)
  const itens = atual?.itens || []
  const map = maps[fmt] || {}
  const casas = casasAll[fmt] || {}
  const faltam = itens.filter(i => !map[i.chave]).length
  const recentes = formatos.filter(f => f.recente)
  const recMapeados = recentes.filter(f => f.mapeados >= f.total && f.total > 0).length
  const todosUmValor = formatos.length > 1 && formatos.every(f => f.itens.length === 1)
  const setMap = (fn: (m: Mapa) => Mapa) => setMaps(all => ({ ...all, [fmt]: fn(all[fmt] || {}) }))
  const setCasas = (fn: (c: Record<string, number | null>) => Record<string, number | null>) => setCasasAll(all => ({ ...all, [fmt]: fn(all[fmt] || {}) }))

  const gravarFormato = async (codigo: string, m: Mapa, cs: Record<string, number | null>, lista: ModeloItem[]) => {
    const { error: dErr } = await db.from('apoio_depara_analito').delete().eq('depara_exame_id', dp.id).eq('codigo_formato', codigo)
    if (dErr) throw dErr
    const rows = lista.filter(i => m[i.chave]).map(i => ({
      company_id: dp.company_id, depara_exame_id: dp.id, codigo_formato: codigo, chave_analito: i.chave, nome_apoio: i.nome,
      parametro_id: m[i.chave] === 'ignorar' ? null : m[i.chave], ignorar: m[i.chave] === 'ignorar', casas_decimais: cs[i.chave] ?? null,
    }))
    if (rows.length) { const { error } = await db.from('apoio_depara_analito').insert(rows); if (error) throw error }
    return rows.length
  }

  const erroSalvar = (e: any) => {
    console.error(e)
    toast.error('Não foi possível salvar', { description: String(e?.message || '').includes('row-level security') ? 'Você não tem permissão para esta ação.' : 'Tente novamente. Se continuar, avise o suporte.' })
  }

  const salvar = async () => {
    setBusy(true)
    try {
      const n = await gravarFormato(fmt, map, casas, itens)
      if (dp.modelo_mudou) await db.from('apoio_depara_exame').update({ modelo_mudou: false }).eq('id', dp.id)
      toast.success(n === itens.length ? `Formato ${fmt} mapeado` : `Salvo. Faltam ${itens.length - n} no formato ${fmt}`)
      await load(fmt); onChanged()
    } catch (e) { erroSalvar(e) } finally { setBusy(false) }
  }

  const mapearPorNome = () => {
    const m = { ...map }; let n = 0
    for (const i of itens) {
      if (m[i.chave]) continue
      const ni = norm(i.nome)
      const p = params.find(p => norm(p.name) === ni) || params.find(p => norm(p.name).includes(ni) || ni.includes(norm(p.name)))
      if (p) { m[i.chave] = p.id; n++ }
    }
    setMap(() => m)
    toast.info(`${n} analito(s) sugerido(s) por nome. Revise e salve.`)
  }

  // Casa por nome + unidade; sem nome, pela posição (só se o número de valores for igual)
  const montarPrevia = () => {
    const semNome = (i: ModeloItem) => !i.nome || i.nome === i.chave
    const origem = itens.map((i, idx) => ({ i, idx, v: map[i.chave] })).filter(x => x.v)
    const out: Previa[] = []
    for (const f of formatos) {
      if (f.codigo_formato === fmt) continue
      const casados: Previa['casados'] = [], nao: string[] = []
      f.itens.forEach((alvo, idx) => {
        let src = origem.find(o => !semNome(alvo) && !semNome(o.i) && norm(o.i.nome) === norm(alvo.nome) && norm(o.i.unidade || '') === norm(alvo.unidade || ''))
        if (!src && semNome(alvo) && f.itens.length === itens.length) src = origem.find(o => o.idx === idx)
        if (src) casados.push({ chave: alvo.chave, nome: alvo.nome, valor: src.v }); else nao.push(alvo.nome)
      })
      out.push({ fmt: f.codigo_formato, casados, naoCasados: nao })
    }
    setPrevia(out)
  }

  const confirmarPrevia = async (lista: Previa[]) => {
    setBusy(true)
    try {
      for (const p of lista) {
        const f = formatos.find(x => x.codigo_formato === p.fmt)!
        const m = { ...(maps[p.fmt] || {}) }
        for (const c of p.casados) m[c.chave] = c.valor
        await gravarFormato(p.fmt, m, casasAll[p.fmt] || {}, f.itens)
      }
      toast.success(`Mapeamento aplicado a ${lista.length} formato(s)`)
      setPrevia(null); await load(fmt); onChanged()
    } catch (e) { erroSalvar(e) } finally { setBusy(false) }
  }

  const mapearIguais = () => {
    const v = map[itens[0]?.chave]
    if (!v) return toast.info('Mapeie este formato primeiro')
    confirmarPrevia(formatos.filter(f => f.codigo_formato !== fmt).map(f => ({ fmt: f.codigo_formato, casados: [{ chave: f.itens[0].chave, nome: f.itens[0].nome, valor: v }], naoCasados: [] })))
  }

  const buscarPardini = async () => {
    if (buscando) return
    if (formatos.some(f => f.itens.length)) { await load(fmt); toast.success('Modelo carregado do banco (sem chamar o Pardini)'); return }
    setBuscando(true)
    try {
      const { data, error } = await supabase.functions.invoke('apoio-modelos', { body: { apoio_id: dp.apoio_id, operacao: 'todos' } })
      if (error) throw error
      const r = data?.resultados?.[0]
      if (r && !r.ok) throw new Error(r.erro || 'Falha ao buscar modelos no Pardini')
      await load('')
    } catch (e: any) {
      const raw = String(e?.message || '')
      const pardini = /Badly formed SOAP|ERRO\s*#|<info>|UNDEFINED|fault|Pardini não conseguiu/i.test(raw)
      setDestacarManual(true)
      toast.error('Não foi possível buscar o modelo', { description: pardini ? MSG_PARDINI : 'Tente o envio manual do modelos.xml.' })
    } finally { setBuscando(false) }
  }

  // Upload: grava TODOS os modelos do arquivo; tudo ou nada (área temporária + confirmação numa transação)
  const carregar = async (file: File) => {
    setBusy(true)
    const lote = crypto.randomUUID()
    try {
      setProgresso('Lendo arquivo…')
      const doc = await lerXml(file)
      const todos = extrairTodos(doc)
      if (!todos.length) throw new Error('nenhum modelo')
      const rows = todos.map(m => ({ lote, company_id: dp.company_id, apoio_id: dp.apoio_id, dados: {
        cod_exm_apoio: m.codExmApoio, codigo_formato: m.codigoFormato || '', material_nome: m.materialNome, exame_nome: m.exameNome,
        modelo_json: m.itens, unidade_produtiva: m.unidadeProdutiva, metodo: m.metodo, ultima_liberacao: m.ultimaLiberacao,
      } }))
      for (let i = 0; i < rows.length; i += 250) {
        setProgresso(`Enviando ${Math.min(i + 250, rows.length)} de ${rows.length}…`)
        const { error } = await db.from('apoio_modelo_import').insert(rows.slice(i, i + 250))
        if (error) throw error
      }
      setProgresso('Gravando…')
      const { data, error } = await db.rpc('apoio_modelos_commit', { _lote: lote, _apoio: dp.apoio_id, _esperado: rows.length, _origem: 'manual' })
      if (error) throw error
      toast.success(`${data?.modelos ?? rows.length} modelos de ${data?.exames ?? '?'} exames guardados para todos os exames`)
      setDestacarManual(false)
      await load(''); onChanged()
    } catch (e: any) {
      console.error('Upload modelos.xml', e)
      await db.from('apoio_modelo_import').delete().eq('lote', lote)
      toast.error(`Não foi possível carregar o modelos.xml: ${motivoUpload(String(e?.message || ''))}. Nada foi gravado.`)
    } finally { setBusy(false); setProgresso('') }
  }

  const fmtData = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

  return (
    <Sheet open={!!deparaId} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader><SheetTitle>De/Para de analitos — {nomeExame || exameNome}</SheetTitle></SheetHeader>
        {!dp ? <Loader2 className="mt-6 h-5 w-5 animate-spin" /> : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{dp.codigo_apoio}</Badge>
              {formatos.length > 0 && (recMapeados === recentes.length
                ? <span className="flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 className="h-4 w-4" />Formatos: {formatos.length} · mapeados {recMapeados}</span>
                : <span className="text-xs font-medium text-destructive">Formatos: {formatos.length} · faltam {recentes.length - recMapeados} formato(s)</span>)}
            </div>
            {!readOnly && <p className="text-xs text-muted-foreground">Dica: envie o modelos.xml uma vez; ele serve para todos os exames.</p>}
            {!readOnly && podeAuto === false && <p className="text-xs text-muted-foreground">Busca automática indisponível: cadastre o código e a senha do Pardini na integração deste apoio.</p>}
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <span title={podeAuto === false ? 'Cadastre o código e a senha do Pardini na integração deste apoio.' : undefined}>
                  <button onClick={buscarPardini} disabled={!podeAuto || buscando || busy} className="gradient-bg flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                    {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudDownload className="h-3.5 w-3.5" />} Buscar modelo do Pardini
                  </button>
                </span>
                <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted ${destacarManual ? 'border-primary ring-2 ring-primary/40' : 'border-border'} ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />} {progresso || 'Enviar modelos.xml manualmente'}
                  <input type="file" accept=".xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) carregar(f); e.target.value = '' }} />
                </label>
              </div>
            )}

            {!readOnly && formatos.some(f => f.itens.length) && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <button onClick={() => setAjustar(true)} disabled={busy} className="gradient-bg flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                  <Sparkles className="h-3.5 w-3.5" />Ajustar laudo ao modelo do Pardini
                </button>
                <span className="text-xs text-muted-foreground">
                  {(dp.modelo_mudou || recMapeados < recentes.length) && recMapeados > 0 ? <b className="text-warning">Formato novo: ajustar laudo de novo?</b> : 'Escolha o laudo e o sistema cria, ajusta e mapeia todos os campos. Você confere a prévia antes de gravar.'}
                </span>
              </div>
            )}

            {formatos.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2">Formato</th><th className="px-3 py-2">Método</th><th className="px-3 py-2">Unidade</th><th className="px-3 py-2">Última liberação</th><th className="px-3 py-2">Situação</th></tr></thead>
                  <tbody>
                    {formatos.map(f => {
                      const ok = f.total > 0 && f.mapeados >= f.total
                      return (
                        <tr key={f.codigo_formato} onClick={() => setFmt(f.codigo_formato)}
                          className={`cursor-pointer border-t border-border hover:bg-muted/40 ${f.codigo_formato === fmt ? 'bg-primary/10' : ''} ${!f.recente ? 'text-muted-foreground' : ''}`}>
                          <td className="px-3 py-2 font-mono font-medium">{f.codigo_formato || '—'}</td>
                          <td className="px-3 py-2">{f.metodo || '—'}</td>
                          <td className="px-3 py-2">{f.unidade_produtiva || '—'}</td>
                          <td className="px-3 py-2">{fmtData(f.ultima_liberacao)}</td>
                          <td className="px-3 py-2">{ok ? <span className="text-success">Mapeado ✅</span> : !f.recente ? 'Sem uso recente' : <span className="text-destructive">Faltam {f.total - f.mapeados}</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {atual && !readOnly && itens.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button onClick={mapearPorNome} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Wand2 className="h-3.5 w-3.5" />Mapear por nome</button>
                {formatos.length > 1 && !todosUmValor && <button onClick={montarPrevia} disabled={!Object.values(map).some(Boolean)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"><Copy className="h-3.5 w-3.5" />Aplicar este mapeamento aos outros formatos</button>}
                {todosUmValor && <button onClick={mapearIguais} disabled={!map[itens[0].chave] || busy} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"><Layers className="h-3.5 w-3.5" />Mapear todos os formatos iguais</button>}
              </div>
            )}

            {itens.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum modelo carregado. Envie o <b>modelos.xml</b> do Pardini.</p>
            ) : (
              <>
                <p className="text-xs font-medium">Formato {fmt} · {faltam === 0 ? <span className="text-success">todos mapeados</span> : <span className="text-destructive">faltam {faltam}</span>}</p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2">Valor no apoio</th><th className="px-3 py-2">Chave</th><th className="px-3 py-2">Unid.</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2 w-64">Parâmetro nosso</th><th className="px-3 py-2 w-28">Casas decimais</th></tr></thead>
                    <tbody>
                      {itens.map(i => {
                        const par = params.find(p => p.id === map[i.chave])
                        const nossa = par?.casas_decimais
                        const dif = casas[i.chave] != null && nossa != null && casas[i.chave] !== nossa
                        return (
                          <tr key={i.chave} className={`border-t border-border ${!map[i.chave] ? 'bg-destructive/5' : ''}`}>
                            <td className="px-3 py-2 font-medium">{i.nome}</td>
                            <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{i.chave}</td>
                            <td className="px-3 py-2">{i.unidade || '—'}</td>
                            <td className="px-3 py-2">{i.tipo || '—'}{i.casas != null ? ` (${i.casas} casas)` : ''}</td>
                            <td className="px-3 py-2">
                              <select disabled={readOnly} value={map[i.chave] || ''} onChange={e => setMap(m => ({ ...m, [i.chave]: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-2 py-1.5">
                                <option value="">— escolher —</option>
                                <option value="ignorar">Ignorar</option>
                                {params.map(p => <option key={p.id} value={p.id}>{p.name}{p.unit ? ` (${p.unit})` : ''}</option>)}
                              </select>
                            </td>
                            <td className={`px-3 py-2 ${dif ? 'bg-warning/20' : ''}`}>
                              <input type="number" min={0} max={6} disabled={readOnly} value={casas[i.chave] ?? ''} placeholder={nossa != null ? String(nossa) : '—'}
                                onChange={e => setCasas(c => ({ ...c, [i.chave]: e.target.value === '' ? null : Number(e.target.value) }))}
                                className="w-16 rounded-lg border border-input bg-background px-2 py-1.5" />
                              {dif && <p className="mt-1 text-[10px] leading-tight text-foreground">Apoio manda {casas[i.chave]} casa{casas[i.chave] === 1 ? '' : 's'}; nosso laudo usa {nossa}</p>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {params.length === 0 && itens.length > 0 && <p className="text-xs text-warning">Este exame não tem parâmetros cadastrados no LIS; cadastre-os em Parâmetros e Máscara ou marque como Ignorar.</p>}
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background py-3">
              <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Fechar</button>
              {!readOnly && itens.length > 0 && <button onClick={salvar} disabled={busy} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar formato {fmt}</button>}
            </div>
          </div>
        )}

        {dp && <AjustarLaudoDialog open={ajustar} deparaId={dp.id} apoioId={dp.apoio_id} formatos={formatos} onClose={fecharAjuste} onDone={() => { load(fmt); onChanged() }} />}

        <Dialog open={!!previa} onOpenChange={o => !o && setPrevia(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Aplicar mapeamento do formato {fmt} aos outros</DialogTitle></DialogHeader>
            <div className="space-y-3 text-xs">
              {previa?.map(p => (
                <div key={p.fmt} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">Formato {p.fmt}: <span className="text-success">{p.casados.length} casados</span> · <span className="text-destructive">{p.naoCasados.length} não casados</span></p>
                  {p.naoCasados.length > 0 && <p className="mt-1 text-muted-foreground">Não casados: {p.naoCasados.join(', ')}</p>}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setPrevia(null)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
                <button onClick={() => previa && confirmarPrevia(previa.filter(p => p.casados.length))} disabled={busy || !previa?.some(p => p.casados.length)} className="gradient-bg rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Gravar os casados</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}
