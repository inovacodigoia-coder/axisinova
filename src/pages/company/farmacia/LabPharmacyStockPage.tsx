import { Pill } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMedicamentos } from '@/hooks/useMedicamentos'

export default function LabPharmacyStockPage() {
  const { itens, loading } = useMedicamentos()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">Medicamentos cadastrados. Controle de lote e validade será uma etapa futura.</p>
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Medicamento</TableHead><TableHead>Unidade</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
          <TableBody>
            {!loading && itens.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum medicamento cadastrado.</TableCell></TableRow>}
            {itens.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm">{m.codigo}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary" />{m.nome} {m.apresentacao}</div></TableCell>
                <TableCell className="text-sm">{m.unidade}</TableCell>
                <TableCell>{m.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
