import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, Settings2, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { ExamLaudo, nextLaudoCode } from '@/hooks/useExamLaudos'

interface Props {
  examId?: string
  companyId?: string
  laudos: ExamLaudo[]
  selectedLaudoId?: string
  onSelect: (laudoId: string) => void
  onReload: () => void
}

/** Lista de laudos do exame: cada laudo tem a sua própria configuração. */
export default function ExamLaudosSection({ examId, companyId, laudos, selectedLaudoId, onSelect, onReload }: Props) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', copyFrom: '' })
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setForm({ code: nextLaudoCode(laudos), name: '', copyFrom: laudos[0]?.id || '' })
    setCreating(true)
  }

  const handleCreate = async () => {
    if (!examId || !companyId) {
      toast.error('Salve o exame antes de adicionar laudos')
      return
    }
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Informe código e nome do laudo')
      return
    }
    if (laudos.some((l) => l.code.toUpperCase() === form.code.trim().toUpperCase())) {
      toast.error('Já existe um laudo com este código neste exame')
      return
    }
    const source = laudos.find((l) => l.id === form.copyFrom)
    setSaving(true)
    const { error } = await supabase.from('exam_laudos').insert({
      exam_id: examId,
      company_id: companyId,
      code: form.code.trim(),
      name: form.name.trim(),
      sort_order: (laudos.reduce((m, l) => Math.max(m, l.sort_order || 0), 0) || 0) + 1,
      is_active: true,
      methodology: source?.methodology || null,
      parameters: source?.parameters || [],
      reference_values: source?.reference_values || [],
    })
    setSaving(false)
    if (error) {
      toast.error('Não foi possível criar o laudo')
      return
    }
    toast.success('Laudo criado')
    setCreating(false)
    onReload()
  }

  const toggleActive = async (laudo: ExamLaudo, value: boolean) => {
    const activeCount = laudos.filter((l) => l.is_active).length
    if (!value && activeCount <= 1) {
      toast.error('O exame precisa ter pelo menos um laudo ativo')
      return
    }
    const { error } = await supabase.from('exam_laudos').update({ is_active: value }).eq('id', laudo.id)
    if (error) {
      toast.error('Não foi possível alterar o laudo')
      return
    }
    onReload()
  }

  const changeOrder = async (laudo: ExamLaudo, order: number) => {
    const { error } = await supabase.from('exam_laudos').update({ sort_order: order }).eq('id', laudo.id)
    if (error) {
      toast.error('Não foi possível alterar a ordem')
      return
    }
    onReload()
  }

  const remove = async (laudo: ExamLaudo) => {
    if (laudos.length <= 1) {
      toast.error('O exame precisa ter pelo menos um laudo')
      return
    }
    if (!confirm(`Excluir o laudo "${laudo.name}"? A configuração dele será perdida.`)) return
    const { error } = await supabase.from('exam_laudos').delete().eq('id', laudo.id)
    if (error) {
      toast.error('Não foi possível excluir o laudo')
      return
    }
    toast.success('Laudo excluído')
    if (selectedLaudoId === laudo.id) onSelect(laudos.find((l) => l.id !== laudo.id)!.id)
    onReload()
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Laudos deste exame</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={openCreate} disabled={!examId}>
          <Plus className="h-4 w-4" /> Adicionar laudo
        </Button>
      </div>

      {!examId && (
        <p className="text-xs text-muted-foreground">
          Salve o exame para configurar os laudos. Todo exame novo nasce com um laudo padrão.
        </p>
      )}

      <div className="space-y-2">
        {laudos.map((laudo) => (
          <div
            key={laudo.id}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              selectedLaudoId === laudo.id ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <Badge variant="outline" className="font-black text-[10px]">{laudo.code}</Badge>
            <span className="flex-1 text-sm font-semibold">{laudo.name}</span>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Ordem</Label>
              <Input
                type="number"
                min={1}
                value={laudo.sort_order}
                onChange={(e) => changeOrder(laudo, parseInt(e.target.value, 10) || 1)}
                className="h-8 w-16"
              />
            </div>
            <Switch checked={laudo.is_active} onCheckedChange={(v) => toggleActive(laudo, v)} />
            <Button
              size="sm"
              variant={selectedLaudoId === laudo.id ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => onSelect(laudo.id)}
            >
              <Settings2 className="h-3.5 w-3.5" /> Configurar
            </Button>
            <Button size="icon" variant="ghost" className="text-rose-600" onClick={() => remove(laudo)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {selectedLaudoId && laudos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          As abas Parâmetros e Máscara, Metodologia Analítica e Valores de Referência estão editando o laudo{' '}
          <strong>{laudos.find((l) => l.id === selectedLaudoId)?.name}</strong>.
        </p>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo laudo do exame</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Laudo ZYBIO EXC200"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Copiar configuração de</Label>
              <Select value={form.copyFrom} onValueChange={(v) => setForm({ ...form, copyFrom: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Começar vazio" />
                </SelectTrigger>
                <SelectContent>
                  {laudos.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <Copy className="h-3 w-3" /> {l.code} — {l.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button className="gradient-bg text-white" onClick={handleCreate} disabled={saving}>
              Criar laudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
