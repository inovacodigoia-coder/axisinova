import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { useCadastroRapidoExames } from '@/hooks/useCadastroRapidoExames'

/** Liga/desliga o Cadastro rápido de exames (admin da empresa ou Super Admin). */
export function CadastroRapidoSwitch({ companyId }: { companyId: string }) {
  const { ativo, setAtivo, carregado } = useCadastroRapidoExames(companyId)
  const [salvando, setSalvando] = useState(false)
  const mudar = async (v: boolean) => {
    setSalvando(true)
    const { error } = await supabase.rpc('cadastro_rapido_definir', { p_company: companyId, p_ativo: v })
    setSalvando(false)
    if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
    setAtivo(v)
    toast.success(`Cadastro rápido de exames ${v ? 'ligado' : 'desligado'}.`)
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-foreground">Cadastro rápido de exames</p>
        <p className="text-xs text-muted-foreground">Usar Enter e setas para incluir exames em sequência no Cadastro de Atendimento. Desligado, volta ao fluxo normal.</p>
      </div>
      <Switch checked={ativo} disabled={!carregado || salvando} aria-label="Cadastro rápido de exames ligado" onCheckedChange={v => void mudar(v)} />
    </div>
  )
}
