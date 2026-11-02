import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pill, Search, Plus, Pencil, History } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { Medicamento, useFarmaciaPermissoes, useMedicamentos } from '@/hooks/useMedicamentos'

const db = supabase as any
const brl = (v: number | null) => v == null ? 'Sem custo' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })
const vazio = { nome: '', principio_ativo: '', apresentacao: '', forma: '', unidade: 'unidade', custo: '' }

export default function LabPharmacyMedsPage() {
  const { itens, loading, reload } = useMedicamentos()
  const perm = useFarmaciaPermissoes()
  const [busca, setBusca] = useState('')
  const [edit, setEdit] = useState<{ id: string | null; f: typeof vazio } | null>(null)
  const [hist, setHist] = useState<{ m: Medicamento; rows: any[] } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const lista = itens.filter(m => !busca || `${m.codigo} ${m.nome} ${m.principio_ativo || ''}`.toLowerCase().includes(busca.toLowerCase()))

  const salvar = async () => {
    if (!edit) return
    setSalvando(true)
    const { error } = await db.rpc('farmacia_medicamento_salvar', { _id: edit.id, _dados: { ...edit.f, custo: edit.f.custo.replace(',', '.') } })
    setSalvando(false)
    if (error) return toast.error(error.message)
    toast.success('Medicamento salvo')
    setEdit(null); reload()
  }
  const alternar = async (m: Medicamento) => {
    const { error } = await db.rpc('farmacia_medicamento_ativo', { _id: m.id, _ativo: !m.ativo })
    if (error) return toast.error(error.message)
    reload()
  }
  const verHistorico = async (m: Medicamento) => {
    const { data } = await db.from('farmacia_medicamento_custos').select('*').eq('medicamento_id', m.id).order('alterado_em', { ascending: false })
    setHist({ m, rows: data || [] })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-muted-foreground">Cadastro usado na prescrição, na dispensação e no custo do BI</p>
        </div>
        {perm.criar && <Button className="gap-2" onClick={() => setEdit({ id: null, f: { ...vazio } })}><Plus className="h-4 w-4" />Novo medicamento</Button>}
      </div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/app/farmacia/solicitacoes">Solicitar ao almoxarifado</Link></Button><Button variant="outline" asChild><Link to="/demonstracao/almoxarifado">Ver demonstração de abastecimento</Link></Button></div>
      <Card><CardContent className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por código, nome ou princípio ativo" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </CardContent></Card>
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Princípio ativo</TableHead>
            <TableHead>Forma / Unidade</TableHead><TableHead>Custo</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!loading && lista.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum medicamento cadastrado.</TableCell></TableRow>}
            {lista.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm">{m.codigo}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /><span className="font-medium">{m.nome}</span>{m.apresentacao && <span className="text-muted-foreground text-sm">{m.apresentacao}</span>}</div></TableCell>
                <TableCell className="text-sm">{m.principio_ativo || '—'}</TableCell>
                <TableCell className="text-sm">{m.forma || '—'} / {m.unidade}</TableCell>
                <TableCell className="text-sm">{m.custo == null ? <Badge variant="outline">Sem custo</Badge> : brl(Number(m.custo))}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={m.ativo} disabled={!perm.inativar} onCheckedChange={() => alternar(m)} />
                    <span className="text-xs">{m.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {perm.ver && <Button size="sm" variant="ghost" title="Histórico de custo" onClick={() => verHistorico(m)}><History className="h-4 w-4" /></Button>}
                  {perm.editar && <Button size="sm" variant="ghost" title="Editar" onClick={() => setEdit({ id: m.id, f: { nome: m.nome, principio_ativo: m.principio_ativo || '', apresentacao: m.apresentacao || '', forma: m.forma || '', unidade: m.unidade, custo: m.custo == null ? '' : String(m.custo) } })}><Pencil className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? 'Editar medicamento' : 'Novo medicamento'}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              {([['nome', 'Nome *'], ['principio_ativo', 'Princípio ativo'], ['apresentacao', 'Apresentação (ex.: 500 mg)'], ['forma', 'Forma (ex.: comprimido)'], ['unidade', 'Unidade'], ['custo', 'Custo unitário (R$, opcional)']] as const).map(([k, l]) => (
                <div key={k} className="space-y-1.5">
                  <Label>{l}</Label>
                  <Input value={edit.f[k]} inputMode={k === 'custo' ? 'decimal' : undefined} onChange={e => setEdit({ ...edit, f: { ...edit.f, [k]: e.target.value } })} />
                </div>
              ))}
              <p className="sm:col-span-2 text-xs text-muted-foreground">O código interno é gerado automaticamente. Toda mudança de custo fica no histórico.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !edit?.f.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hist} onOpenChange={o => !o && setHist(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Histórico de custo — {hist?.m.nome}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            {hist?.rows.length === 0 && <p className="text-muted-foreground">Sem alterações de custo.</p>}
            {hist?.rows.map(r => (
              <div key={r.id} className="flex justify-between border-b border-border py-1.5">
                <span>{new Date(r.alterado_em).toLocaleString('pt-BR')}</span>
                <span>{brl(r.custo_anterior == null ? null : Number(r.custo_anterior))} → {brl(r.custo_novo == null ? null : Number(r.custo_novo))}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
