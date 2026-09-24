import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, FileUp, Loader2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { db, norm } from './deparaUtils'
import { extrairModelo, lerXml, type ModeloItem } from './modelosXml'

interface Param { id: string; name: string; unit: string | null; casas_decimais?: number | null }

export function ApoioAnalitosSheet({ deparaId, exameNome, readOnly, onClose, onChanged }: {
  deparaId: string | null; exameNome: string; readOnly: boolean; onClose: () => void; onChanged: () => void
}) {
  const [dp, setDp] = useState<any>(null)
  const [params, setParams] = useState<Param[]>([])
  const [map, setMap] = useState<Record<string, string>>({})
  const [antigos, setAntigos] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!deparaId) return
    const { data: d } = await db.from('apoio_depara_exame').select('id, company_id, exame_id, codigo_apoio, codigo_formato, modelo, codigo_formato_anterior, modelo_anterior, modelo_mudou, modelo_carregado_em').eq('id', deparaId).single()
    setDp(d)
    const [{ data: ps }, { data: an }] = await Promise.all([
      db.from('lab_exam_parameters').select('id, name, unit, casas_decimais').eq('exam_id', d.exame_id).order('sort_order'),
      db.from('apoio_depara_analito').select('codigo_formato, chave_analito, parametro_id, ignorar, casas_decimais').eq('depara_exame_id', deparaId),
    ])
    setParams(ps || [])
    const m: Record<string, string> = {}, a: Record<string, string> = {}, cs: Record<string, number | null> = {}
    for (const i of (d.modelo || []) as ModeloItem[]) cs[i.chave] = i.casas ?? null
    for (const r of an || []) {
      if (r.codigo_formato === (d.codigo_formato || '') && r.casas_decimais != null) cs[r.chave_analito] = r.casas_decimais
      const v = r.ignorar ? 'ignorar' : r.parametro_id || ''
      if (r.codigo_formato === (d.codigo_formato || '')) m[r.chave_analito] = v
      else if (r.codigo_formato === (d.codigo_formato_anterior || '')) a[r.chave_analito] = v
    }
    setMap(m); setAntigos(a); setCasas(cs)
  }, [deparaId])
  useEffect(() => { setDp(null); load() }, [load])

  const [casas, setCasas] = useState<Record<string, number | null>>({})
  const itens: ModeloItem[] = dp?.modelo || []
  const faltam = itens.filter(i => !map[i.chave]).length
  const comparacao = useMemo(() => {
    if (!dp?.modelo_mudou) return null
    const velhos: ModeloItem[] = dp.modelo_anterior || []
    const vm = new Map(velhos.map(v => [v.chave, v]))
    const nm = new Map(itens.map(v => [v.chave, v]))
    return {
      iguais: itens.filter(n => vm.get(n.chave) && norm(vm.get(n.chave)!.nome) === norm(n.nome)),
      novos: itens.filter(n => !vm.get(n.chave) || norm(vm.get(n.chave)!.nome) !== norm(n.nome)),
      removidos: velhos.filter(v => !nm.get(v.chave) || norm(nm.get(v.chave)!.nome) !== norm(v.nome)),
    }
  }, [dp, itens])

  const carregar = async (file: File) => {
    setBusy(true)
    try {
      const doc = await lerXml(file)
      const mod = extrairModelo(doc, dp.codigo_apoio)
      if (!mod) throw new Error(`Não encontrei o exame ${dp.codigo_apoio} no arquivo`)
      if (!mod.itens.length) throw new Error('O modelo deste exame não tem valores')
      const mudou = !!dp.codigo_formato && dp.codigo_formato !== mod.codigoFormato
      const upd: any = { modelo: mod.itens, codigo_formato: mod.codigoFormato, modelo_carregado_em: new Date().toISOString() }
      if (mudou) Object.assign(upd, { modelo_anterior: dp.modelo, codigo_formato_anterior: dp.codigo_formato, modelo_mudou: true })
      setCasas(c => { const n = { ...c }; mod.itens.forEach(i => { if (i.casas != null) n[i.chave] = i.casas }); return n })
      const { error } = await db.from('apoio_depara_exame').update(upd).eq('id', dp.id)
      if (error) throw error
      toast[mudou ? 'warning' : 'success'](mudou ? 'O modelo do apoio mudou: revise a comparação' : `Modelo carregado: ${mod.itens.length} valores`)
      await load(); onChanged()
    } catch (e: any) {
      toast.error('Não foi possível carregar o modelo', { description: e.message })
    } finally { setBusy(false) }
  }

  const mapearPorNome = () => {
    const m = { ...map }
    let n = 0
    for (const i of itens) {
      if (m[i.chave]) continue
      const ni = norm(i.nome)
      const p = params.find(p => norm(p.name) === ni) || params.find(p => norm(p.name).includes(ni) || ni.includes(norm(p.name)))
      if (p) { m[i.chave] = p.id; n++ }
    }
    setMap(m)
    toast.info(`${n} analito(s) sugerido(s) por nome. Revise e salve.`)
  }

  const copiarIguais = () => {
    if (!comparacao) return
    const m = { ...map }
    let n = 0
    for (const i of comparacao.iguais) if (antigos[i.chave] && !m[i.chave]) { m[i.chave] = antigos[i.chave]; n++ }
    setMap(m)
    toast.info(`${n} mapeamento(s) copiado(s). Revise e salve.`)
  }

  const salvar = async () => {
    setBusy(true)
    try {
      const fmt = dp.codigo_formato || ''
      const { error: dErr } = await db.from('apoio_depara_analito').delete().eq('depara_exame_id', dp.id).eq('codigo_formato', fmt)
      if (dErr) throw dErr
      const rows = itens.filter(i => map[i.chave]).map(i => ({
        company_id: dp.company_id, depara_exame_id: dp.id, codigo_formato: fmt, chave_analito: i.chave, nome_apoio: i.nome,
        parametro_id: map[i.chave] === 'ignorar' ? null : map[i.chave], ignorar: map[i.chave] === 'ignorar',
        casas_decimais: casas[i.chave] ?? null,
      }))
      if (rows.length) { const { error } = await db.from('apoio_depara_analito').insert(rows); if (error) throw error }
      if (dp.modelo_mudou && rows.length === itens.length) await db.from('apoio_depara_exame').update({ modelo_mudou: false }).eq('id', dp.id)
      toast.success(rows.length === itens.length ? 'Todos os analitos mapeados' : `Salvo. Faltam ${itens.length - rows.length}`)
      await load(); onChanged()
    } catch (e: any) {
      const msg = String(e?.message || '')
      toast.error('Não foi possível salvar', { description: msg.includes('row-level security') ? 'Você não tem permissão para esta ação.' : msg })
    } finally { setBusy(false) }
  }

  return (
    <Sheet open={!!deparaId} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader><SheetTitle>De/Para de analitos — {exameNome}</SheetTitle></SheetHeader>
        {!dp ? <Loader2 className="mt-6 h-5 w-5 animate-spin" /> : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{dp.codigo_apoio}</Badge>
              {dp.codigo_formato && <span className="text-xs text-muted-foreground">Formato {dp.codigo_formato}</span>}
              {dp.modelo_mudou && <Badge variant="destructive">Modelo do apoio mudou</Badge>}
              {itens.length > 0 && (faltam === 0
                ? <span className="flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 className="h-4 w-4" />Todos mapeados</span>
                : <span className="text-xs font-medium text-destructive">Faltam {faltam}</span>)}
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />} Carregar modelo do apoio (modelos.xml)
                  <input type="file" accept=".xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) carregar(f); e.target.value = '' }} />
                </label>
                {itens.length > 0 && <button onClick={mapearPorNome} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Wand2 className="h-3.5 w-3.5" />Mapear por nome</button>}
                {comparacao && <button onClick={copiarIguais} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"><Copy className="h-3.5 w-3.5" />Copiar os que continuam iguais</button>}
              </div>
            )}
            {comparacao && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2">
                <p className="flex items-center gap-1 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />Formato {dp.codigo_formato_anterior} → {dp.codigo_formato}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div><p className="font-medium">Iguais ({comparacao.iguais.length})</p>{comparacao.iguais.map(i => <p key={i.chave} className="text-muted-foreground">{i.nome}</p>)}</div>
                  <div><p className="font-medium text-success">Novos/alterados ({comparacao.novos.length})</p>{comparacao.novos.map(i => <p key={i.chave}>{i.nome} <span className="text-muted-foreground">{i.chave}</span></p>)}</div>
                  <div><p className="font-medium text-destructive">Removidos ({comparacao.removidos.length})</p>{comparacao.removidos.map(i => <p key={i.chave} className="line-through">{i.nome}</p>)}</div>
                </div>
              </div>
            )}
            {itens.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum modelo carregado. Envie o <b>modelos.xml</b> do Pardini.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2">Valor no apoio</th><th className="px-3 py-2">Chave</th><th className="px-3 py-2">Unid.</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2 w-64">Parâmetro nosso</th><th className="px-3 py-2 w-28">Casas decimais</th></tr></thead>
                  <tbody>
                    {itens.map(i => (
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
                        {(() => {
                          const par = params.find(p => p.id === map[i.chave])
                          const nossa = par?.casas_decimais
                          const dif = casas[i.chave] != null && nossa != null && casas[i.chave] !== nossa
                          return (
                            <td className={`px-3 py-2 ${dif ? 'bg-warning/20' : ''}`}>
                              <input type="number" min={0} max={6} disabled={readOnly} value={casas[i.chave] ?? ''} placeholder={nossa != null ? String(nossa) : '—'}
                                onChange={e => setCasas(c => ({ ...c, [i.chave]: e.target.value === '' ? null : Number(e.target.value) }))}
                                className="w-16 rounded-lg border border-input bg-background px-2 py-1.5" />
                              {dif && <p className="mt-1 text-[10px] leading-tight text-foreground">Apoio manda {casas[i.chave]} casa{casas[i.chave] === 1 ? '' : 's'}; nosso laudo usa {nossa}</p>}
                            </td>
                          )
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {params.length === 0 && itens.length > 0 && <p className="text-xs text-warning">Este exame não tem parâmetros cadastrados no LIS; cadastre-os em Parâmetros e Máscara ou marque como Ignorar.</p>}
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background py-3">
              <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Fechar</button>
              {!readOnly && itens.length > 0 && <button onClick={salvar} disabled={busy} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar mapeamento</button>}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
