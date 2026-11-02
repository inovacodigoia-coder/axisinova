import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WristbandConfigSection() {
  const { user } = useAuth()
  const [width, setWidth] = useState(25)
  const [height, setHeight] = useState(250)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!user?.companyId) return
    let cancelled = false
    supabase.from('triage_settings').select('wristband_width_mm,wristband_height_mm').eq('company_id', user.companyId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      if (error) { toast.error('Não foi possível carregar a configuração da pulseira'); return }
      setWidth(data?.wristband_width_mm ?? 25); setHeight(data?.wristband_height_mm ?? 250); setReady(true)
    })
    return () => { cancelled = true }
  }, [user?.companyId])
  const save = async () => {
    if (!user?.companyId || !ready || busy) return
    setBusy(true)
    const { error } = await supabase.from('triage_settings').upsert({ company_id: user.companyId, wristband_width_mm: width, wristband_height_mm: height, updated_at: new Date().toISOString() }, { onConflict: 'company_id' })
    setBusy(false)
    if (error) toast.error('Não foi possível salvar a configuração da pulseira')
    else toast.success('Configuração da pulseira salva')
  }
  return <section className="space-y-3 border-b border-border pb-5">
    <h3 className="font-semibold">Pulseira do paciente</h3>
    <div className="grid grid-cols-2 gap-3">
      <div><Label htmlFor="wristband-width">Largura da pulseira (mm)</Label><Input id="wristband-width" type="number" value={width} disabled={!ready || busy} onChange={e => setWidth(Number(e.target.value))} /></div>
      <div><Label htmlFor="wristband-length">Comprimento da pulseira (mm)</Label><Input id="wristband-length" type="number" value={height} disabled={!ready || busy} onChange={e => setHeight(Number(e.target.value))} /></div>
    </div>
    <Button onClick={save} disabled={!ready || busy || width <= 0 || height <= 0}>Salvar pulseira</Button>
  </section>
}