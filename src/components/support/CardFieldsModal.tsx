import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { FIELD_TYPE_LABELS, type SupportCardField, type SupportFieldType } from '@/hooks/useSupportCards'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  fields: SupportCardField[]
  onSave: (input: Partial<SupportCardField> & { label: string; field_type: SupportFieldType }) => Promise<void>
  onDelete: (fieldId: string) => Promise<void>
  onMove: (fieldId: string, direction: -1 | 1) => Promise<void>
}

const emptyDraft = {
  id: undefined as string | undefined,
  label: '',
  field_type: 'short_text' as SupportFieldType,
  options: [] as string[],
  is_required: false,
  show_on_card: true,
}

export function CardFieldsModal({ open, onOpenChange, fields, onSave, onDelete, onMove }: Props) {
  const [draft, setDraft] = useState({ ...emptyDraft })
  const [optionInput, setOptionInput] = useState('')

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Operação não permitida') }
  }

  const handleSave = async () => {
    if (!draft.label.trim()) { toast.error('Informe o nome do campo'); return }
    if (draft.field_type === 'select' && draft.options.length === 0) {
      toast.error('Cadastre ao menos uma opção para o campo de seleção'); return
    }
    await run(async () => {
      await onSave(draft)
      setDraft({ ...emptyDraft })
      toast.success('Campo salvo')
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Configurar Campos do Card</DialogTitle></DialogHeader>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{field.label}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{FIELD_TYPE_LABELS[field.field_type]}</Badge>
                  {field.is_required && <Badge variant="secondary" className="text-[10px]">Obrigatório</Badge>}
                  {field.show_on_card && <Badge variant="secondary" className="text-[10px]">Resumido</Badge>}
                </div>
              </div>
              <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => run(() => onMove(field.id, -1))}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" disabled={index === fields.length - 1} onClick={() => run(() => onMove(field.id, 1))}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft({
                id: field.id, label: field.label, field_type: field.field_type,
                options: field.options || [], is_required: field.is_required, show_on_card: field.show_on_card,
              })}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => run(async () => { await onDelete(field.id); toast.success('Campo excluído') })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-2 space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-semibold">{draft.id ? 'Editar campo' : 'Novo campo'}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nome do campo *</Label>
              <Input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={draft.field_type} onValueChange={(v: SupportFieldType) => setDraft(d => ({ ...d, field_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {draft.field_type === 'select' && (
            <div>
              <Label>Opções</Label>
              <div className="flex gap-2">
                <Input value={optionInput} onChange={e => setOptionInput(e.target.value)} placeholder="Nova opção" />
                <Button variant="outline" onClick={() => {
                  const value = optionInput.trim()
                  if (!value) return
                  setDraft(d => ({ ...d, options: [...d.options, value] }))
                  setOptionInput('')
                }}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {draft.options.map(opt => (
                  <Badge key={opt} variant="secondary" className="gap-1">
                    {opt}
                    <button onClick={() => setDraft(d => ({ ...d, options: d.options.filter(o => o !== opt) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.is_required} onCheckedChange={v => setDraft(d => ({ ...d, is_required: !!v }))} />
              Obrigatório
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.show_on_card} onCheckedChange={v => setDraft(d => ({ ...d, show_on_card: !!v }))} />
              Mostrar resumido na face do card
            </label>
          </div>

          <div className="flex justify-end gap-2">
            {draft.id && <Button variant="outline" onClick={() => setDraft({ ...emptyDraft })}>Cancelar edição</Button>}
            <Button className="gradient-bg text-white" onClick={handleSave}>Salvar campo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
