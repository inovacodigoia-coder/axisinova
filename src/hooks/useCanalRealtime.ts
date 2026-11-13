import { useEffect, useRef, useSyncExternalStore, type DependencyList } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { pausaRealtime } from '@/lib/realtimePausa'
import { queryClient } from '@/lib/queryClient'

// Ao voltar depois de pausado: UMA atualização das consultas ativas da tela (React Query).
pausaRealtime.aoRetomar(() => { void queryClient.invalidateQueries({ refetchType: 'active' }) })

export function useRealtimePausado(): boolean {
  return useSyncExternalStore(pausaRealtime.assinar, pausaRealtime.pausado, () => false)
}

interface OpcoesCanal {
  /** Chamado uma vez quando a aba volta após a pausa (recarrega o que mudou enquanto oculta). */
  aoRetomar?: () => void
  /** Telas que dependem do tempo real em segundo plano (som/aviso) não pausam. */
  manterEmSegundoPlano?: boolean
}

/**
 * Ponto único das assinaturas de tempo real.
 * - `nome` null/'' = não assina (ex.: sem empresa).
 * - `montar` recebe o canal e adiciona os `.on(...)` (sempre com filtro por empresa/unidade).
 * - Remove o canal ao desmontar, ao mudar `deps` e quando a aba fica oculta > 2 min;
 *   reassina ao voltar e chama `aoRetomar` uma vez.
 * O nome recebe um sufixo único para nunca reaproveitar um canal já assinado.
 */
export function useCanalRealtime(
  nome: string | null | undefined,
  montar: (canal: RealtimeChannel) => RealtimeChannel,
  deps: DependencyList,
  opcoes: OpcoesCanal = {},
): void {
  const pausado = useRealtimePausado()
  const desligado = pausado && !opcoes.manterEmSegundoPlano
  const montarRef = useRef(montar)
  montarRef.current = montar
  const aoRetomarRef = useRef(opcoes.aoRetomar)
  aoRetomarRef.current = opcoes.aoRetomar

  useEffect(() => {
    if (!nome || desligado) return
    const canal = montarRef.current(supabase.channel(`${nome}-${Math.random().toString(36).slice(2, 10)}`)).subscribe()
    return () => { void supabase.removeChannel(canal) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, desligado, ...deps])

  // Retomada: recarrega uma vez o que esta assinatura acompanha.
  const estavaDesligado = useRef(false)
  useEffect(() => {
    if (desligado) { estavaDesligado.current = true; return }
    if (estavaDesligado.current) {
      estavaDesligado.current = false
      if (nome) aoRetomarRef.current?.()
    }
  }, [desligado, nome])
}
