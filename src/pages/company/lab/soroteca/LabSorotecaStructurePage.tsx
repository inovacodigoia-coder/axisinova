import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRegisters } from '@/context/RegistersContext'
import { useSorotecaAcesso, useSorotecaAcoes, useSorotecaResumo } from '@/hooks/useSoroteca'
import { SemAcessoSoroteca } from '@/components/lab/soroteca/SorotecaDialogs'
import { capacidadePrateleiras, erroPrateleiras, letraLinha, prateleirasDe, TIPOS_EQUIPAMENTO, type EquipamentoSoroteca } from '@/lib/soroteca'

type PratForm = { chave: string; id: string | null; nome: string; linhas: string; colunas: string; ocupadas: number }
type Form = { id: string | null; nome: string; tipo: EquipamentoSoroteca['tipo']; temperatura: string; workbench_id: string; prateleiras: PratForm[]; ativo: boolean }
let seq = 0
const novaPrat = (n: number, linhas = '10', colunas = '16'): PratForm => ({ chave: `n${++seq}`, id: null, nome: `Prateleira ${n}`, linhas, colunas, ocupadas: 0 })
const vazio = (): Form => ({ id: null, nome: '', tipo: 'geladeira', temperatura: '2-8°C', workbench_id: '', prateleiras: [novaPrat(1)], ativo: true })
const doEquipamento = (eq: EquipamentoSoroteca): Form => ({
  id: eq.id, nome: eq.nome, tipo: eq.tipo, temperatura: eq.temperatura || '', workbench_id: eq.workbench_id || '', ativo: eq.ativo,
  prateleiras: prateleirasDe(eq).map(p => ({ chave: p.id, id: p.id, nome: p.nome, linhas: String(p.linhas), colunas: String(p.colunas), ocupadas: p.ocupadas })),
})
const ultimaPosicao = (l: number, c: number) => `${letraLinha(l)}${String(c).padStart(2, '0')}`
const SEM_BANCADA = '__nenhuma__'

export default function LabSorotecaStructurePage() {
  const acesso = useSorotecaAcesso()
  const resumo = useSorotecaResumo(!!acesso?.ver)
  const { salvarEquipamento } = useSorotecaAcoes()
  const { workbenches } = useRegisters()
  const bancadas = useMemo(() => (workbenches || []).filter((w: any) => w.isActive !== false && w.tipo !== 'apoio'), [workbenches])
  const [form, setForm] = useState<Form | null>(null)
  const [salvando, setSalvando] = useState(false)

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!acesso.ver) return <SemAcessoSoroteca />

  const equipamentos = resumo.data?.equipamentos ?? []
  const prats = (form?.prateleiras ?? []).map(p => ({ id: p.id, nome: p.nome, linhas: Number(p.linhas), colunas: Number(p.colunas) }))
  const erroPrat = form ? erroPrateleiras(prats) : null
  const valido = !!form && form.nome.trim() !== '' && !erroPrat
  const capacidade = erroPrat ? 0 : capacidadePrateleiras(prats)
  const mudarPrat = (chave: string, patch: Partial<PratForm>) =>
    setForm(f => (f ? { ...f, prateleiras: f.prateleiras.map(p => (p.chave === chave ? { ...p, ...patch } : p)) } : f))
  const adicionarPrat = () => setForm(f => {
    if (!f) return f
    const ult = f.prateleiras[f.prateleiras.length - 1]
    return { ...f, prateleiras: [...f.prateleiras, novaPrat(f.prateleiras.length + 1, ult?.linhas || '10', ult?.colunas || '16')] }
  })
  const removerPrat = (p: PratForm) => {
    if (p.ocupadas > 0) { toast.error(`A ${p.nome} tem ${p.ocupadas} amostra(s) guardada(s). Retire ou mova as amostras antes de apagar.`); return }
    setForm(f => (f ? { ...f, prateleiras: f.prateleiras.filter(x => x.chave !== p.chave) } : f))
  }

  const salvar = async () => {
    if (!form || !valido) return
    setSalvando(true)
    try {
      await salvarEquipamento({ id: form.id, nome: form.nome, tipo: form.tipo, temperatura: form.temperatura, workbench_id: form.workbench_id || null, prateleiras: prats, ativo: form.ativo })
      toast.success(form.id ? 'Equipamento atualizado' : 'Equipamento cadastrado')
      setForm(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estrutura de Armazenamento</h1>
          <p className="text-muted-foreground">Equipamentos da soroteca, suas prateleiras e a grade de posições de cada prateleira</p>
        </div>
        {acesso.configurar && <Button onClick={() => setForm(vazio())}><Plus className="mr-1.5 h-4 w-4" />Novo equipamento</Button>}
      </div>

      <Card>
        <CardHeader><CardTitle>Equipamentos</CardTitle></CardHeader>
        <CardContent>
          {resumo.isLoading ? <Skeleton className="h-40" /> : resumo.error ? (
            <p className="text-sm text-destructive">{(resumo.error as Error).message}</p>
          ) : !equipamentos.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum equipamento cadastrado ainda.{acesso.configurar ? ' Clique em “Novo equipamento” para começar.' : ''}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Temperatura</TableHead><TableHead>Bancada</TableHead>
                  <TableHead>Prateleiras</TableHead><TableHead>Ocupação</TableHead><TableHead>Status</TableHead>{acesso.configurar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map(eq => {
                  const cap = eq.capacidade
                  const ps = prateleirasDe(eq)
                  const pct = cap ? Math.round((eq.ocupadas / cap) * 100) : 0
                  return (
                    <TableRow key={eq.id} className={eq.ativo ? '' : 'opacity-60'}>
                      <TableCell className="font-medium">{eq.nome}</TableCell>
                      <TableCell>{TIPOS_EQUIPAMENTO.find(t => t.value === eq.tipo)?.label}</TableCell>
                      <TableCell>{eq.temperatura || '—'}</TableCell>
                      <TableCell>{eq.bancada_nome || 'Qualquer bancada'}</TableCell>
                      <TableCell>
                        <span className="font-medium">{ps.length} {ps.length === 1 ? 'prateleira' : 'prateleiras'}</span> · {cap.toLocaleString('pt-BR')} pos.
                        <span className="block text-[11px] text-muted-foreground">{ps.map(p => `${p.nome} (${p.linhas}×${p.colunas})`).join(' · ')}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs">{pct}% ({eq.ocupadas})</span>
                        </div>
                      </TableCell>
                      <TableCell>{eq.ativo ? <Badge variant="outline" className="border-success/40 bg-success/10 text-success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                      {acesso.configurar && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setForm(doEquipamento(eq))}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />Editar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar equipamento' : 'Novo equipamento'}</DialogTitle>
            <DialogDescription>Cada prateleira tem a própria grade: linhas viram letras (A, B, C…) e colunas números (01, 02…). A capacidade do equipamento é a soma das prateleiras.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Nome</Label><Input value={form.nome} maxLength={80} placeholder="Geladeira 01" onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v as Form['tipo'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_EQUIPAMENTO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Temperatura</Label><Input value={form.temperatura} maxLength={40} placeholder="2-8°C" onChange={e => setForm({ ...form, temperatura: e.target.value })} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Bancada</Label>
                <Select value={form.workbench_id || SEM_BANCADA} onValueChange={v => setForm({ ...form, workbench_id: v === SEM_BANCADA ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_BANCADA}>Qualquer bancada</SelectItem>
                    {bancadas.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">A entrada sugere primeiro o equipamento da mesma bancada do tubo.</p>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Prateleiras</Label>
                  <span className="text-xs text-muted-foreground">Capacidade total: <strong className="text-foreground">{capacidade.toLocaleString('pt-BR')}</strong> posições</span>
                </div>
                <div className="grid grid-cols-[1fr_5.5rem_5.5rem_2rem] gap-2 text-[11px] font-medium text-muted-foreground">
                  <span>Nome</span><span>Linhas (1–52)</span><span>Colunas (1–99)</span><span />
                </div>
                {form.prateleiras.map(p => {
                  const l = Number(p.linhas), c = Number(p.colunas)
                  const ok = Number.isInteger(l) && l >= 1 && l <= 52 && Number.isInteger(c) && c >= 1 && c <= 99
                  return (
                    <div key={p.chave} className="space-y-0.5">
                      <div className="grid grid-cols-[1fr_5.5rem_5.5rem_2rem] items-center gap-2">
                        <Input value={p.nome} maxLength={60} placeholder="Prateleira 1" aria-label="Nome da prateleira" onChange={e => mudarPrat(p.chave, { nome: e.target.value })} />
                        <Input type="number" min={1} max={52} value={p.linhas} aria-label={`Linhas da ${p.nome}`} onChange={e => mudarPrat(p.chave, { linhas: e.target.value })} />
                        <Input type="number" min={1} max={99} value={p.colunas} aria-label={`Colunas da ${p.nome}`} onChange={e => mudarPrat(p.chave, { colunas: e.target.value })} />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Apagar ${p.nome}`}
                          title={p.ocupadas > 0 ? `Tem ${p.ocupadas} amostra(s): não pode ser apagada` : 'Apagar prateleira'}
                          disabled={form.prateleiras.length === 1} onClick={() => removerPrat(p)}>
                          {p.ocupadas > 0 ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {ok ? `${(l * c).toLocaleString('pt-BR')} posições: A01 até ${ultimaPosicao(l, c)}` : 'Linhas de 1 a 52 e colunas de 1 a 99'}
                        {p.ocupadas > 0 && ` · ${p.ocupadas} amostra(s) guardada(s)`}
                      </p>
                    </div>
                  )
                })}
                <Button type="button" variant="outline" size="sm" onClick={adicionarPrat} disabled={form.prateleiras.length >= 30}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Adicionar prateleira
                </Button>
                {erroPrat && <p className="text-xs text-destructive">{erroPrat}</p>}
              </div>
              {form.id && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />Equipamento ativo
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!valido || salvando}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
