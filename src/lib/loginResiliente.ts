// Regras da tentativa de login (Etapa 3: login resiliente).
// Todos os tempos ficam aqui para ajuste num só lugar.

/** Tempo máximo de uma tentativa de login (entrar + carregar perfil). */
export const LOGIN_PRAZO_MS = 15_000
/** Cada chamada isolada ao servidor espera no máximo isto antes de ser repetida. */
export const LOGIN_LIMITE_CHAMADA_MS = 8_000
/** Espera curta antes de repetir sozinho depois de erro de rede. */
export const LOGIN_ESPERA_REPETICAO_MS = 2_000
/** Repetições automáticas silenciosas (além da primeira chamada). */
export const LOGIN_REPETICOES_SILENCIOSAS = 2
/** Depois disto em "Autenticando...", mostra o texto de espera. */
export const LOGIN_AVISO_LENTO_MS = 6_000

export const MSG_SERVIDOR_LENTO = 'O servidor está demorando para responder. Isso não significa que sua senha esteja errada.'
export const MSG_AINDA_CONECTANDO = 'Ainda conectando, aguarde um instante...'
export const MSG_CONTA_INATIVA = 'Seu acesso está desativado. Fale com o administrador da sua clínica.'
export const MSG_SEM_ACESSO = 'Seu usuário ainda não tem acesso liberado. Fale com o administrador da sua clínica.'

/** Tipo do erro mostrado na tela de login. */
export type TipoErroLogin = 'credenciais' | 'servidor' | 'bloqueado' | 'sem_acesso'

export type ResultadoChamada<T> =
  | { tipo: 'ok'; valor: T }
  | { tipo: 'tempo_esgotado' }
  | { tipo: 'falha_rede' }

const ESGOTOU = Symbol('esgotou')
const REJEITOU = Symbol('rejeitou')

function corrida<T>(p: Promise<T>, ms: number): Promise<T | typeof ESGOTOU | typeof REJEITOU> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(ESGOTOU), Math.max(0, ms))
    p.then(
      (v) => { clearTimeout(t); resolve(v) },
      () => { clearTimeout(t); resolve(REJEITOU) },
    )
  })
}

/**
 * Chama o servidor respeitando o prazo final da tentativa de login.
 * - Falha passageira (rede, 5xx, sem resposta): espera `esperaMs` e repete, no máximo `repeticoes` vezes.
 * - Resposta definitiva (ex.: senha errada) volta na hora, sem repetir.
 * - Nunca passa do prazo final: devolve `tempo_esgotado`.
 * - Chamadas abandonadas por tempo vão para `aoAbandonar` (podem responder depois).
 */
export async function chamarComPrazo<T>(
  chamar: () => Promise<T>,
  opts: {
    prazoFinal: number
    ehFalhaPassageira: (v: T) => boolean
    limiteChamadaMs?: number
    esperaMs?: number
    repeticoes?: number
    agora?: () => number
    dormir?: (ms: number) => Promise<void>
    aoAbandonar?: (p: Promise<T>) => void
  },
): Promise<ResultadoChamada<T>> {
  const agora = opts.agora ?? Date.now
  const dormir = opts.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const limite = opts.limiteChamadaMs ?? LOGIN_LIMITE_CHAMADA_MS
  const espera = opts.esperaMs ?? LOGIN_ESPERA_REPETICAO_MS
  const repeticoes = opts.repeticoes ?? LOGIN_REPETICOES_SILENCIOSAS

  for (let tentativa = 0; tentativa <= repeticoes; tentativa++) {
    const restante = opts.prazoFinal - agora()
    if (restante <= 0) return { tipo: 'tempo_esgotado' }

    const p = chamar()
    const r = await corrida(p, Math.min(limite, restante))
    if (r === ESGOTOU) opts.aoAbandonar?.(p)
    else if (r !== REJEITOU && !opts.ehFalhaPassageira(r as T)) return { tipo: 'ok', valor: r as T }

    // Falha passageira: repete só se ainda couber a espera + um mínimo de chamada no prazo.
    const sobra = opts.prazoFinal - agora()
    if (tentativa < repeticoes && sobra > espera + 1000) {
      await dormir(espera)
      continue
    }
    return { tipo: sobra <= 0 || r === ESGOTOU ? 'tempo_esgotado' : 'falha_rede' }
  }
  return { tipo: 'falha_rede' }
}

/** Falha passageira na entrada: sem resposta, sem status ou 5xx. Senha errada (400) e 429 não repetem. */
export function falhaPassageiraAuth(res: { error?: { status?: number } | null } | null | undefined): boolean {
  if (!res) return true
  const err = res.error
  if (!err) return false
  return !err.status || err.status >= 500
}

/** Falha passageira numa consulta: sem resposta (status 0) ou 5xx. Erro de dados (4xx) não repete. */
export function falhaPassageiraConsulta(res: { status?: number; error?: unknown } | null | undefined): boolean {
  if (!res) return true
  if (!res.error) return false
  return !res.status || res.status >= 500
}

/** O servidor de entrada recusou por excesso de pedidos (não é senha errada). */
export function servidorOcupado(res: { error?: { status?: number } | null } | null | undefined): boolean {
  return res?.error?.status === 429
}
