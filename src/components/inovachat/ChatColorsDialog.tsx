import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type ChatColor = 'default' | 'white' | 'gray' | 'green' | 'blue' | 'rose' | 'dark'
export type ChatColors = { background: ChatColor; received: ChatColor; sent: ChatColor }
export const DEFAULT_CHAT_COLORS: ChatColors = { background: 'default', received: 'default', sent: 'default' }
const OPTIONS: { value: ChatColor; label: string }[] = [
  { value: 'default', label: 'Padrão' }, { value: 'white', label: 'Branco' },
  { value: 'gray', label: 'Cinza' }, { value: 'green', label: 'Verde' },
  { value: 'blue', label: 'Azul' }, { value: 'rose', label: 'Rosa' }, { value: 'dark', label: 'Escuro' },
]
const FIELDS: { key: keyof ChatColors; label: string }[] = [
  { key: 'background', label: 'Fundo da conversa' },
  { key: 'received', label: 'Mensagens recebidas' },
  { key: 'sent', label: 'Mensagens enviadas' },
]

export function ChatColorsDialog({ colors, onApply, onClose }: {
  colors: ChatColors; onApply: (colors: ChatColors) => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(colors)
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Cores da conversa</DialogTitle></DialogHeader>
        <div className="space-y-5">
          {FIELDS.map(field => (
            <fieldset key={field.key}>
              <legend className="mb-2 text-sm font-medium">{field.label}</legend>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map(option => (
                  <Button key={option.value} type="button" variant="outline" size="icon"
                    aria-label={`${field.label}: ${option.label}`} title={option.label}
                    aria-pressed={draft[field.key] === option.value}
                    onClick={() => setDraft(prev => ({ ...prev, [field.key]: option.value }))}
                    data-chat-swatch={option.value}
                    className="chat-color-swatch h-10 w-10 rounded-full aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-background">
                    {draft[field.key] === option.value && <Check className="h-4 w-4" />}
                  </Button>
                ))}
              </div>
            </fieldset>
          ))}
          <div aria-label="Prévia das cores" data-chat-background={draft.background} data-chat-received={draft.received} data-chat-sent={draft.sent}
            className="chat-color-scope chat-conversation-background space-y-3 rounded-lg border border-border p-4">
            <p className="chat-bubble-received w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm">Olá, bom dia!</p>
            <p className="chat-bubble-sent ml-auto w-fit max-w-[85%] rounded-lg px-3 py-2 text-sm">Bom dia! Tudo bem?</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setDraft({ ...DEFAULT_CHAT_COLORS })}><RotateCcw className="mr-2 h-4 w-4" />Restaurar padrão</Button>
          <Button onClick={() => { onApply(draft); onClose() }}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}