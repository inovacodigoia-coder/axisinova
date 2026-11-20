import { useCallback, useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Switch } from '@/components/ui/switch'
import { CadastroRapidoSwitch } from './CadastroRapidoSwitch'

type Modulo = 'soroteca' | 'painel' | 'relatorios'
const MODULOS: { id: Modulo; nome: string; detalhe: string }[] = [
  { id: 'soroteca', nome: 'Soroteca', detalhe: 'Guarda e descarte de amostras em estantes e geladeiras' },
  { id: 'painel', nome: 'Painel Operacional', detalhe: 'Painel do bioquímico no Setor Técnico' },
  { id: 'relatorios', nome: 'Relatórios Gerenciais', detalhe: 'Abas Produção, Rejeições e Resumo do Dia do Dashboard Laboratorial' },
]

/** Super Admin: liga/desliga os módulos do laboratório por empresa (nascem desligados). */
export function CompanyLabModulosPanel({ companyId }: { companyId: string }) {
  const [situacao, setSituacao] = useState<Record<Modulo, boolean> | null>(null)
  const [salvando, setSalvando] = useState<Modulo | null>(null)
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('lab_modulos_situacao', { p_company: companyId })
    if (error) { setSituacao(null); return }
    const d = (data || {}) as Record<string, unknown>
    setSituacao({ soroteca: d.soroteca === true, painel: d.painel === true, relatorios: d.relatorios === true })
  }, [companyId])
  useEffect(() => { void load() }, [load])
  if (!situacao) return null

  const mudar = async (m: Modulo, v: boolean, nome: string) => {
    setSalvando(m)
    const { error } = await supabase.rpc('lab_modulo_definir', { p_company: companyId, p_modulo: m, p_ativo: v })
    setSalvando(null)
    if (error) { toast.error(error.message || 'Não foi possível salvar.'); return }
    toast.success(`${nome} ${v ? 'ligado' : 'desligado'} para esta empresa.`)
    void load()
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">Módulos do laboratório</p>
      </div>
      <p className="text-xs text-muted-foreground">Desligado, o módulo some para todos os perfis da empresa, inclusive o administrador.</p>
      {MODULOS.map(m => (
        <div key={m.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-foreground">{m.nome}</p>
            <p className="text-xs text-muted-foreground">{m.detalhe}</p>
          </div>
          <Switch
            checked={situacao[m.id]}
            disabled={salvando !== null}
            aria-label={`${m.nome} ligado nesta empresa`}
            onCheckedChange={v => void mudar(m.id, v, m.nome)}
          />
        </div>
      ))}
      <div className="border-t border-border pt-3"><CadastroRapidoSwitch companyId={companyId} /></div>
    </div>
  )
}
