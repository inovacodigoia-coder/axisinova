import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SupportCard, SupportCardField } from '@/hooks/useSupportCards'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  fields: SupportCardField[]
  card: SupportCard | null
  stageName?: string
  readOnly: boolean
  lockedReason?: string
  initialValues?: Record<string, string>
  sourceLabel?: string | null
  onOpenSource?: () => void
  onSubmit: (values: Record<string, string>) => Promise<void>
  onDelete?: () => void
  meta?: { createdBy?: string; createdAt?: string; updatedBy?: string; updatedAt?: string }
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—')

export function CardFormModal({ open, onOpenChange, fields, card, stageName, readOnly, lockedReason, initialValues, sourceLabel, onOpenSource, onSubmit, onDelete, meta }: Props) {

  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setValues(card?.values ? { ...card.values } : { ...(initialValues || {}) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card])


  const handleSave = async () => {
    const missing = fields.filter(f => f.is_required && !String(values[f.id] || '').trim())
    if (missing.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${missing.map(f => f.label).join(', ')}`)
      return
    }
    setSaving(true)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar o card')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {card ? 'Card' : 'Novo Card'}
            {stageName && <Badge variant="secondary">{stageName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {readOnly && lockedReason && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />{lockedReason}
          </div>
        )}

        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>
              <Label>{field.label}{field.is_required && ' *'}</Label>
              {field.field_type === 'long_text' ? (
                <Textarea
                  value={values[field.id] || ''}
                  disabled={readOnly}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                />
              ) : field.field_type === 'select' ? (
                <Select
                  value={values[field.id] || ''}
                  disabled={readOnly}
                  onValueChange={val => setValues(v => ({ ...v, [field.id]: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(field.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.field_type === 'date' ? 'date' : 'text'}
                  value={values[field.id] || ''}
                  disabled={readOnly}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum campo configurado neste quadro.</p>
          )}
        </div>

        {card && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>Criado por {meta?.createdBy || '—'} em {fmt(meta?.createdAt)}</p>
            <p>Alterado por {meta?.updatedBy || '—'} em {fmt(meta?.updatedAt)}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {card && onDelete && !readOnly ? (
            <Button variant="outline" className="text-destructive" onClick={() => onDelete()}>
              <Trash2 className="mr-1 h-4 w-4" />Excluir card
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            {!readOnly && (
              <Button className="gradient-bg text-white" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
