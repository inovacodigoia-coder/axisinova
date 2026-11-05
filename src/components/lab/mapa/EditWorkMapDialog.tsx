import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useAttendanceCadastro } from '@/hooks/useAttendanceCadastro'
import { updateWorkMapItems, workMapItemKey, type WorkMapRecord } from '@/mocks/work-map.mock'

interface Item {
  key: string
  protocol: string
  patient: string
  exam: string
  bench: string
}

const semAcento = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function EditWorkMapDialog({ map, onOpenChange, onSaved }: { map: WorkMapRecord | null; onOpenChange: (o: boolean) => void; onSaved?: () => void }) {
  const { orders } = useAttendanceCadastro()
  const [kept, setKept] = useState<Set<string>>(new Set())
  const [term, setTerm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (map) { setKept(new Set(map.itemKeys)); setTerm('') }
  }, [map])

  const items = useMemo<Item[]>(() => {
    if (!map) return []
    const wanted = new Set(map.itemKeys)
    const found = new Map<string, Item>()
    ;(orders || []).forEach((o: any) => {
      ;(o.labGuides || []).forEach((g: any, gi: number) => {
        ;(g?.exams || []).forEach((e: any, ei: number) => {
          const key = workMapItemKey(o.id, gi, ei)
          if (!wanted.has(key)) return
          found.set(key, {
            key,
            protocol: o.protocol || o.orderNumber || '—',
            patient: o.patientName || '—',
            exam: e.name || e.code || '—',
            bench: e.bancadaNome || e.workbenchName || 'Sem bancada',
          })
        })
      })
    })
    return map.itemKeys.map(k => found.get(k) || { key: k, protocol: '—', patient: 'Exame não encontrado', exam: k, bench: 'Outros' })
  }, [map, orders])

  const groups = useMemo(() => {
    const t = semAcento(term.trim())
    const m = new Map<string, Item[]>()
    items
      .filter(i => !t || semAcento(`${i.protocol} ${i.patient} ${i.exam} ${i.bench}`).includes(t))
      .forEach(i => { m.set(i.bench, [...(m.get(i.bench) || []), i]) })
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items, term])

  const toggle = (keys: string[], on: boolean) => {
    setKept(prev => {
      const n = new Set(prev)
      keys.forEach(k => (on ? n.add(k) : n.delete(k)))
      return n
    })
  }

  const removed = map ? map.itemKeys.length - kept.size : 0

  const save = async () => {
    if (!map) return
    if (kept.size === 0) {
      toast.error('O mapa precisa ter ao menos um exame. Para tirar todos, exclua o mapa.')
      return
    }
    setSaving(true)
    try {
      const keys = map.itemKeys.filter(k => kept.has(k))
      const benches = Array.from(new Set(items.filter(i => kept.has(i.key)).map(i => i.bench)))
      await updateWorkMapItems(map.code, keys, benches.length === 1 ? benches[0] : 'Múltiplos')
      toast.success(`Mapa ${map.code} atualizado. ${removed} exame(s) voltaram para a fila.`)
      onSaved?.()
      onOpenChange(false)
    } catch {
      toast.error('Não foi possível salvar o mapa.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!map} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar mapa #{map?.code}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Desmarque os exames ou bancadas que devem sair do mapa. Eles voltam para a lista do Novo Mapa.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por pedido, paciente, exame ou bancada..." value={term} onChange={e => setTerm(e.target.value)} />
        </div>
        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {groups.map(([bench, list]) => {
            const keys = list.map(i => i.key)
            const all = keys.every(k => kept.has(k))
            const some = keys.some(k => kept.has(k))
            return (
              <div key={bench} className="rounded-md border">
                <label className="flex items-center gap-2 bg-muted/50 px-3 py-2 font-semibold text-sm cursor-pointer">
                  <Checkbox checked={all ? true : some ? 'indeterminate' : false} onCheckedChange={v => toggle(keys, v === true)} />
                  {bench}
                  <span className="ml-auto text-xs text-muted-foreground">{keys.filter(k => kept.has(k)).length}/{keys.length}</span>
                </label>
                <div className="divide-y">
                  {list.map(i => (
                    <label key={i.key} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/30">
                      <Checkbox checked={kept.has(i.key)} onCheckedChange={v => toggle([i.key], v === true)} />
                      <span className="w-16 font-mono text-xs">{i.protocol}</span>
                      <span className="flex-1 truncate">{i.patient}</span>
                      <span className="truncate text-muted-foreground">{i.exam}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter className="items-center gap-2">
          <span className="mr-auto text-sm text-muted-foreground">{kept.size} no mapa · {removed} para remover</span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || removed === 0}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
