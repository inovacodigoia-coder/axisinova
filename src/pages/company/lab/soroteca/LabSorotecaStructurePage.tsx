import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useRegisters } from '@/context/RegistersContext'
import { useSorotecaAcesso, useSorotecaAcoes, useSorotecaResumo } from '@/hooks/useSoroteca'
import { SemAcessoSoroteca } from '@/components/lab/soroteca/SorotecaDialogs'
import { DescartarEstanteDialog } from '@/components/lab/soroteca/DescarteEstante'
import { imprimirEtiquetaEquipamento } from '@/lib/sorotecaEtiqueta'
import {
  ehEstante, erroCodigoEstante, gradeDaEstante, localDaEstante, prateleirasDe, rotuloPosicao, sugerirCodigoEstante, TIPOS_EQUIPAMENTO,
  type EquipamentoSoroteca,
} from '@/lib/soroteca'

type Tipo = EquipamentoSoroteca['tipo']
type Form = {
  id: string | null; tipo: Tipo; ativo: boolean
  // estante
  codigo: string; nome: string; linhas: string; colunas: string; workbench_id: string
  // geladeira / freezer / outro
  temperatura: string; prateleiras: string; posicoes: string
}
const SEM_BANCADA = '__nenhuma__'
const BADGE_TIPO: Record<Tipo, string> = {
  estante: 'border-primary/40 bg-primary/10 text-primary',
  geladeira: 'border-info/40 bg-info/10 text-info',
  freezer: 'border-accent bg-accent text-accent-foreground',
  outro: 'border-border bg-muted text-muted-foreground',
}
const inteiro = (v: string, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null }

const vazio = (tipo: Tipo, equipamentos: EquipamentoSoroteca[]): Form => ({
  id: null, tipo, ativo: true, codigo: sugerirCodigoEstante(equipamentos), nome: '', linhas: '4', colunas: '16', workbench_id: '',
  temperatura: tipo === 'freezer' ? '-20°C' : '2-8°C', prateleiras: '4', posicoes: '4',
})
const doEquipamento = (eq: EquipamentoSoroteca): Form => {
  const g = gradeDaEstante(eq)
  const ps = prateleirasDe(eq)
  return {
    id: eq.id, tipo: eq.tipo, ativo: eq.ativo, codigo: eq.codigo || '', nome: eq.nome, workbench_id: eq.workbench_id || '',
    linhas: String(g?.linhas ?? 4), colunas: String(g?.colunas ?? 16), temperatura: eq.temperatura || '',
    prateleiras: String(ps.length || 1), posicoes: String(Math.max(1, ...ps.map(p => p.linhas * p.colunas))),
  }
}

/** Mini visualização proporcional da grade da estante. */
function PreviaGrade({ linhas, colunas }: { linhas: number; colunas: number }) {
  if (linhas * colunas > 1500) return <p className="text-xs text-muted-foreground">Grade grande demais para a prévia.</p>
  const lado = Math.max(4, Math.min(14, Math.floor(320 / Math.max(colunas, linhas))))
  return (
    <div className="inline-grid gap-[2px] rounded-md bg-muted/60 p-2" style={{ gridTemplateColumns: `repeat(${colunas}, ${lado}px)` }} aria-hidden>
      {Array.from({ length: linhas * colunas }, (_, i) => <span key={i} className="rounded-full bg-muted-foreground/30" style={{ width: lado, height: lado }} />)}
    </div>
  )
}

export default function LabSorotecaStructurePage() {
  const acesso = useSorotecaAcesso()
  const resumo = useSorotecaResumo(!!acesso?.ver)
  const { salvarEstante, salvarArmario } = useSorotecaAcoes()
  const { workbenches } = useRegisters()
  const bancadas = useMemo(() => (workbenches || []).filter((w: any) => w.isActive !== false && w.tipo !== 'apoio'), [workbenches])
  const [form, setForm] = useState<Form | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [imprimindo, setImprimindo] = useState<string | null>(null)
  const [descartarId, setDescartarId] = useState<string | null>(null)

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!acesso.ver) return <SemAcessoSoroteca />

  const equipamentos = resumo.data?.equipamentos ?? []
  const podeImprimir = acesso.armazenar || acesso.configurar
  const estanteForm = form ? form.tipo === 'estante' : false
  const L = form ? inteiro(form.linhas, 1, 52) : null
  const C = form ? inteiro(form.colunas, 1, 99) : null
  const P = form ? inteiro(form.prateleiras, 1, 30) : null
  const X = form ? inteiro(form.posicoes, 1, 99) : null
  const erroForm = !form ? null : estanteForm
    ? (erroCodigoEstante(form.codigo) || (!L ? 'Linhas de 1 a 52' : !C ? 'Colunas de 1 a 99' : null))
    : (!form.nome.trim() ? 'Informe o nome' : !P ? 'Prateleiras de 1 a 30' : !X ? 'Posições por prateleira de 1 a 99' : null)
  const original = form?.id ? equipamentos.find(e => e.id === form.id) : null

  const imprimir = async (e: EquipamentoSoroteca) => {
    setImprimindo(e.id)
    try { toast.success(await imprimirEtiquetaEquipamento(e)) } catch (err) { toast.error((err as Error).message) } finally { setImprimindo(null) }
  }

  const salvar = async () => {
    if (!form || erroForm) return
    setSalvando(true)
    try {
      if (estanteForm) await salvarEstante({ id: form.id, codigo: form.codigo, nome: form.nome, linhas: L!, colunas: C!, workbench_id: form.workbench_id || null, ativo: form.ativo })
      else await salvarArmario({ id: form.id, nome: form.nome.trim(), tipo: form.tipo, temperatura: form.temperatura, prateleiras: P!, posicoes: X!, ativo: form.ativo })
      toast.success(form.id ? 'Equipamento atualizado' : 'Equipamento cadastrado')
      setForm(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const tiposPermitidos = TIPOS_EQUIPAMENTO.filter(t => !form?.id || (form.tipo === 'estante') === (t.value === 'estante'))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estrutura de Armazenamento</h1>
          <p className="text-muted-foreground">Estantes guardam os tubos (grade A01…); geladeiras e freezers guardam as estantes nas prateleiras</p>
        </div>
        {acesso.configurar && <Button onClick={() => setForm(vazio('estante', equipamentos))}><Plus className="mr-1.5 h-4 w-4" />Novo equipamento</Button>}
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
                  <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Estrutura</TableHead><TableHead>Local / temperatura</TableHead>
                  <TableHead>Capacidade</TableHead><TableHead>Status</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map(eq => {
                  const est = ehEstante(eq)
                  const g = gradeDaEstante(eq)
                  const ps = prateleirasDe(eq)
                  const pct = eq.capacidade ? Math.round((eq.ocupadas / eq.capacidade) * 100) : 0
                  return (
                    <TableRow key={eq.id} className={eq.ativo ? '' : 'opacity-60'}>
                      <TableCell className="font-medium">
                        {eq.nome}
                        {est && eq.codigo && <span className="block font-mono text-[11px] text-muted-foreground">{eq.codigo}</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={BADGE_TIPO[eq.tipo]}>{TIPOS_EQUIPAMENTO.find(t => t.value === eq.tipo)?.label}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {est
                          ? (g ? `${g.linhas} × ${g.colunas} · A01–${rotuloPosicao(g.linhas, g.colunas)}` : '—')
                          : `${ps.length} ${ps.length === 1 ? 'prateleira' : 'prateleiras'} × ${ps[0] ? ps[0].linhas * ps[0].colunas : 0} posições`}
                        {est && eq.bancada_nome && <span className="block text-[11px] text-muted-foreground">{eq.bancada_nome}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{est ? (localDaEstante(eq) || 'Em preenchimento') : (eq.temperatura || '—')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                          <span className="whitespace-nowrap text-xs">{eq.ocupadas.toLocaleString('pt-BR')} / {eq.capacidade.toLocaleString('pt-BR')} posições</span>
                        </div>
                      </TableCell>
                      <TableCell>{eq.ativo ? <Badge variant="outline" className="border-success/40 bg-success/10 text-success">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {podeImprimir && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => imprimir(eq)} disabled={imprimindo === eq.id}
                            aria-label={`Reimprimir etiqueta de ${eq.nome}`} title="Reimprimir etiqueta">
                            {imprimindo === eq.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                          </Button>
                        )}
                        {est && eq.ativo && acesso.descartar && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDescartarId(eq.id)}
                            aria-label={`Descartar estante ${eq.codigo}`} title="Descartar estante">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {acesso.configurar && (
                          <Button variant="ghost" size="sm" onClick={() => setForm(doEquipamento(eq))}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DescartarEstanteDialog estanteId={descartarId} onClose={() => setDescartarId(null)} />

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar equipamento' : 'Novo equipamento'}</DialogTitle>
            <DialogDescription>
              {estanteForm ? 'Estante: os tubos ficam na grade — linha = letra, coluna = número (4 × 16 = A01…D16).' : 'Geladeira / freezer: cada prateleira guarda estantes; o endereço fica Geladeira > Prateleira > Estante > posição.'}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => f && ({ ...f, tipo: v as Tipo, temperatura: f.id ? f.temperatura : v === 'freezer' ? '-20°C' : '2-8°C' }))}>
                  <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposPermitidos.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {estanteForm ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-codigo">Etiqueta / código</Label>
                    <Input id="est-codigo" value={form.codigo} maxLength={30} className="font-mono uppercase" onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-nome">Nome / identificação</Label>
                    <Input id="est-nome" value={form.nome} maxLength={80} placeholder={`Estante ${form.codigo || '…'}`} onChange={e => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-linhas">Linhas (A, B, C…)</Label>
                    <Input id="est-linhas" type="number" min={1} max={52} value={form.linhas} onChange={e => setForm({ ...form, linhas: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-colunas">Colunas (01, 02…)</Label>
                    <Input id="est-colunas" type="number" min={1} max={99} value={form.colunas} onChange={e => setForm({ ...form, colunas: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    {L && C ? (
                      <>
                        <p className="text-xs text-muted-foreground">{(L * C).toLocaleString('pt-BR')} posições: A01 até {rotuloPosicao(L, C)}</p>
                        <PreviaGrade linhas={L} colunas={C} />
                      </>
                    ) : <p className="text-xs text-destructive">Linhas de 1 a 52 e colunas de 1 a 99</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Bancada principal (opcional)</Label>
                    <Select value={form.workbench_id || SEM_BANCADA} onValueChange={v => setForm({ ...form, workbench_id: v === SEM_BANCADA ? '' : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SEM_BANCADA}>Nenhuma</SelectItem>
                        {bancadas.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="arm-nome">Nome / identificação</Label>
                    <Input id="arm-nome" value={form.nome} maxLength={80} placeholder="Geladeira 01" onChange={e => setForm({ ...form, nome: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="arm-temp">Temperatura de armazenamento (°C)</Label>
                    <Input id="arm-temp" value={form.temperatura} maxLength={40} placeholder="2-8°C" onChange={e => setForm({ ...form, temperatura: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="arm-prat">Número de prateleiras</Label>
                    <Input id="arm-prat" type="number" min={1} max={30} value={form.prateleiras} onChange={e => setForm({ ...form, prateleiras: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="arm-pos">Posições por prateleira</Label>
                    <Input id="arm-pos" type="number" min={1} max={99} value={form.posicoes} onChange={e => setForm({ ...form, posicoes: e.target.value })} />
                  </div>
                  <p className="text-[11px] text-muted-foreground sm:col-span-2">
                    Cada posição recebe uma estante. {P && X ? `Capacidade: ${(P * X).toLocaleString('pt-BR')} estantes.` : ''} Prateleira ou posição ocupada por estante não pode ser removida.
                  </p>
                </>
              )}

              {form.id && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />Equipamento ativo
                </label>
              )}
              {erroForm && <p className={cn('text-xs text-destructive sm:col-span-2')}>{erroForm}</p>}
            </div>
          )}
          <DialogFooter className="gap-2">
            {estanteForm && original && podeImprimir && (
              <Button variant="outline" className="sm:mr-auto" onClick={() => imprimir(original)} disabled={imprimindo === original.id}>
                <Printer className="mr-1.5 h-4 w-4" />Reimprimir etiqueta
              </Button>
            )}
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={!!erroForm || salvando}>{salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
