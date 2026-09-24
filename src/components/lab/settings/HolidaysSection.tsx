import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarDays, Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

type Feriado = {
  id: string
  company_id: string | null
  data: string
  descricao: string
  abrangencia: 'nacional' | 'estadual' | 'municipal'
  uf: string | null
  municipio: string | null
}

const empty = { id: '', data: '', descricao: '', abrangencia: 'estadual' as 'estadual' | 'municipal', uf: '', municipio: '' }

const fmt = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
const weekday = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('pt-BR', { weekday: 'long' })
}

export default function HolidaysSection() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [items, setItems] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<typeof empty | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await (supabase.from('feriado' as any) as any)
      .select('*')
      .gte('data', `${year}-01-01`)
      .lte('data', `${year}-12-31`)
      .order('data')
    setLoading(false)
    if (error) return toast.error('Não foi possível carregar os feriados')
    setItems((data || []) as Feriado[])
  }

  useEffect(() => { load() }, [year])

  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - 1 + i), [currentYear])

  const loadNational = async () => {
    const { data, error } = await supabase.rpc('carregar_feriados_nacionais' as any, { _ano: year })
    if (error) return toast.error('Falha ao carregar feriados nacionais')
    toast.success(Number(data) > 0 ? `${data} feriado(s) nacional(is) adicionados` : 'Os feriados nacionais deste ano já estavam cadastrados')
    load()
  }

  const save = async () => {
    if (!form) return
    if (!form.data || !form.descricao.trim()) return toast.error('Informe data e descrição')
    if (form.abrangencia === 'estadual' && !form.uf.trim()) return toast.error('Informe a UF')
    if (form.abrangencia === 'municipal' && (!form.uf.trim() || !form.municipio.trim())) return toast.error('Informe UF e município')
    setSaving(true)
    const payload = {
      data: form.data,
      descricao: form.descricao.trim(),
      abrangencia: form.abrangencia,
      uf: form.uf.trim().toUpperCase() || null,
      municipio: form.abrangencia === 'municipal' ? form.municipio.trim() : null,
    }
    let error
    if (form.id) {
      ({ error } = await (supabase.from('feriado' as any) as any).update(payload).eq('id', form.id))
    } else {
      const { data: auth } = await supabase.auth.getUser()
      const { data: companyId } = await supabase.rpc('get_user_company_id', { _user_id: auth.user?.id as string })
      ;({ error } = await (supabase.from('feriado' as any) as any).insert({ ...payload, company_id: companyId }))
    }
    setSaving(false)
    if (error) return toast.error(error.code === '23505' ? 'Já existe um feriado igual nesta data' : 'Falha ao salvar o feriado')
    toast.success('Feriado salvo')
    setForm(null)
    load()
  }

  const remove = async (f: Feriado) => {
    if (!confirm(`Excluir o feriado "${f.descricao}" (${fmt(f.data)})?`)) return
    const { error } = await (supabase.from('feriado' as any) as any).delete().eq('id', f.id)
    if (error) return toast.error('Falha ao excluir')
    toast.success('Feriado excluído')
    load()
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Feriados</h3>
          <p className="text-sm text-muted-foreground">Usados no cálculo dos prazos em dias úteis. Os nacionais valem para todas as empresas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={loadNational}><Download className="h-4 w-4 mr-2" />Carregar feriados nacionais do ano</Button>
          <Button onClick={() => setForm({ ...empty })}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {loading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
        {!loading && items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum feriado cadastrado em {year}.</p>}
        {!loading && items.map(f => (
          <div key={f.id} className="flex items-center justify-between p-3 gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <span className="font-mono text-sm w-24">{fmt(f.data)}</span>
              <span className="text-xs text-muted-foreground w-28 capitalize hidden md:inline">{weekday(f.data)}</span>
              <span className="font-medium truncate">{f.descricao}</span>
              <Badge variant={f.abrangencia === 'nacional' ? 'secondary' : 'outline'} className="capitalize">
                {f.abrangencia}{f.uf ? ` · ${f.uf}` : ''}{f.municipio ? ` · ${f.municipio}` : ''}
              </Badge>
            </div>
            {f.company_id && (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setForm({ id: f.id, data: f.data, descricao: f.descricao, abrangencia: f.abrangencia as any, uf: f.uf || '', municipio: f.municipio || '' })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(f)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={o => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? 'Editar feriado' : 'Novo feriado'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
              <div>
                <Label>Abrangência</Label>
                <Select value={form.abrangencia} onValueChange={v => setForm({ ...form, abrangencia: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estadual">Estadual</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
                {form.abrangencia === 'municipal' && (
                  <div className="col-span-2"><Label>Município</Label><Input value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} /></div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
