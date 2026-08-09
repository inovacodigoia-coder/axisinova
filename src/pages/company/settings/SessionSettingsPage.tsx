import React, { useState, useEffect } from 'react'
import { Shield, Info, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/AuthContext'

export default function SessionSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      if (!user?.companyId) {
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, session_timeout')
          .eq('id', user.companyId)
          .single()

        if (error) throw error
        if (data && 'session_timeout' in data) {
          setSessionTimeout((data as any).session_timeout)
        }
      } catch (error) {
        console.error('Error loading session settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user?.companyId])

  const handleSave = async () => {
    if (sessionTimeout < 5 || sessionTimeout > 480) {
      toast({
        title: "Valor inválido",
        description: "O tempo de sessão deve ser entre 5 e 480 minutos.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({ session_timeout: sessionTimeout } as any)
        .eq('id', user?.companyId)

      if (error) throw error

      toast({
        title: "Configurações salvas",
        description: "As alterações na segurança da sessão foram aplicadas."
      })
    } catch (error) {
      console.error('Error saving session settings:', error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações de sessão.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Segurança da sessão</h2>
      </div>
      
      <p className="text-sm text-muted-foreground -mt-4">
        Encerramento automático de sessão por inatividade para todos os usuários.
      </p>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="session-timeout" className="text-sm font-medium">
            Tempo de sessão (minutos)
          </Label>
          <div className="w-full max-w-[200px]">
            <Input
              id="session-timeout"
              type="number"
              min={5}
              max={480}
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 0)}
              className="bg-background border-border rounded-xl focus:ring-primary/20"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Aceito entre 5 e 480 minutos. Padrão: 30 min.
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Impacto para o usuário
          </div>
          <ul className="text-xs text-amber-700/80 dark:text-amber-400/70 space-y-2 list-disc pl-4">
            <li>1 minuto antes do encerramento, o usuário recebe um aviso com opção de continuar conectado.</li>
            <li>Sem auto-save em telas de cadastro/atendimento: trabalho não salvo será perdido no logout.</li>
            <li>A alteração vale para todos os perfis e é aplicada assim que cada aba recarregar as configurações.</li>
          </ul>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="rounded-xl px-8 bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </div>
  )
}
