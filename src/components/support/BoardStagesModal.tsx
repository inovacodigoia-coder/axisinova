import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowDown, ArrowUp, Flag, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useBoardStages } from '@/hooks/useSupportBoards'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  boardId: string | null
  boardName: string
  companyId: string | null
  onChanged?: () => void
}

export function BoardStagesModal({ open, onOpenChange, boardId, boardName, companyId, onChanged }: Props) {
  const { stages, addStage, updateStage, deleteStage, moveStage } = useBoardStages(open ? boardId : null, companyId)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#00D4FF')

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); onChanged?.() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Operação não permitida') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Etapas — {boardName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <input
                type="color"
                value={stage.color}
                onChange={e => run(() => updateStage(stage.id, { color: e.target.value }))}
                className="h-8 w-8 cursor-pointer rounded border bg-transparent"
                aria-label="Cor da etapa"
              />
              <Input
                defaultValue={stage.name}
                onBlur={e => {
                  const value = e.target.value.trim()
                  if (value && value !== stage.name) run(() => updateStage(stage.id, { name: value }))
                }}
                className="w-56"
              />
              {stage.is_start && <Badge variant="secondary"><Play className="mr-1 h-3 w-3" />Início</Badge>}
              {stage.is_end && <Badge variant="secondary"><Flag className="mr-1 h-3 w-3" />Fim</Badge>}

              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => run(() => moveStage(stage.id, -1))}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={index === stages.length - 1} onClick={() => run(() => moveStage(stage.id, 1))}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={stage.is_start} onClick={() => run(() => updateStage(stage.id, { is_start: true, is_end: false }))}>
                  Início
                </Button>
                <Button size="sm" variant="outline" disabled={stage.is_end} onClick={() => run(() => updateStage(stage.id, { is_end: true, is_start: false }))}>
                  Fim
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => run(() => deleteStage(stage.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-dashed p-3">
            <Label className="mb-2 block">Nova etapa</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border bg-transparent"
                aria-label="Cor da nova etapa"
              />
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome da etapa" />
              <Button
                className="gradient-bg text-white"
                onClick={() => {
                  if (!newName.trim()) { toast.error('Informe o nome da etapa'); return }
                  run(async () => { await addStage(newName, newColor); setNewName('') })
                }}
              >
                <Plus className="mr-1 h-4 w-4" />Adicionar
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            O quadro precisa manter no mínimo 2 etapas, com exatamente uma marcada como Início e uma como Fim.
            Cartões que chegarem à etapa de Fim ficarão arquivados e bloqueados para edição.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
