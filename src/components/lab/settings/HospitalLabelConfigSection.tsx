import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { defaultHospitalLabel, type HospitalLabelConfig, type HospitalPrintType } from '@/lib/hospitalLabels'

export function HospitalLabelConfigSection() {
  const { user } = useAuth()
  const [configs, setConfigs] = useState<Partial<Record<HospitalPrintType, HospitalLabelConfig>>>({})
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!user?.companyId) return; supabase.from('lab_settings').select('hospital_label_config').eq('company_id', user.companyId).maybeSingle().then(({ data, error }) => { if (error) toast.error(error.message); else { setConfigs((data?.hospital_label_config || {}) as typeof configs); setReady(true) } }) }, [user?.companyId])
  const save = async () => { if (!user?.companyId || !ready) return; setBusy(true); try { const { error } = await supabase.rpc('hospital_etiquetas_configurar', { _config: configs as any }); if (error) throw error; toast.success('Configurações das etiquetas salvas') } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar') } finally { setBusy(false) } }
  return <section className="space-y-6">{(['etiqueta_paciente', 'etiqueta_acompanhante'] as const).map(type => { const draft = configs[type] || defaultHospitalLabel; const set = (key: keyof HospitalLabelConfig, value: number | boolean) => setConfigs(prev => ({ ...prev, [type]: { ...(prev[type] || defaultHospitalLabel), [key]: value } })); return <div key={type} className="space-y-3 border-b border-border pb-5">
    <h3 className="font-semibold">{type === 'etiqueta_paciente' ? 'Etiqueta do paciente' : 'Etiqueta de acompanhante'}</h3>
    <label className="flex gap-2 items-center text-sm"><Switch checked={!!configs[type]} disabled={!ready || busy} onCheckedChange={on => setConfigs(prev => { const next = { ...prev }; if (on) next[type] = { ...defaultHospitalLabel }; else delete next[type]; return next })} />Configuração ativa</label>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{([['widthMm', 'Largura (mm)', 20, 200], ['heightMm', 'Altura (mm)', 15, 200], ['marginMm', 'Margem (mm)', 0, 10], ['nomeSizePt', 'Fonte do nome (pt)', 5, 24], ['textoSizePt', 'Fonte dos campos (pt)', 5, 24]] as const).map(([key, label, min, max]) => <div key={key}><Label>{label}</Label><Input aria-label={`${label} — ${type}`} type="number" step="0.5" min={min} max={max} value={draft[key]} disabled={!configs[type] || busy} onChange={e => set(key, Number(e.target.value))} /></div>)}</div>
    <div className="flex flex-wrap gap-4">{([['nomeBold', 'Nome em negrito'], ['textoBold', 'Campos em negrito'], ['barcode', 'Código de barras do atendimento']] as const).map(([key, label]) => <label key={key} className="flex gap-2 items-center text-sm"><Switch disabled={!configs[type] || busy} checked={draft[key]} onCheckedChange={value => set(key, value)} />{label}</label>)}</div>
  </div> })}<Button onClick={save} disabled={!ready || busy}>Salvar etiquetas hospitalares</Button></section>
}