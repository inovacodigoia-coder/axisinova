import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Hospital } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useBiHospitalarAcesso } from '@/hooks/useBiHospitalar'

/** Tela-base do BI de Gestão Hospitalar (Etapa 1). Relatórios chegam nas Etapas 2 e 3. */
export default function BiHospitalarPage() {
  const acesso = useBiHospitalarAcesso()

  useEffect(() => {
    if (acesso?.ver) void supabase.rpc('bi_registrar_acesso' as any, { _acao: 'abrir_tela' })
  }, [acesso?.ver])

  if (acesso && !acesso.ver) return <Navigate to="/app/dashboard" replace />

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Hospital className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">BI de Gestão Hospitalar</h1>
          <p className="text-sm text-muted-foreground">Jornada do paciente, tempo por setor e consumo</p>
        </div>
      </div>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm font-medium text-foreground">Relatórios disponíveis nas próximas etapas</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A partir de agora, cada passo do paciente (chegada, recepção, triagem, consulta, leitos, medicação, exames e saída) está sendo registrado para alimentar os relatórios.
        </p>
      </div>
    </div>
  )
}
