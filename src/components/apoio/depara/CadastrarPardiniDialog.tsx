import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { carregarCatalogo, db, exigePdfSugerido, norm, type CatItem } from './deparaUtils'
import { carregarMatCtx } from './CadastroPrevia'
import { terceirizarCompleto } from './autoTerceirizar'

const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())

/** Cria UM exame no LIS a partir do catálogo do Pardini e abre o Editar Exame para completar */
export function CadastrarPardiniDialog({ open, apoios, companyId, onClose }: { open: boolean; apoios: { id: string; nome: string }[]; companyId: string; onClose: () => void }) {
  const nav = useNavigate()
  const [apoioId, setApoioId] = useState('')
  const [cat, setCat] = useState<CatItem[] | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<CatItem | null>(null)
  const [nome, setNome] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setApoioId(apoios.length === 1 ? apoios[0].id : ''); setSel(null); setQ('') } }, [open, apoios])
  useEffect(() => { if (open && apoioId) { setCat(null); carregarCatalogo(apoioId).then(setCat).catch(() => toast.error('Erro ao carregar o catálogo')) } }, [open, apoioId])
  const achados = useMemo(() => {
    const n = norm(q); if (!cat || n.length < 2) return []
    return cat.filter(c => c.ativo && (norm(c.descricao).includes(n) || c.codigo.toUpperCase().includes(q.trim().toUpperCase()))).slice(0, 30)
  }, [cat, q])

  const criar = async () => {
    if (!sel || !nome.trim()) return
    setBusy(true)
    try {
      const ctx = await carregarMatCtx(companyId, apoioId)
      const mats = sel.materiais.map(m => {
        const dp = ctx.depara.find(d => norm(d.material_apoio) === norm(m))
        return (dp && ctx.materiais.find(x => x.id === dp.material_id)?.nome) || ctx.materiais.find(x => x.ativo && norm(x.nome) === norm(m))?.nome
      }).filter(Boolean) as string[]
      const { data: ex, error } = await db.from('exams').insert({ company_id: companyId, name: nome.trim(), type: 'lab', is_active: true, default_material: mats[0] ?? null, selected_materials: mats }).select('id, internal_code, name, workbench_id, default_material, selected_materials').single()
      if (error) throw error
      const r = await terceirizarCompleto(companyId, apoioId, ex, sel, exigePdfSugerido(sel.descricao))
      if (r.status === 'falha') toast.error('Exame criado, mas o laudo Pardini não foi montado', { description: r.erro })
      const { data: wb } = await db.from('lab_workbenches').select('id').eq('tipo', 'apoio').eq('apoio_id', apoioId).eq('is_active', true).limit(1).maybeSingle()
      if (wb && r.status !== 'falha') await db.rpc('bancada_trocar_cadastro', { _exam: ex.id, _bancada: wb.id, _motivo: 'Cadastrado a partir do Pardini' })
      toast.success('Exame criado a partir do Pardini', { description: 'Complete o código próprio, TUSS, preço de venda e orientações ao paciente.' + (r.pendencias.length ? ` Pendências: ${r.pendencias.join(' · ')}` : '') })
      onClose(); nav(`/app/cadastros/catalogo/${ex.id}/editar`)
    } catch (e: any) {
      toast.error('Não foi possível criar o exame', { description: e.message })
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && !busy && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Cadastrar exame do Pardini no LIS</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <select value={apoioId} onChange={e => setApoioId(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2">
            <option value="">Escolha o apoio…</option>{apoios.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar no catálogo do Pardini (nome ou código)" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3" /></div>
          {apoioId && !cat && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {achados.map(c => (
              <button key={c.codigo} onClick={() => { setSel(c); setNome(titulo(c.descricao)) }} className={`block w-full px-3 py-2 text-left text-xs hover:bg-muted/40 ${sel?.codigo === c.codigo ? 'bg-primary/10' : ''}`}>
                <b className="font-mono">{c.codigo}</b> · {c.descricao} <span className="text-muted-foreground">({c.materiais.join(', ')})</span>
              </button>
            ))}
          </div>
          {sel && (
            <label className="block text-xs">Nome do exame no LIS
              <input value={nome} onChange={e => setNome(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></label>
          )}
          <p className="text-xs text-muted-foreground">Cria só este exame, com material, laudo Pardini ajustado, metodologia e bancada do Pardini. Depois abre o Editar Exame para você completar o que o Pardini não fornece.</p>
        </div>
        <DialogFooter>
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-border px-4 py-2 text-sm">Cancelar</button>
          <button onClick={criar} disabled={busy || !sel || !nome.trim()} className="gradient-bg flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Criar exame</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
