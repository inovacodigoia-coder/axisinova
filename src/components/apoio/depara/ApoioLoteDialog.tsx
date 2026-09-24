import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { carregarCatalogo, db, exigePdfSugerido, sugerir, type CatItem, type ExameLis } from './deparaUtils'
import { confianca, terceirizarCompleto, type Confianca, type ResultadoAuto } from './autoTerceirizar'

interface Linha { exame: ExameLis; opcoes: CatItem[]; codigo: string; conf: Confianca; decisao: 'aceitar' | 'pular' }
type Etapa = 'revisao' | 'rodando' | 'relatorio' | 'bancada'
const CONF: Record<Confianca, { t: string; c: string }> = {
  alta: { t: 'Alta', c: 'bg-success text-success-foreground' }, media: { t: 'Média', c: 'bg-warning text-warning-foreground' }, sem: { t: 'Sem sugestão', c: 'bg-muted text-muted-foreground' },
}

/** Terceirizar vários ponta a ponta: sugestão com confiança → De/Para → laudo Pardini → ajuste → material/metodologia */
export function ApoioLoteDialog({ open, exames, apoios, companyId, onClose, onSaved }: {
  open: boolean; exames: ExameLis[]; apoios: { id: string; nome: string }[]; companyId: string; onClose: () => void; onSaved: () => void
}) {
  const [apoioId, setApoioId] = useState('')
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [fConf, setFConf] = useState<Confianca | ''>('')
  const [etapa, setEtapa] = useState<Etapa>('revisao')
  const [prog, setProg] = useState({ n: 0, total: 0 })
  const [res, setRes] = useState<ResultadoAuto[]>([])
  const [banc, setBanc] = useState<{ id: string; name: string } | null>(null)
  const [previa, setPrevia] = useState<{ mover: number; equip: string[] } | null>(null)

  useEffect(() => { if (open) { setApoioId(apoios.length === 1 ? apoios[0].id : ''); setLinhas(null); setEtapa('revisao'); setRes([]); setFConf('') } }, [open, apoios])

  useEffect(() => {
    if (!open || !apoioId) return
    setBusy(true); setLinhas(null)
    carregarCatalogo(apoioId).then(cat => {
      setLinhas(exames.map(e => {
        const s = sugerir(e, cat, 5).map(x => x.item)
        const conf = confianca(e, s[0])
        return { exame: e, opcoes: s, codigo: s[0]?.codigo || '', conf, decisao: conf === 'alta' ? 'aceitar' : 'pular' }
      }))
    }).catch(() => toast.error('Erro ao carregar o catálogo do apoio')).finally(() => setBusy(false))
  }, [open, apoioId, exames])

  const aprovados = (linhas || []).filter(l => l.decisao === 'aceitar' && l.codigo)
  const visiveis = (linhas || []).filter(l => !fConf || l.conf === fConf)
  const cont = useMemo(() => ({ alta: 0, media: 0, sem: 0, ...Object.fromEntries((['alta', 'media', 'sem'] as Confianca[]).map(c => [c, (linhas || []).filter(l => l.conf === c).length])) }), [linhas])
  const set = (id: string, p: Partial<Linha>) => setLinhas(ls => ls!.map(x => x.exame.id === id ? { ...x, ...p } : x))

  const rodar = async () => {
    setEtapa('rodando'); setProg({ n: 0, total: aprovados.length })
    const out: ResultadoAuto[] = []
    for (const l of aprovados) {
      const it = l.opcoes.find(o => o.codigo === l.codigo)!
      out.push(await terceirizarCompleto(companyId, apoioId, l.exame, it, exigePdfSugerido(it.descricao)))
      setProg({ n: out.length, total: aprovados.length }); setRes([...out])
    }
    setEtapa('relatorio'); onSaved()
  }

  const okIds = res.filter(r => r.status !== 'falha').map(r => r.exameId)
  const prepararBancada = async () => {
    const { data: wb } = await db.from('lab_workbenches').select('id, name').eq('tipo', 'apoio').eq('apoio_id', apoioId).eq('is_active', true).limit(1).maybeSingle()
    if (!wb) return toast.error('Não há bancada técnica do Pardini cadastrada', { description: 'Crie uma bancada do tipo Apoio ligada ao Pardini em Bancadas Técnicas.' })
    setBanc(wb); setEtapa('bancada'); setPrevia(null)
    let mover = 0
    for (const id of okIds) { const { data } = await db.rpc('bancada_troca_previa', { _exam: id, _bancada: wb.id }); mover += (data?.mover || []).length }
    const { data: eq } = await db.from('lab_exam_parameters').select('exam_id').in('exam_id', okIds).not('equipment_code', 'is', null).neq('equipment_code', '')
    const eqIds = new Set((eq || []).map((r: any) => r.exam_id))
    setPrevia({ mover, equip: res.filter(r => eqIds.has(r.exameId)).map(r => r.nome) })
  }
  const trocarBancada = async () => {
    if (!banc) return
    setBusy(true); let ok = 0; const falhas: string[] = []
    for (const id of okIds) {
      const { error } = await db.rpc('bancada_trocar_cadastro', { _exam: id, _bancada: banc.id, _motivo: 'Terceirizar vários (Pardini)' })
      if (error) falhas.push(`${res.find(r => r.exameId === id)?.nome}: ${error.message}`); else ok++
    }
    setBusy(false)
    toast[falhas.length ? 'warning' : 'success'](`Bancada trocada em ${ok} exame(s)`, falhas.length ? { description: falhas.slice(0, 3).join(' · ') } : undefined)
    onSaved(); onClose()
  }

  const grupo = (s: ResultadoAuto['status']) => res.filter(r => r.status === s)

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && etapa !== 'rodando' && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Terceirizar vários ({exames.length} exames)</DialogTitle></DialogHeader>

        {etapa === 'revisao' && (
          <div className="space-y-3 text-sm">
            <select value={apoioId} onChange={e => setApoioId(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2">
              <option value="">Escolha o apoio…</option>
              {apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            {busy && !linhas && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando sugestões…</p>}
            {linhas && (<>
              <div className="flex flex-wrap items-center gap-2">
                {([['', `Todos (${linhas.length})`], ['alta', `Alta (${cont.alta})`], ['media', `Média (${cont.media})`], ['sem', `Sem sugestão (${cont.sem})`]] as const).map(([k, t]) => (
                  <button key={k} onClick={() => setFConf(k)} className={`rounded-full border px-3 py-1 text-xs ${fConf === k ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{t}</button>
                ))}
                <button onClick={() => setLinhas(ls => ls!.map(l => l.conf === 'alta' ? { ...l, decisao: 'aceitar' } : l))} className="ml-auto rounded-xl border border-primary px-3 py-1.5 text-xs font-semibold text-primary">Aceitar todos de confiança alta</button>
              </div>
              <p className="text-xs text-muted-foreground">Ao confirmar, cada exame aceito recebe: De/Para → laudo Pardini novo ligado à bancada do Pardini → campos ajustados ao modelo → material e metodologia. A bancada técnica não muda sozinha.</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2">Nosso exame</th><th className="px-3 py-2">Confiança</th><th className="px-3 py-2">Exame no Pardini</th><th className="px-3 py-2">Decisão</th></tr></thead>
                  <tbody>
                    {visiveis.map(l => (
                      <tr key={l.exame.id} className="border-t border-border">
                        <td className="px-3 py-2"><b>{l.exame.internal_code || '—'}</b> · {l.exame.name}</td>
                        <td className="px-3 py-2"><Badge className={`text-[10px] ${CONF[l.conf].c}`}>{CONF[l.conf].t}</Badge></td>
                        <td className="px-3 py-2">
                          {l.opcoes.length === 0 ? <span className="text-muted-foreground">Fica para depois (terceirize pelo botão individual)</span> : (
                            <select value={l.codigo} onChange={e => set(l.exame.id, { codigo: e.target.value })} className="w-full rounded-lg border border-input bg-background px-2 py-1">
                              {l.opcoes.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} · {o.descricao} ({o.materiais.join(', ')})</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <label className="mr-3"><input type="radio" className="accent-primary" disabled={!l.opcoes.length} checked={l.decisao === 'aceitar'} onChange={() => set(l.exame.id, { decisao: 'aceitar' })} /> Aceitar</label>
                          <label><input type="radio" className="accent-primary" checked={l.decisao === 'pular'} onChange={() => set(l.exame.id, { decisao: 'pular' })} /> Pular</label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>)}
          </div>
        )}

        {etapa === 'rodando' && (
          <div className="space-y-3 py-6 text-center text-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="font-semibold">{prog.n} de {prog.total}</p>
            <div className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${prog.total ? (prog.n / prog.total) * 100 : 0}%` }} /></div>
            <p className="text-xs text-muted-foreground">Não feche esta janela.</p>
          </div>
        )}

        {etapa === 'relatorio' && (
          <div className="space-y-3 text-sm">
            <p><span className="text-success font-semibold">Prontos ✅ {grupo('pronto').length}</span> · <span className="text-warning font-semibold">Com pendência {grupo('pendencia').length}</span> · <span className="text-destructive font-semibold">Falharam {grupo('falha').length}</span></p>
            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-border divide-y divide-border text-xs">
              {res.map(r => (
                <div key={r.exameId} className="px-3 py-2">
                  <b>{r.status === 'pronto' ? '✅' : r.status === 'pendencia' ? '⚠️' : '❌'} {r.nome}</b>
                  {r.pendencias.length > 0 && <p className="text-warning">{r.pendencias.join(' · ')}</p>}
                  {r.erro && <p className="text-destructive">{r.erro}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {etapa === 'bancada' && (
          <div className="space-y-3 text-sm">
            <p>Mudar a bancada técnica de <b>{okIds.length}</b> exame(s) para <b>{banc?.name}</b>. Isso decide para onde vão os próximos pedidos.</p>
            {!previa ? <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Calculando prévia…</p> : (<>
              <p>{previa.mover} exame(s) de pedidos ainda não coletados passam para o Pardini. Os já coletados ficam onde estão.</p>
              {previa.equip.length > 0 && (
                <div className="flex gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  <p>Ligados a equipamento no ServidorAisaxius: <b>{previa.equip.join(', ')}</b>. Hoje o sistema ainda não retira esses exames da fila do equipamento — confira manualmente.</p>
                </div>
              )}
            </>)}
          </div>
        )}

        <DialogFooter>
          {etapa === 'revisao' && (<>
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
            <button onClick={rodar} disabled={busy || !aprovados.length} className="gradient-bg rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Terceirizar {aprovados.length} exame(s)</button>
          </>)}
          {etapa === 'relatorio' && (<>
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-sm">Fechar</button>
            {okIds.length > 0 && <button onClick={prepararBancada} className="gradient-bg rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground">Mudar a bancada destes {okIds.length} exames para Pardini</button>}
          </>)}
          {etapa === 'bancada' && (<>
            <button onClick={() => setEtapa('relatorio')} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm">Voltar</button>
            <button onClick={trocarBancada} disabled={busy || !previa} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar troca</button>
          </>)}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
