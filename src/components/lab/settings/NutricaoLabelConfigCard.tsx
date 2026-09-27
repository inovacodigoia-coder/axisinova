import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Utensils, Save } from 'lucide-react'
import { toast } from 'sonner'
import { defaultNutricaoLabelConfig, useNutricaoLabelConfig, type NutricaoLabelConfig } from '@/hooks/useNutricaoLabelConfig'

export function NutricaoLabelConfigCard() {
  const { config, save } = useNutricaoLabelConfig()
  const [draft, setDraft] = useState<NutricaoLabelConfig>(defaultNutricaoLabelConfig)
  useEffect(() => { if (config) setDraft(config) }, [config])
  const set = <K extends keyof NutricaoLabelConfig>(k: K, v: NutricaoLabelConfig[K]) => setDraft(d => ({ ...d, [k]: v }))
  const num = (k: keyof NutricaoLabelConfig, label: string, step = 0.5) => (
    <div className="space-y-1"><Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={draft[k] as number} onChange={e => set(k, Number(e.target.value) as never)} /></div>
  )
  const salvar = async () => { try { await save(draft); toast.success('Etiqueta de Nutrição salva') } catch (e: any) { toast.error(e.message) } }
  const remover = async () => { try { await save(null); toast.success('Etiqueta de Nutrição desativada — impressão volta a usar o navegador') } catch (e: any) { toast.error(e.message) } }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Utensils className="h-4 w-4 text-primary" />Etiqueta de Nutrição</h3>
        {config ? <Badge>Configurada — imprime direto na impressora</Badge> : <Badge variant="secondary">Não configurada — imprime pelo navegador</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">No Servidor de Impressão, cadastre o tipo <b>etiqueta_nutricao</b> apontando para a impressora térmica.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {num('widthMm', 'Largura (mm)', 1)}{num('heightMm', 'Altura (mm)', 1)}{num('marginMm', 'Margem (mm)')}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-end gap-3">{num('nomeSizePt', 'Fonte do nome (pt)')}<label className="flex items-center gap-2 text-xs pb-2"><Switch checked={draft.nomeBold} onCheckedChange={v => set('nomeBold', v)} />Negrito</label></div>
        <div className="flex items-end gap-3">{num('textoSizePt', 'Fonte dos demais campos (pt)')}<label className="flex items-center gap-2 text-xs pb-2"><Switch checked={draft.textoBold} onCheckedChange={v => set('textoBold', v)} />Negrito</label></div>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={draft.barcode} onCheckedChange={v => set('barcode', v)} />Código de barras do leito</label>
      <div className="flex gap-2">
        <Button size="sm" onClick={salvar}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        {config && <Button size="sm" variant="outline" onClick={remover}>Desativar</Button>}
      </div>
    </div>
  )
}
