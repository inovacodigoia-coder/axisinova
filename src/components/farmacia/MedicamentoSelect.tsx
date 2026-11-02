import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Medicamento, medicamentoLabel } from '@/hooks/useMedicamentos'

/** Seleção apenas entre medicamentos cadastrados e ativos. */
export function MedicamentoSelect({ itens, value, onChange }: { itens: Medicamento[]; value: string; onChange: (id: string, m: Medicamento) => void }) {
  return (
    <Select value={value || undefined} onValueChange={id => { const m = itens.find(x => x.id === id); if (m) onChange(id, m) }}>
      <SelectTrigger><SelectValue placeholder={itens.length ? 'Selecione o medicamento' : 'Nenhum medicamento cadastrado'} /></SelectTrigger>
      <SelectContent>
        {itens.map(m => <SelectItem key={m.id} value={m.id}>{m.codigo} · {medicamentoLabel(m)}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}
