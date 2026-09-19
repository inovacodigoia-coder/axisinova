import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRightLeft, PencilLine, Plus, Trash2, History } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useUserNames, type SupportCardAudit } from '@/hooks/useSupportCards'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  cardId: string | null
}

const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR')
const show = (v: string | null) => (v && v.trim() ? v : '—')

const ACTION_META: Record<string, { label: string; icon: typeof Plus; className: string }> = {
  created: { label: 'Card criado', icon: Plus, className: 'text-primary border-primary/40 bg-primary/5' },
  field_changed: { label: 'Campo alterado', icon: PencilLine, className: 'text-secondary border-secondary/40 bg-secondary/5' },
  stage_changed: { label: 'Etapa alterada', icon: ArrowRightLeft, className: 'text-amber-600 border-amber-500/40 bg-amber-500/5' },
  deleted: { label: 'Card excluído', icon: Trash2, className: 'text-destructive border-destructive/40 bg-destructive/5' },
}

export function CardTimelineModal({ open, onOpenChange, cardId }: Props) {
  const [entries, setEntries] = useState<SupportCardAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [userFilter, setUserFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    if (!open || !cardId) return
    setLoading(true)
    setUserFilter('all'); setFrom(''); setTo('')
    supabase
      .from('support_card_audit')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEntries((data || []) as SupportCardAudit[])
        setLoading(false)
      })
  }, [open, cardId])

  const names = useUserNames(entries.map(e => e.actor_id))

  const actors = useMemo(() => {
    const seen = new Map<string, string>()
    entries.forEach(e => { if (e.actor_id) seen.set(e.actor_id, names[e.actor_id] || 'Usuário') })
    return Array.from(seen.entries())
  }, [entries, names])

  const filtered = useMemo(() => entries.filter(e => {
    if (userFilter !== 'all' && e.actor_id !== userFilter) return false
    const day = e.created_at.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  }), [entries, userFilter, from, to])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />Histórico do card
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Usuário</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {actors.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-2 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Carregando histórico...</p>}
          {!loading && filtered.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhum registro no período selecionado.
            </p>
          )}
          {filtered.map(entry => {
            const meta = ACTION_META[entry.action] || ACTION_META.field_changed
            const Icon = meta.icon
            return (
              <div key={entry.id} className="flex gap-3 rounded-lg border bg-card p-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${meta.className}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {names[entry.actor_id || ''] || 'Sistema'} · {fmt(entry.created_at)}
                    </span>
                  </div>
                  {(entry.action === 'field_changed' || entry.action === 'stage_changed') && (
                    <p className="mt-1 break-words text-sm">
                      <span className="font-medium">{entry.field_label || 'Campo'}</span>
                      {' alterado de '}
                      <span className="text-muted-foreground line-through">{show(entry.old_value)}</span>
                      {' para '}
                      <span className="text-foreground">{show(entry.new_value)}</span>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
