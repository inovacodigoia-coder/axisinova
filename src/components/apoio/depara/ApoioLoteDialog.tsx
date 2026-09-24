import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { carregarCatalogo, db, exigePdfSugerido, sugerir, type CatItem, type ExameLis } from './deparaUtils'

interface Linha { exame: ExameLis; opcoes: CatItem[]; codigo: string; decisao: 'aceitar' | 'pular' }

/** Terceirizar vários: sugere, o usuário revisa, grava só os aprovados */
export function ApoioLoteDialog({ open, exames, apoios, companyId, onClose, onSaved }: {
  open: boolean; exames: ExameLis[]; apoios: { id: string; nome: string }[]; companyId: string; onClose: () => void; onSaved: () => void
}) {
  const [apoioId, setApoioId] = useState('')
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setApoioId(apoios.length === 1 ? apoios[0].id : ''); setLinhas(null) } }, [open, apoios])

  useEffect(() => {
    if (!open || !apoioId) return
    setBusy(true); setLinhas(null)
    carregarCatalogo(apoioId).then(cat => {
      setLinhas(exames.map(e => {
        const s = sugerir(e, cat, 5).map(x => x.item)
        return { exame: e, opcoes: s, codigo: s[0]?.codigo || '', decisao: s[0] ? 'aceitar' : 'pular' }
      }))
    }).catch(() => toast.error('Erro ao carregar a referência do apoio')).finally(() => setBusy(false))
  }, [open, apoioId, exames])

  const aprovados = (linhas || []).filter(l => l.decisao === 'aceitar' && l.codigo)
  const gravar = async () => {
    if (!aprovados.length) return
    setBusy(true)
    try {
      const rows = aprovados.map(l => ({
        company_id: companyId, exame_id: l.exame.id, apoio_id: apoioId, codigo_apoio: l.codigo, ativo: true,
        exige_pdf: exigePdfSugerido(l.opcoes.find(o => o.codigo === l.codigo)?.descricao || ''),
      }))
      const { error } = await db.from('apoio_depara_exame').upsert(rows, { onConflict: 'company_id,exame_id,apoio_id' })
      if (error) throw error
      toast.success(`${rows.length} exame(s) terceirizado(s). Faça o De/Para de analitos de cada um.`)
      onSaved(); onClose()
    } catch (e: any) {
      toast.error('Não foi possível gravar', { description: e.message })
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Terceirizar vários ({exames.length} exames)</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <select value={apoioId} onChange={e => setApoioId(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2">
            <option value="">Escolha o apoio…</option>
            {apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          {busy && !linhas && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando sugestões…</p>}
          {linhas && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2">Nosso exame</th><th className="px-3 py-2">Exame no apoio (sugerido)</th><th className="px-3 py-2">Decisão</th></tr></thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={l.exame.id} className="border-t border-border">
                      <td className="px-3 py-2"><b>{l.exame.internal_code || '—'}</b> · {l.exame.name}</td>
                      <td className="px-3 py-2">
                        {l.opcoes.length === 0 ? <span className="text-muted-foreground">Nenhuma sugestão (terceirize pelo botão individual)</span> : (
                          <select value={l.codigo} onChange={e => setLinhas(ls => ls!.map((x, j) => j === i ? { ...x, codigo: e.target.value } : x))} className="w-full rounded-lg border border-input bg-background px-2 py-1">
                            {l.opcoes.map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} · {o.descricao} ({o.materiais.join(', ')})</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <label className="mr-3"><input type="radio" className="accent-primary" disabled={!l.opcoes.length} checked={l.decisao === 'aceitar'} onChange={() => setLinhas(ls => ls!.map((x, j) => j === i ? { ...x, decisao: 'aceitar' } : x))} /> Aceitar</label>
                        <label><input type="radio" className="accent-primary" checked={l.decisao === 'pular'} onChange={() => setLinhas(ls => ls!.map((x, j) => j === i ? { ...x, decisao: 'pular' } : x))} /> Pular</label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={gravar} disabled={busy || !aprovados.length} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && linhas && <Loader2 className="h-4 w-4 animate-spin" />} Gravar {aprovados.length} aprovado(s)</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
