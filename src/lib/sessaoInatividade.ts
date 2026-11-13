/**
 * Logout por inatividade escalonado e pausa do tempo real em aba oculta.
 * TODOS os valores ajustáveis ficam aqui.
 */

/** Tempos de inatividade possíveis (minutos). Cada usuário cai sempre no mesmo, pelo id. */
export const INATIVIDADE_OPCOES_MIN = [30, 45, 60] as const
/** Aviso antes de encerrar (segundos). */
export const INATIVIDADE_AVISO_SEG = 60
/** Desvio aleatório somado por sessão (0 até este valor, em segundos). */
export const INATIVIDADE_DESVIO_MAX_SEG = 120
/** Máximo que o logout espera uma ação em andamento (salvamento) terminar. */
export const INATIVIDADE_ADIAR_MAX_MS = 5 * 60_000
/** Intervalo mínimo entre registros da atividade no navegador (compartilhado entre abas). */
export const INATIVIDADE_GRAVAR_A_CADA_MS = 5_000
/** Chave no localStorage com o último momento de atividade (ms). */
export const CHAVE_ULTIMA_ATIVIDADE = 'lastActivityAt'
/** Rotas autenticadas onde o logout por inatividade vale (prefixos). */
export const ROTAS_AUTENTICADAS = ['/app', '/superadmin', '/selecionar-perfil', '/selecionar-origem', '/docs'] as const

/** Aba oculta por mais que isto desliga as assinaturas de tempo real dela. */
export const REALTIME_PAUSA_OCULTA_MS = 2 * 60_000

/** Hash estável (FNV-1a 32 bits) — o mesmo id sempre dá o mesmo número. */
export function hashEstavel(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Tempo base do usuário (30, 45 ou 60 min), estável pelo id. */
export function tempoBaseMin(userId: string): number {
  return INATIVIDADE_OPCOES_MIN[hashEstavel(userId) % INATIVIDADE_OPCOES_MIN.length]
}

/** Desvio aleatório da sessão, em segundos inteiros de 0 a INATIVIDADE_DESVIO_MAX_SEG. */
export function sortearDesvioSeg(aleatorio: () => number = Math.random): number {
  return Math.min(INATIVIDADE_DESVIO_MAX_SEG, Math.floor(aleatorio() * (INATIVIDADE_DESVIO_MAX_SEG + 1)))
}

/**
 * Tempo limite final (ms). Se a empresa configurou um tempo de sessão MENOR que o do
 * escalonamento, ele prevalece (nunca deixa a pessoa conectada por mais tempo que a empresa quer).
 */
export function tempoLimiteMs(userId: string, desvioSeg: number, limiteEmpresaMin?: number | null): number {
  let min = tempoBaseMin(userId)
  if (limiteEmpresaMin && limiteEmpresaMin > 0 && limiteEmpresaMin < min) min = limiteEmpresaMin
  return min * 60_000 + desvioSeg * 1000
}

export type FaseInatividade =
  | { fase: 'ativo' }
  | { fase: 'aviso'; segundos: number }
  | { fase: 'expirar' }

/** Decide a fase a partir do tempo parado. */
export function faseInatividade(agora: number, ultimaAtividade: number, limiteMs: number, avisoSeg = INATIVIDADE_AVISO_SEG): FaseInatividade {
  const restante = limiteMs - (agora - ultimaAtividade)
  if (restante <= 0) return { fase: 'expirar' }
  if (restante <= avisoSeg * 1000) return { fase: 'aviso', segundos: Math.ceil(restante / 1000) }
  return { fase: 'ativo' }
}

/** Pode encerrar agora? Com ação em andamento espera, até INATIVIDADE_ADIAR_MAX_MS. */
export function podeEncerrar(acaoEmAndamento: boolean, esperandoDesde: number | null, agora: number): boolean {
  if (!acaoEmAndamento) return true
  if (esperandoDesde == null) return false
  return agora - esperandoDesde >= INATIVIDADE_ADIAR_MAX_MS
}

export function rotaAutenticada(pathname: string): boolean {
  return ROTAS_AUTENTICADAS.some(p => pathname === p || pathname.startsWith(p + '/'))
}
