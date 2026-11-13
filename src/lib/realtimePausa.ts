import { REALTIME_PAUSA_OCULTA_MS } from './sessaoInatividade'

/**
 * Estado "tempo real pausado": a aba ficou oculta por mais de REALTIME_PAUSA_OCULTA_MS.
 * Quem assina (useCanalRealtime) remove o canal ao pausar e reassina ao retomar.
 */
export interface PausaRealtime {
  pausado(): boolean
  assinar(fn: () => void): () => void
  aoRetomar(fn: () => void): () => void
  /** Informa a visibilidade atual da aba (true = visível). */
  visibilidade(visivel: boolean): void
}

export function criarPausaRealtime(esperaMs = REALTIME_PAUSA_OCULTA_MS): PausaRealtime {
  let pausado = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const ouvintes = new Set<() => void>()
  const retomadas = new Set<() => void>()
  const avisar = () => ouvintes.forEach(f => f())
  return {
    pausado: () => pausado,
    assinar(fn) { ouvintes.add(fn); return () => { ouvintes.delete(fn) } },
    aoRetomar(fn) { retomadas.add(fn); return () => { retomadas.delete(fn) } },
    visibilidade(visivel) {
      if (!visivel) {
        if (!timer && !pausado) timer = setTimeout(() => { timer = undefined; pausado = true; avisar() }, esperaMs)
        return
      }
      if (timer) { clearTimeout(timer); timer = undefined }
      if (pausado) {
        pausado = false
        avisar()
        retomadas.forEach(f => f())
      }
    },
  }
}

/** Instância do navegador, ligada ao visibilitychange. */
export const pausaRealtime = criarPausaRealtime()
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => pausaRealtime.visibilidade(document.visibilityState === 'visible'))
}
