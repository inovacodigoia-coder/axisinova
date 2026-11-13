/**
 * Conta as gravações em andamento (POST/PUT/PATCH/DELETE) feitas por fetch,
 * para o logout por inatividade não derrubar a pessoa no meio de um salvamento.
 * Instala uma vez; o cliente do backend chama o fetch global a cada requisição.
 */
const METODOS_GRAVACAO = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
let pendentes = 0
let instalado = false

export function gravacoesEmAndamento(): number {
  return pendentes
}

export function instalarContadorDeGravacoes(): void {
  if (instalado || typeof window === 'undefined' || typeof window.fetch !== 'function') return
  instalado = true
  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const metodo = String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (!METODOS_GRAVACAO.has(metodo)) return original(input, init)
    pendentes++
    return original(input, init).finally(() => { pendentes = Math.max(0, pendentes - 1) })
  }
}
