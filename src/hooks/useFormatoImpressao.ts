import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/integrations/supabase/client'

const DOCUMENTOS = ['comprovante', 'controle_interno', 'termo_consentimento']
const FORMATOS = ['A4', 'A5', 'TÉRMICA']
const VAZIO: Record<string, string> = {}

/** Preferência individual persistida; nunca guarda documentos selecionados ou coleta. */
export function useFormatoImpressao(open: boolean) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id
  const companyId = user?.companyId
  const key = ['formato_impressao', companyId, userId]
  const query = useQuery({
    queryKey: key,
    enabled: open && !!userId && !!companyId,
    queryFn: async () => {
      if (!userId || !companyId) return VAZIO
      const { data, error } = await supabase.from('usuario_formato_impressao')
        .select('documento, formato').eq('user_id', userId).eq('company_id', companyId)
      if (error) throw error
      return Object.fromEntries((data || []).map(row => [row.documento, row.formato])) as Record<string, string>
    },
  })

  const guardar = async (documento: string, formato: string) => {
    if (!userId || !companyId) throw new Error('Usuário não identificado.')
    if (!DOCUMENTOS.includes(documento) || !FORMATOS.includes(formato) || (documento === 'termo_consentimento' && formato === 'TÉRMICA')) {
      throw new Error('Formato de impressão inválido.')
    }
    const { error } = await supabase.from('usuario_formato_impressao').upsert({
      user_id: userId, company_id: companyId, documento, formato,
    }, { onConflict: 'user_id,company_id,documento' })
    if (error) throw error
    queryClient.setQueryData<Record<string, string>>(key, prev => ({ ...prev, [documento]: formato }))
  }
  return { formatos: query.data || VAZIO, carregando: query.isLoading, escopo: `${companyId || ''}:${userId || ''}`, guardar }
}