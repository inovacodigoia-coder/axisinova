import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CAMPOS = [['estab_ambiente_h', 'Ambiente (h)'], ['estab_refrigerado_h', 'Refrigerado (h)'], ['estab_congelado_h', 'Congelado (h)']] as const
export type EstabKey = typeof CAMPOS[number][0]
export type Estabilidade = Record<EstabKey, string>
export const ESTAB_VAZIA: Estabilidade = { estab_ambiente_h: '', estab_refrigerado_h: '', estab_congelado_h: '' }

/** Converte para as colunas do exame; lança erro se algum valor for inválido */
export function estabilidadeParaLinha(v: Estabilidade): Record<EstabKey, number | null> {
  const row = {} as Record<EstabKey, number | null>
  for (const [k] of CAMPOS) {
    const s = String(v[k] ?? '').trim().replace(',', '.')
    if (s !== '' && !(Number(s) > 0)) throw new Error('Estabilidade deve ser maior que zero (ou vazia)')
    row[k] = s === '' ? null : Number(s)
  }
  return row
}

/** Grava a estabilidade própria do exame (chamado pelo Salvar do exame) */
export async function salvarEstabilidadeExame(examId: string, v: Estabilidade) {
  const { error } = await (supabase as any).from('exams').update(estabilidadeParaLinha(v)).eq('id', examId)
  if (error) throw new Error('Não foi possível salvar a estabilidade do exame')
}

/** Sobrescrita opcional da estabilidade do material para este exame (ex.: potássio sem centrifugar). Salva junto com o exame. */
export function EstabilidadeExameCard({ examId, value, onChange }: { examId?: string; value: Estabilidade; onChange: (v: Estabilidade) => void }) {
  useEffect(() => {
    if (!examId) return
    ;(supabase as any).from('exams').select('estab_ambiente_h, estab_refrigerado_h, estab_congelado_h').eq('id', examId).maybeSingle()
      .then(({ data }: any) => data && onChange({ estab_ambiente_h: String(data.estab_ambiente_h ?? ''), estab_refrigerado_h: String(data.estab_refrigerado_h ?? ''), estab_congelado_h: String(data.estab_congelado_h ?? '') }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])
  return (
    <Card className="mt-4 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">Estabilidade própria do exame (opcional)</p>
        <p className="text-[11px] text-muted-foreground">Vazio = usa a estabilidade do material. Use quando o analito tem limite menor (ex.: potássio sem centrifugar). Defina conforme a bula do fabricante / POP. É gravada no botão Salvar do exame.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {CAMPOS.map(([k, l]) => (
          <div key={k}><Label className="text-xs">{l}</Label><Input type="number" min={0} step="0.5" placeholder="do material" value={value[k]} onChange={e => onChange({ ...value, [k]: e.target.value })} /></div>
        ))}
      </div>
    </Card>
  )
}
