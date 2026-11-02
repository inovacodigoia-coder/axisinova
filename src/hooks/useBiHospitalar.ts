import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface BiHospitalarAcesso {
  ver: boolean
  exportar: boolean
  configurar: boolean
}

const SEM_ACESSO: BiHospitalarAcesso = { ver: false, exportar: false, configurar: false }

/** Acesso ao BI de Gestão Hospitalar (empresa habilitada + permissão do perfil), checado no banco. */
export function useBiHospitalarAcesso() {
  const [acesso, setAcesso] = useState<BiHospitalarAcesso | null>(null)
  useEffect(() => {
    let vivo = true
    void supabase.rpc('bi_meu_acesso' as any).then(({ data }) => {
      if (vivo) setAcesso((data as unknown as BiHospitalarAcesso) ?? SEM_ACESSO)
    })
    return () => { vivo = false }
  }, [])
  return acesso
}

/** Se o módulo está habilitado na empresa do usuário logado (para exibir o grupo em Perfis de Acesso). */
export function useBiHospitalarHabilitada() {
  const [habilitada, setHabilitada] = useState<boolean>(false)
  useEffect(() => {
    let vivo = true
    void supabase.rpc('bi_hospitalar_habilitada' as any).then(({ data }) => {
      if (vivo) setHabilitada(!!data)
    })
    return () => { vivo = false }
  }, [])
  return habilitada
}
