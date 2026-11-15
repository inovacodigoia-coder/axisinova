import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus } from 'lucide-react'
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
import { letraLinha, TIPOS_EQUIPAMENTO, type EquipamentoSoroteca } from '@/lib/soroteca'

type Form = { id: string | null; nome: string; tipo: EquipamentoSoroteca['tipo']; temperatura: string; workbench_id: string; linhas: string; colunas: string; ativo: boolean }
const VAZIO: Form = { id: null, nome: '', tipo: 'geladeira', temperatura: '2-8°C', workbench_id: '', linhas: '10', colunas: '16', ativo: true }
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
  const linhas = Number(form?.linhas), colunas = Number(form?.colunas)
  const valido = !!form && form.nome.trim() !== '' && Number.isInteger(linhas) && linhas >= 1 && linhas <= 52 && Number.isInteger(colunas) && colunas >= 1 && colunas <= 99

  const salvar = async () => {
    if (!form || !valido) return
    setSalvando(true)
    try {
      await salvarEquipamento({ id: form.id, nome: form.nome, tipo: form.tipo, temperatura: form.temperatura, workbench_id: form.workbench_id || null, linhas, colunas, ativo: form.ativo })
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
          <p className="text-muted-foreground">Equipamentos da soroteca e a grade de posições de cada um</p>
        </div>
        {acesso.configurar && <Button onClick={() => setForm({ ...VAZIO })}><Plus className="mr-1.5 h-4 w-4" />Novo equipamento</Button>}
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
                  <TableHead>Grade</TableHead><TableHead>Ocupação</TableHead><TableHead>Status</TableHead>{acesso.configurar && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map(eq => {
                  const cap = eq.linhas * eq.colunas
                  const pct = cap ? Math.round((eq.ocupadas / cap) * 100) : 0
                  return (
                    <TableRow key={eq.id} className={eq.ativo ? '' : 'opacity-60'}>
                      <TableCell className="font-medium">{eq.nome}</TableCell>
                      <TableCell>{TIPOS_EQUIPAMENTO.find(t => t.value === eq.tipo)?.label}</TableCell>
                      <TableCell>{eq.temperatura || '—'}</TableCell>
                      <TableCell>{eq.bancada_nome || 'Qualquer bancada'}</TableCell>
                      <TableCell>{eq.linhas} × {eq.colunas} ({cap.toLocaleString('pt-BR')} pos.)</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                          <span className="text-xs">{pct}% ({eq.ocupadas})</span>
                        </div>
                      </TableCell>
                      <TableCell>{eq.ativo ? <Badge variant="outline" className="border-success/40 bg-success/10 text-success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                      {acesso.configurar && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setForm({ id: eq.id, nome: eq.nome, tipo: eq.tipo, temperatura: eq.temperatura || '', workbench_id: eq.workbench_id || '', linhas: String(eq.linhas), colunas: String(eq.colunas), ativo: eq.ativo })}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar equipamento' : 'Novo equipamento'}</DialogTitle>
            <DialogDescription>As linhas viram letras (A, B, C…) e as colunas números (01, 02…). Ex.: 20 linhas × 25 colunas = 500 posições.</DialogDescription>
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
              <div className="space-y-1.5"><Label>Linhas (1 a 52)</Label><Input type="number" min={1} max={52} value={form.linhas} onChange={e => setForm({ ...form, linhas: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Colunas (1 a 99)</Label><Input type="number" min={1} max={99} value={form.colunas} onChange={e => setForm({ ...form, colunas: e.target.value })} /></div>
              {valido && <p className="text-xs text-muted-foreground sm:col-span-2">{(linhas * colunas).toLocaleString('pt-BR')} posições: A01 até {letraLinha(linhas)}{String(colunas).padStart(2, '0')}.</p>}
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
