import { useState } from 'react'
import { toast } from 'sonner'
import { Database, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { definirModuloSoroteca, useSorotecaAcesso } from '@/hooks/useSoroteca'

/**
 * Liga/desliga a Soroteca da empresa. Só aparece para TI/Administração.
 * Desligada, a seção some do menu para todos os perfis, exceto TI/Administração.
 */
export function SorotecaModuloCard() {
  const acesso = useSorotecaAcesso()
  const [salvando, setSalvando] = useState(false)
  if (!acesso?.pode_ativar) return null
  const ativo = acesso.modulo_ativo

  const mudar = async (v: boolean) => {
    setSalvando(true)
    try {
      await definirModuloSoroteca(v)
      toast.success(v ? 'Soroteca ativada para toda a empresa' : 'Soroteca desativada: só TI/Administração continua vendo')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <Database className="h-5 w-5 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          Módulo Soroteca
          {ativo
            ? <Badge variant="outline" className="border-success/40 bg-success/10 text-success">Ativo</Badge>
            : <Badge variant="outline" className="text-muted-foreground">Desativado</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          {ativo
            ? 'Os perfis com permissão de Soroteca veem o módulo no menu.'
            : 'A seção Soroteca está escondida do menu para todos os perfis desta empresa, exceto TI/Administração. Ative na hora do treinamento.'}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        <Switch checked={ativo} disabled={salvando} onCheckedChange={v => void mudar(v)} aria-label="Soroteca ativa nesta empresa" />
        {ativo ? 'Ativo' : 'Desativado'}
      </label>
    </div>
  )
}
