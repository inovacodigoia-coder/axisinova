import { useMemo, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, RefreshCw, Check } from 'lucide-react'
import { useRegisters } from '@/context/RegistersContext'
import { cn } from '@/lib/utils'

interface SwitchConvenioModalProps {
  open: boolean
  onClose: () => void
  currentConvenioName?: string
  onConfirm: (convenio: { id?: string; name: string }) => void
}

export function SwitchConvenioModal({ open, onClose, currentConvenioName, onConfirm }: SwitchConvenioModalProps) {
  const { convenios } = useRegisters()
  const [selectedId, setSelectedId] = useState<string>('')

  const list = useMemo(() => convenios.filter(c => c.isActive !== false), [convenios])

  const handleConfirm = () => {
    if (selectedId === 'particular') {
      onConfirm({ id: undefined, name: 'Particular' })
    } else {
      const c = list.find(x => x.id === selectedId)
      if (!c) return
      onConfirm({ id: c.id, name: c.name })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px] p-0 gap-0 [&>button]:hidden overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-foreground uppercase">Trocar Convênio</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-3 bg-[#F8FAFC]">
          <p className="text-xs text-muted-foreground">
            Convênio atual: <span className="font-bold text-foreground uppercase">{currentConvenioName || 'Particular'}</span>
          </p>
          <ScrollArea className="h-[300px] rounded-md border border-border bg-white">
            <div className="divide-y divide-border">
              <button
                onClick={() => setSelectedId('particular')}
                className={cn("w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30", selectedId === 'particular' && "bg-emerald-50")}
              >
                <span className="text-xs font-bold uppercase text-foreground">Particular</span>
                {selectedId === 'particular' && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
              {list.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn("w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30", selectedId === c.id && "bg-emerald-50")}
                >
                  <div>
                    <div className="text-xs font-bold uppercase text-foreground">{c.name}</div>
                    {c.ansCode && <div className="text-[10px] text-muted-foreground">ANS {c.ansCode}</div>}
                  </div>
                  {selectedId === c.id && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-white">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>Trocar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
