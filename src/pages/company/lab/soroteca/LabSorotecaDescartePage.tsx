import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, ScanBarcode, Search, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { buscarAmostras, useSorotecaAcesso, useSorotecaAcoes, useSorotecaAmostras, useSorotecaConfig } from '@/hooks/useSoroteca'
import { SemAcessoSoroteca, StatusBadge } from '@/components/lab/soroteca/SorotecaDialogs'
import { DescartePorEstante } from '@/components/lab/soroteca/DescarteEstante'
import {
  dataBR, diasRestantes, MOTIVOS_DESCARTE, prioridadeDescarte, PRIORIDADE_ORDEM, enderecoAmostra, type AmostraSoroteca, type Prioridade,
} from '@/lib/soroteca'

const BADGE: Record<Prioridade, { label: string; cls: string }> = {
  urgente: { label: 'Urgente', cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
  atencao: { label: 'Atenção', cls: 'border-warning/40 bg-warning/15 text-warning' },
  planejado: { label: 'Planejado', cls: 'border-success/40 bg-success/10 text-success' },
}
const posicaoTxt = (a: AmostraSoroteca) => enderecoAmostra(a) ?? 'Retirada'
const diasTxt = (d: number | null) => (d === null ? '—' : d < 0 ? `vencida há ${Math.abs(d)} dia(s)` : d === 0 ? 'vence hoje' : `${d} dia(s)`)

export default function LabSorotecaDescartePage() {
  const { user } = useAuth()
  const acesso = useSorotecaAcesso()
  const pode = !!acesso?.ver
  const cfg = useSorotecaConfig(pode)
  const avisoDias = cfg.data?.aviso_dias ?? 7
  const [params] = useSearchParams()
  const [aba, setAba] = useState(params.get('modo') === 'manual' ? 'manual' : params.get('modo') === 'estante' ? 'estante' : 'lote')
  const venceAte = useMemo(() => new Date(Date.now() + 30 * 86_400_000).toISOString(), [])
  const q = useSorotecaAmostras(pode ? { situacao: 'ativas', vence_ate: venceAte } : null, pode)
  const { descartar } = useSorotecaAcoes()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [confirmar, setConfirmar] = useState<AmostraSoroteca[] | null>(null)
  const [responsavel, setResponsavel] = useState('')
  const [motivo, setMotivo] = useState<string>('Validade vencida')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [manual, setManual] = useState<AmostraSoroteca[] | null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => { setResponsavel(cfg.data?.responsavel_descarte || user?.name || '') }, [cfg.data?.responsavel_descarte, user?.name])

  const candidatas = useMemo(() => {
    const agora = Date.now()
    return (q.data?.amostras ?? [])
      .map(a => ({ a, p: prioridadeDescarte(a.validade, avisoDias, agora), d: diasRestantes(a.validade, agora) }))
      .filter((x): x is { a: AmostraSoroteca; p: Prioridade; d: number | null } => !!x.p)
      .sort((x, y) => PRIORIDADE_ORDEM[x.p] - PRIORIDADE_ORDEM[y.p] || String(x.a.validade).localeCompare(String(y.a.validade)))
  }, [q.data, avisoDias])

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!pode) return <SemAcessoSoroteca />

  const marcar = (filtro: (p: Prioridade, d: number | null) => boolean) =>
    setSel(new Set(candidatas.filter(x => filtro(x.p, x.d)).map(x => x.a.id)))
  const toggle = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selecionadas = candidatas.filter(x => sel.has(x.a.id)).map(x => x.a)
  const nEquip = (lista: AmostraSoroteca[]) => new Set(lista.map(a => a.equipamento_id || 'retirada')).size

  const executar = async () => {
    if (!confirmar?.length) return
    setSalvando(true)
    try {
      const n = await descartar(confirmar.map(a => a.id), motivo === 'Outro' ? (obs.trim() || 'Outro') : motivo, responsavel, obs)
      toast.success(`${n} amostra(s) descartada(s). As posições ficaram livres.`)
      setConfirmar(null); setSel(new Set()); setObs(''); setManual(null); setCodigo('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const buscarManual = async () => {
    if (codigo.trim().length < 2) return
    setBuscando(true)
    try {
      const r = await buscarAmostras({ situacao: 'ativas', codigo: codigo.trim() })
      setManual(r.amostras)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Descarte de amostras</h1>
        <p className="text-muted-foreground">Registre o descarte das amostras vencidas ou no fim do prazo de retenção</p>
      </div>
      {!acesso.descartar && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Seu perfil pode ver a lista, mas não registrar descartes.</p>}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="lote">Lote</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="estante">Por estante</TabsTrigger>
        </TabsList>

        <TabsContent value="estante">
          <DescartePorEstante podeDescartar={acesso.descartar} ativa={aba === 'estante'} />
        </TabsContent>

        <TabsContent value="lote" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => marcar((_, d) => d !== null && d < 0)} disabled={!acesso.descartar}>Selecionar vencidas</Button>
            <Button variant="outline" size="sm" onClick={() => marcar(p => p !== 'planejado')} disabled={!acesso.descartar}>Selecionar urgentes (até {avisoDias} dias)</Button>
            {sel.size > 0 && <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>Limpar seleção</Button>}
            <Button variant="destructive" size="sm" className="ml-auto" disabled={!acesso.descartar || !selecionadas.length}
              onClick={() => { setMotivo(selecionadas.every(a => a.validade && new Date(a.validade).getTime() < Date.now()) ? 'Validade vencida' : 'Prazo de retenção atingido'); setConfirmar(selecionadas) }}>
              <Trash2 className="mr-1.5 h-4 w-4" />Descartar selecionadas ({selecionadas.length})
            </Button>
          </div>
          {q.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : q.error ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</p>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {!candidatas.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma amostra vencida ou vencendo nos próximos 30 dias.</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" /><TableHead>Prioridade</TableHead><TableHead>Amostra</TableHead><TableHead>Paciente</TableHead>
                        <TableHead>Bancada</TableHead><TableHead>Localização</TableHead><TableHead>Validade</TableHead><TableHead>Dias restantes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidatas.map(({ a, p, d }) => (
                        <TableRow key={a.id} className={cn(sel.has(a.id) && 'bg-muted/60')}>
                          <TableCell><Checkbox checked={sel.has(a.id)} onCheckedChange={() => toggle(a.id)} disabled={!acesso.descartar} aria-label={`Selecionar ${a.codigo_amostra}`} /></TableCell>
                          <TableCell><Badge variant="outline" className={BADGE[p].cls}>{BADGE[p].label}</Badge></TableCell>
                          <TableCell className="font-mono font-semibold">{a.codigo_amostra}</TableCell>
                          <TableCell>{a.patient_name || '—'}</TableCell>
                          <TableCell>{a.bancada_nome || '—'}</TableCell>
                          <TableCell>{posicaoTxt(a)}</TableCell>
                          <TableCell className={cn('text-xs font-medium', d !== null && d < 0 ? 'text-destructive' : d !== null && d <= avisoDias ? 'text-warning' : '')}>{dataBR(a.validade)}</TableCell>
                          <TableCell className="text-xs">{diasTxt(d)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <form className="relative max-w-xl" onSubmit={e => { e.preventDefault(); void buscarManual() }}>
                <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                <Input value={codigo} onChange={e => setCodigo(e.target.value)} className="h-12 pl-11 pr-12" placeholder="Bipe ou digite o código da amostra" autoFocus={aba === 'manual'} />
                <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2" disabled={buscando}>
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
              {manual && !manual.length && <p className="text-sm text-muted-foreground">Nenhuma amostra ativa encontrada com esse código (pode já ter sido descartada).</p>}
              {manual?.map(a => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                  <div className="space-y-1 text-sm">
                    <p className="font-mono text-base font-bold">{a.codigo_amostra}</p>
                    <p>{a.patient_name} · Pedido {a.protocolo} · {a.bancada_nome || '—'}</p>
                    <p className="text-xs text-muted-foreground">{posicaoTxt(a)} · Validade {dataBR(a.validade)} · <StatusBadge status={a.status_resultado} /></p>
                  </div>
                  <Button variant="destructive" disabled={!acesso.descartar} onClick={() => { setMotivo('Validade vencida'); setConfirmar([a]) }}>
                    <Trash2 className="mr-1.5 h-4 w-4" />Registrar descarte
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirmar} onOpenChange={o => !o && setConfirmar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar descarte</DialogTitle>
            <DialogDescription>{confirmar?.length} amostra(s) selecionada(s) de {confirmar ? nEquip(confirmar) : 0} equipamento(s). As posições ficam livres e cada amostra guarda o registro do descarte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Responsável pelo descarte</Label><Input value={responsavel} maxLength={120} onChange={e => setResponsavel(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MOTIVOS_DESCARTE.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Observação {motivo === 'Outro' ? '(obrigatória)' : '(opcional)'}</Label><Textarea rows={2} maxLength={500} placeholder="Ex.: descarte de rotina semanal" value={obs} onChange={e => setObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executar} disabled={salvando || !responsavel.trim() || (motivo === 'Outro' && !obs.trim())}>
              {salvando && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Confirmar descarte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
