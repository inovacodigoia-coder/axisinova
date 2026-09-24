import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Loader2, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  examId?: string
  companyId?: string
  bancadaNova: { id: string; name: string; tipo?: string } | null
  bancadaAtualNome?: string
  laudos: { id: string; code: string; name: string }[]
  /** exame novo: só valida prontidão, não há pedidos */
  somenteValidar?: boolean
  onConfirmed: (bancadaId: string) => void
}

type Prontidao = { bloqueios: string[]; avisos: string[]; tipo?: string; apoio_nome?: string }
type Item = { pedido: string; paciente: string; data: string; motivo?: string }
type Previa = { mover: Item[]; ficam: Item[]; nao_movidos: Item[] }

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

function Lista({ itens, vazio }: { itens: Item[]; vazio: string }) {
  if (!itens.length) return <p className="text-xs text-muted-foreground">{vazio}</p>
  return (
    <div className="max-h-40 overflow-auto rounded-md border divide-y text-xs">
      {itens.map((i, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5">
          <span className="truncate">{i.paciente || '—'}</span>
          <span className="font-mono">{i.pedido}</span>
          <span className="text-muted-foreground">{i.motivo || fmt(i.data)}</span>
        </div>
      ))}
    </div>
  )
}

export default function BancadaTrocaDialog({ open, onOpenChange, examId, companyId, bancadaNova, bancadaAtualNome, laudos, somenteValidar, onConfirmed }: Props) {
  const [loading, setLoading] = useState(false)
  const [pront, setPront] = useState<Prontidao | null>(null)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [motivo, setMotivo] = useState('')
  const [laudoLigar, setLaudoLigar] = useState('__padrao__')
  const [saving, setSaving] = useState(false)

  const carregar = async () => {
    if (!examId || !bancadaNova) return
    setLoading(true)
    const [p, v] = await Promise.all([
      supabase.rpc('bancada_prontidao' as any, { _exam: examId, _bancada: bancadaNova.id }),
      somenteValidar ? Promise.resolve({ data: null, error: null }) : supabase.rpc('bancada_troca_previa' as any, { _exam: examId, _bancada: bancadaNova.id }),
    ])
    setLoading(false)
    if (p.error) { toast.error(p.error.message); return }
    setPront(p.data as any)
    if (v.error) toast.error(v.error.message)
    else setPrevia(v.data as any)
  }

  useEffect(() => {
    if (open) { setPront(null); setPrevia(null); setMotivo(''); setLaudoLigar('__padrao__'); carregar() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, examId, bancadaNova?.id])

  const faltaLaudo = !!pront?.bloqueios?.some(b => b.startsWith('Nenhum laudo ligado'))

  const ligarLaudo = async () => {
    if (!examId || !bancadaNova || !companyId) return
    const { error } = await supabase.from('exame_laudo_bancada' as any).upsert({
      company_id: companyId, exame_id: examId, bancada_id: bancadaNova.id,
      laudo_id: laudoLigar === '__padrao__' ? null : laudoLigar, ativo: true,
    } as any, { onConflict: 'exame_id,bancada_id' })
    if (error) { toast.error(error.message); return }
    toast.success('Laudo ligado à bancada')
    carregar()
  }

  const confirmar = async () => {
    if (!examId || !bancadaNova) return
    if (somenteValidar) { onConfirmed(bancadaNova.id); onOpenChange(false); return }
    setSaving(true)
    const { data, error } = await supabase.rpc('bancada_trocar_cadastro' as any, { _exam: examId, _bancada: bancadaNova.id, _motivo: motivo.trim() || null })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    const r = data as any
    const naoMov = (r?.nao_movidos || []).length
    toast.success(`Bancada trocada. ${r?.movidos ?? 0} exame(s) movido(s), ${r?.ficaram ?? 0} ficaram na bancada antiga${naoMov ? `, ${naoMov} não movido(s): já em remessa` : ''}.`)
    onConfirmed(bancadaNova.id)
    onOpenChange(false)
  }

  const bloqueado = !pront || (pront.bloqueios?.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Trocar bancada {bancadaAtualNome ? <span className="text-muted-foreground font-normal">{bancadaAtualNome} →</span> : null} {bancadaNova?.name}
            {bancadaNova?.tipo === 'apoio' && <Truck className="h-4 w-4 text-primary" />}
          </DialogTitle>
          <DialogDescription>
            O laudo, o prazo e a data de liberação acompanham a bancada. A troca vale para pedidos novos e para os pedidos ainda não coletados.
          </DialogDescription>
        </DialogHeader>

        {loading || !pront ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">1. Prontidão</h4>
              {pront.bloqueios.length === 0 && (
                <p className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Tudo pronto para a bancada nova.</p>
              )}
              {pront.bloqueios.map((b, i) => (
                <p key={i} className="flex items-start gap-2 text-sm text-destructive"><XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {b}</p>
              ))}
              {pront.avisos.map((a, i) => (
                <p key={i} className="flex items-start gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {a}</p>
              ))}
              {faltaLaudo && (
                <div className="flex items-end gap-2 rounded-lg border border-dashed p-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Ligar laudo agora</Label>
                    <select value={laudoLigar} onChange={e => setLaudoLigar(e.target.value)} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
                      <option value="__padrao__">Laudo padrão do exame</option>
                      {laudos.map(l => <option key={l.id} value={l.id}>{l.code} · {l.name}</option>)}
                    </select>
                  </div>
                  <Button size="sm" variant="outline" onClick={ligarLaudo}>Ligar</Button>
                </div>
              )}
            </section>

            {!somenteValidar && previa && (
              <section className="space-y-3">
                <h4 className="text-sm font-semibold">2. Prévia do impacto</h4>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Serão movidos <Badge variant="secondary">{previa.mover.length}</Badge> exame(s) de pedidos ainda NÃO coletados</p>
                  <Lista itens={previa.mover} vazio="Nenhum pedido pendente não coletado." />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium">Permanecem na bancada antiga <Badge variant="secondary">{previa.ficam.length}</Badge> exame(s) já coletados/em processamento</p>
                  <Lista itens={previa.ficam} vazio="Nenhum." />
                </div>
                {previa.nao_movidos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-destructive">Não movidos: já em remessa ({previa.nao_movidos.length})</p>
                    <Lista itens={previa.nao_movidos} vazio="" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} placeholder="Ex.: equipamento desativado" />
                </div>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={bloqueado || saving} className="gradient-bg text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {somenteValidar ? 'Usar esta bancada' : 'Confirmar troca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
