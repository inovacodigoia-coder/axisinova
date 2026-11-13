import { Plus, Trash2, Tags } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { COLETAS_PADRAO, MAX_COLETAS, MAX_NOME_COLETA, type ColetaEtiqueta } from '@/lib/coletasEtiqueta'

interface Props {
  value?: ColetaEtiqueta[]
  onChange: (v: ColetaEtiqueta[]) => void
}

/** Editar Exame: exame com coletas em tempos diferentes (ex.: Curva Glicêmica). */
export function ColetasEtiquetaCard({ value, onChange }: Props) {
  const lista = Array.isArray(value) ? value : []
  const ativo = lista.length >= 2

  const setNome = (i: number, nome: string) =>
    onChange(lista.map((c, j) => (j === i ? { nome: nome.toUpperCase().slice(0, MAX_NOME_COLETA) } : c)))
  const remover = (i: number) => {
    const next = lista.filter((_, j) => j !== i)
    onChange(next.length >= 2 ? next : [])
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Tags className="h-4 w-4" /> Coletas em tempos diferentes
          </Label>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Para exames como a Curva Glicêmica (TOTG). A 1ª coleta sai na etiqueta do tubo, junto com as outras amostras.
            Cada coleta seguinte sai numa etiqueta própria no Cadastro de Atendimento.
          </p>
        </div>
        <Switch
          checked={ativo}
          onCheckedChange={(v) => onChange(v ? COLETAS_PADRAO.map(c => ({ ...c })) : [])}
          aria-label="Coletas em tempos diferentes"
        />
      </div>

      {ativo && (
        <div className="space-y-2">
          {lista.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-bold uppercase text-muted-foreground">
                {i + 1}ª coleta
              </span>
              <Input
                value={c.nome}
                maxLength={MAX_NOME_COLETA}
                placeholder={i === 0 ? 'Ex.: JEJUM' : 'Ex.: 120 MIN'}
                onChange={(e) => setNome(i, e.target.value)}
                className="h-10 rounded-xl max-w-xs uppercase"
                aria-label={`Nome da ${i + 1}ª coleta`}
              />
              <span className="text-[11px] text-muted-foreground">
                {i === 0 ? 'Etiqueta do tubo comum' : 'Etiqueta própria'}
              </span>
              {lista.length > 2 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remover(i)} aria-label={`Remover ${i + 1}ª coleta`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          {lista.length < MAX_COLETAS && (
            <Button type="button" variant="outline" size="sm" className="rounded-xl"
              onClick={() => onChange([...lista, { nome: '' }])}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar coleta
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">
            Total: {lista.length} etiqueta(s) para este exame. O nome sai na etiqueta ao lado do código do exame (ex.: TOTG {lista[1]?.nome || '120 MIN'}).
          </p>
        </div>
      )}
    </div>
  )
}
