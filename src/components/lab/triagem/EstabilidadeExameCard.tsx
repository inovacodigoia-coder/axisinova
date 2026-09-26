import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const CAMPOS = [['estab_ambiente_h', 'Ambiente (h)'], ['estab_refrigerado_h', 'Refrigerado (h)'], ['estab_congelado_h', 'Congelado (h)']] as const
type K = typeof CAMPOS[number][0]

/** Sobrescrita opcional da estabilidade do material para este exame (ex.: potássio sem centrifugar) */
export function EstabilidadeExameCard({ examId }: { examId?: string }) {
  const [v, setV] = useState<Record<K, string>>({ estab_ambiente_h: '', estab_refrigerado_h: '', estab_congelado_h: '' })
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (!examId) return
    ;(supabase as any).from('exams').select('estab_ambiente_h, estab_refrigerado_h, estab_congelado_h').eq('id', examId).maybeSingle()
      .then(({ data }: any) => data && setV({ estab_ambiente_h: data.estab_ambiente_h ?? '', estab_refrigerado_h: data.estab_refrigerado_h ?? '', estab_congelado_h: data.estab_congelado_h ?? '' }))
  }, [examId])
  if (!examId) return <Card className="mt-4 p-4 text-xs text-muted-foreground">Salve o exame para definir uma estabilidade própria (sobrescreve a do material).</Card>
  const salvar = async () => {
    const row: any = {}
    for (const [k] of CAMPOS) {
      const s = String(v[k] ?? '').trim()
      if (s !== '' && !(Number(s) > 0)) { toast.error('Estabilidade deve ser maior que zero (ou vazia)'); return }
      row[k] = s === '' ? null : Number(s)
    }
    setSalvando(true)
    const { error } = await (supabase as any).from('exams').update(row).eq('id', examId)
    setSalvando(false)
    error ? toast.error('Não foi possível salvar a estabilidade do exame') : toast.success('Estabilidade do exame salva')
  }
  return (
    <Card className="mt-4 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Estabilidade própria do exame (opcional)</p>
        <p className="text-[11px] text-muted-foreground">Vazio = usa a estabilidade do material. Use quando o analito tem limite menor (ex.: potássio sem centrifugar). Defina conforme a bula do fabricante / POP.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {CAMPOS.map(([k, l]) => (
          <div key={k}><Label className="text-xs">{l}</Label><Input type="number" min={0} step="0.5" placeholder="do material" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} /></div>
        ))}
      </div>
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Salvar estabilidade</Button></div>
    </Card>
  )
}
