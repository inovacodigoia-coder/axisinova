import { useEffect, useState } from 'react'
import { Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DIAS_PADRAO, FORA_HORARIO_PADRAO, NOMES_DIA, ORDEM_DIAS, horarioTexto, renderForaHorario, type DiaHorario } from '@/lib/inovachatHorario'

interface Feriado { data: string; descricao: string }
interface Linha { setor_id: string | null; ativo: boolean; dias: DiaHorario[]; feriados: Feriado[] }

const ordenar = (d: DiaHorario[]) => ORDEM_DIAS.map(x => d.find(y => y.d === x) ?? DIAS_PADRAO.find(y => y.d === x)!)

/** Horário de atendimento: um para a empresa e, opcionalmente, um diferente por setor. */
export function HorarioDialog({ open, onClose, setores, empresa }: { open: boolean; onClose: () => void; setores: Record<string, string>; empresa: string }) {
  const [linhas, setLinhas] = useState<Record<string, Linha>>({})
  const [sel, setSel] = useState('')
  const [msgAtivo, setMsgAtivo] = useState(true)
  const [msg, setMsg] = useState(FORA_HORARIO_PADRAO)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    setSel('')
    void supabase.from('inovachat_horario').select('setor_id, ativo, dias, feriados').then(({ data }) => {
      const m: Record<string, Linha> = {}
      for (const r of (data ?? []) as any[]) m[r.setor_id ?? ''] = { setor_id: r.setor_id, ativo: r.ativo, dias: ordenar(r.dias), feriados: r.feriados ?? [] }
      setLinhas(m)
    })
    void supabase.from('inovachat_fora_horario_cfg').select('ativo, texto').maybeSingle().then(({ data }) => {
      if (data) { setMsgAtivo((data as any).ativo); setMsg((data as any).texto) } else { setMsgAtivo(true); setMsg(FORA_HORARIO_PADRAO) }
    })
  }, [open])

  const empresaLinha = linhas[''] ?? { setor_id: null, ativo: true, dias: DIAS_PADRAO, feriados: [] }
  const atual: Linha = linhas[sel] ?? (sel ? { setor_id: sel, ativo: false, dias: empresaLinha.dias, feriados: empresaLinha.feriados } : empresaLinha)
  const mudar = (patch: Partial<Linha>) => setLinhas(l => ({ ...l, [sel]: { ...atual, ...patch } }))
  const mudarDia = (d: number, patch: Partial<DiaHorario>) => mudar({ dias: atual.dias.map(x => x.d === d ? { ...x, ...patch } : x) })

  const salvar = async () => {
    for (const d of atual.dias) if (d.a && d.i >= d.f) { toast.error(`${NOMES_DIA[d.d]}: o fechamento deve ser depois da abertura.`); return }
    if (atual.feriados.some(f => !f.data)) { toast.error('Informe a data de cada feriado.'); return }
    if (!msg.trim()) { toast.error('A mensagem não pode ficar vazia.'); return }
    setSalvando(true)
    const { error } = await supabase.rpc('inovachat_horario_salvar', { p_setor: sel || null, p_ativo: sel ? atual.ativo : true, p_dias: atual.dias as any, p_feriados: atual.feriados as any })
    const { error: e2 } = error ? { error: null } : await supabase.rpc('inovachat_fora_horario_salvar', { p_ativo: msgAtivo, p_texto: msg })
    setSalvando(false)
    if (error || e2) { toast.error((error ?? e2)!.message); return }
    toast.success('Horário salvo.')
  }

  const horario = horarioTexto(atual.dias)
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horário de atendimento</DialogTitle>
          <DialogDescription>Fuso America/Fortaleza. Setores usam o horário da empresa, a menos que tenham horário próprio ativo.</DialogDescription>
        </DialogHeader>
        <select value={sel} onChange={e => setSel(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Empresa (padrão)</option>
          {Object.entries(setores).map(([id, n]) => <option key={id} value={id}>Setor: {n}{linhas[id]?.ativo ? ' (horário próprio)' : ''}</option>)}
        </select>
        {sel && (
          <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
            <span>Este setor tem horário diferente</span>
            <Switch checked={atual.ativo} onCheckedChange={v => mudar({ ativo: v })} />
          </label>
        )}
        <div className={sel && !atual.ativo ? 'pointer-events-none space-y-2 opacity-50' : 'space-y-2'}>
          {atual.dias.map(d => (
            <div key={d.d} className="flex flex-wrap items-center gap-2">
              <span className="w-20 text-sm capitalize">{NOMES_DIA[d.d]}</span>
              <Switch checked={d.a} onCheckedChange={v => mudarDia(d.d, { a: v })} aria-label={`${NOMES_DIA[d.d]} aberto`} />
              <span className="w-14 text-xs text-muted-foreground">{d.a ? 'Aberto' : 'Fechado'}</span>
              <Input type="time" value={d.i} disabled={!d.a} onChange={e => mudarDia(d.d, { i: e.target.value })} className="h-10 w-28" />
              <span className="text-xs">às</span>
              <Input type="time" value={d.f} disabled={!d.a} onChange={e => mudarDia(d.d, { f: e.target.value })} className="h-10 w-28" />
            </div>
          ))}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Datas fechadas (feriados)</p>
              <Button size="sm" variant="outline" onClick={() => mudar({ feriados: [...atual.feriados, { data: '', descricao: '' }] })}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
            </div>
            {atual.feriados.map((f, i) => (
              <div key={i} className="flex gap-2">
                <Input type="date" value={f.data} onChange={e => mudar({ feriados: atual.feriados.map((x, j) => j === i ? { ...x, data: e.target.value } : x) })} className="h-10 w-40" />
                <Input value={f.descricao} maxLength={80} placeholder="Descrição" onChange={e => mudar({ feriados: atual.feriados.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x) })} className="h-10 flex-1" />
                <Button size="icon" variant="ghost" className="h-10 w-10" aria-label="Remover" onClick={() => mudar({ feriados: atual.feriados.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Mensagem automática fora do horário</p>
            <label className="flex items-center gap-2 text-xs">Ativo <Switch checked={msgAtivo} onCheckedChange={setMsgAtivo} /></label>
          </div>
          <div className="flex flex-wrap gap-1">
            {['{nome_contato}', '{empresa}', '{horario_atendimento}'].map(v => (
              <button key={v} type="button" onClick={() => setMsg(m => m + v)} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">{v}</button>
            ))}
          </div>
          <Textarea value={msg} onChange={e => setMsg(e.target.value)} maxLength={1000} rows={4} />
          <p className="text-xs text-muted-foreground">Pré-visualização:</p>
          <div className="whitespace-pre-wrap rounded-md bg-muted p-2 text-sm">
            <strong>{empresa || 'Empresa'}</strong>:{'\n'}{renderForaHorario(msg, { nome_contato: 'Maria', empresa: empresa || 'Empresa', horario })}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setMsg(FORA_HORARIO_PADRAO)}><RotateCcw className="mr-1 h-4 w-4" />Restaurar padrão</Button>
          <p className="text-[11px] text-muted-foreground">Enviada no máximo 1 vez a cada 12 horas por contato; não sai se um atendente respondeu nos últimos 30 minutos nem para respostas de confirmação.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={() => void salvar()} disabled={salvando} className="gradient-bg text-primary-foreground">{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
