import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, PackageOpen, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useRegisters } from '@/context/RegistersContext'
import { useSorotecaAcesso, useSorotecaAmostras, useSorotecaResumo, type FiltrosAmostras } from '@/hooks/useSoroteca'
import { AmostraDetalheDialog, RetiradaDialog, SemAcessoSoroteca, StatusBadge } from '@/components/lab/soroteca/SorotecaDialogs'
import { alertaValidade, dataBR, dataHoraBR, enderecoAmostra, localizacaoTexto } from '@/lib/soroteca'

const TODOS = '__todos__'

export default function LabSorotecaConsultaPage() {
  const acesso = useSorotecaAcesso()
  const pode = !!acesso?.ver
  const resumo = useSorotecaResumo(pode)
  const { workbenches } = useRegisters()
  const bancadas = useMemo(() => (workbenches || []).filter((w: any) => w.isActive !== false && w.tipo !== 'apoio'), [workbenches])
  const navigate = useNavigate()
  const [f, setF] = useState({ codigo: '', paciente: '', de: '', ate: '', equipamento_id: TODOS, status: TODOS, workbench_id: TODOS })
  const [filtros, setFiltros] = useState<FiltrosAmostras | null>(null)
  const q = useSorotecaAmostras(filtros, pode)
  const [detalhe, setDetalhe] = useState<string | null>(null)
  const [retirar, setRetirar] = useState<{ id: string; codigo: string } | null>(null)

  if (acesso === null) return <Skeleton className="h-96 rounded-2xl" />
  if (!pode) return <SemAcessoSoroteca />

  const avisoDias = resumo.data?.aviso_dias ?? 7
  const buscar = () => setFiltros({
    situacao: f.status === 'descartada' ? 'descartada' : 'todas',
    codigo: f.codigo.trim() || undefined,
    paciente: f.paciente.trim() || undefined,
    de: f.de || undefined,
    ate: f.ate || undefined,
    equipamento_id: f.equipamento_id === TODOS ? undefined : f.equipamento_id,
    workbench_id: f.workbench_id === TODOS ? undefined : f.workbench_id,
    status_resultado: f.status === TODOS ? undefined : f.status,
  })
  const lista = q.data?.amostras ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consulta de amostras</h1>
        <p className="text-muted-foreground">Localize qualquer amostra da soroteca, armazenada, retirada ou descartada</p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={e => { e.preventDefault(); buscar() }}>
            <Input placeholder="Código da amostra ou pedido" value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} />
            <Input placeholder="Nome ou CPF do paciente" value={f.paciente} onChange={e => setF({ ...f, paciente: e.target.value })} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Entrada de</span>
              <Input type="date" value={f.de} onChange={e => setF({ ...f, de: e.target.value })} aria-label="Entrada de" />
              <span className="text-xs text-muted-foreground">até</span>
              <Input type="date" value={f.ate} onChange={e => setF({ ...f, ate: e.target.value })} aria-label="Entrada até" />
            </div>
            <Select value={f.equipamento_id} onValueChange={v => setF({ ...f, equipamento_id: v })}>
              <SelectTrigger aria-label="Equipamento"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Equipamento: todos</SelectItem>
                {(resumo.data?.equipamentos ?? []).map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.status} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Status: todos</SelectItem>
                <SelectItem value="liberado">Liberado</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="descartada">Descartada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={f.workbench_id} onValueChange={v => setF({ ...f, workbench_id: v })}>
              <SelectTrigger aria-label="Bancada"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Bancada: todas</SelectItem>
                {bancadas.map((w: any) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="md:col-span-3 flex justify-end"><Button type="submit"><Search className="mr-1.5 h-4 w-4" />Buscar</Button></div>
          </form>
        </CardContent>
      </Card>

      {!filtros ? (
        <p className="text-sm text-muted-foreground">Preencha um ou mais filtros e clique em Buscar.</p>
      ) : q.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : q.error ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(q.error as Error).message}</p>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-sm text-muted-foreground">{lista.length.toLocaleString('pt-BR')} amostra(s){q.data?.limitado ? ' — resultados limitados, refine os filtros' : ''}</p>
            {!lista.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma amostra encontrada.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amostra</TableHead><TableHead>Paciente</TableHead><TableHead>Bancada</TableHead><TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead><TableHead>Entrada</TableHead><TableHead>Validade</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map(a => {
                    const v = a.status === 'descartada' ? null : alertaValidade(a.validade, avisoDias)
                    return (
                      <TableRow key={a.id}>
                        <TableCell><button type="button" className="font-mono font-semibold text-primary hover:underline" onClick={() => setDetalhe(a.id)}>{a.codigo_amostra}</button></TableCell>
                        <TableCell>{a.patient_name || '—'}</TableCell>
                        <TableCell>{a.bancada_nome || '—'}</TableCell>
                        <TableCell>{localizacaoTexto(a)}</TableCell>
                        <TableCell><StatusBadge status={a.status_resultado} descartada={a.status === 'descartada'} /></TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{dataHoraBR(a.armazenada_em)}</TableCell>
                        <TableCell className={cn('whitespace-nowrap text-xs font-medium', v === 'vencida' && 'text-destructive', v === 'vencendo' && 'text-warning')}>{dataBR(a.validade)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {a.status === 'armazenada' && (
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/app/soroteca?equipamento=${a.equipamento_id}&prateleira=${a.prateleira_id}&amostra=${a.id}`)}>
                                <MapPin className="mr-1 h-3.5 w-3.5" />Ver no mapa
                              </Button>
                            )}
                            {a.status === 'armazenada' && acesso.armazenar && (
                              <Button variant="ghost" size="sm" onClick={() => setRetirar({ id: a.id, codigo: a.codigo_amostra })}>
                                <PackageOpen className="mr-1 h-3.5 w-3.5" />Registrar retirada
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <AmostraDetalheDialog amostraId={detalhe} onClose={() => setDetalhe(null)} podeRetirar={acesso.armazenar} />
      <RetiradaDialog amostra={retirar} onClose={() => setRetirar(null)} />
    </div>
  )
}
