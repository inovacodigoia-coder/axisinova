/**
 * Extrai o motivo que uma Edge Function devolveu ({ error } | { mensagem } | { motivo }).
 * Em respostas não-2xx o supabase-js entrega data = null e só diz "non-2xx status code";
 * o texto real fica no corpo, em error.context (Response).
 */
const motivoDoCorpo = (corpo: unknown): string | null => {
  if (!corpo || typeof corpo !== 'object') return null
  const c = corpo as Record<string, unknown>
  for (const k of ['error', 'mensagem', 'motivo']) {
    const v = c[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

export async function mensagemErroFuncao(error: unknown, padrao: string, data?: unknown): Promise<string> {
  const doData = motivoDoCorpo(data)
  if (doData) return doData
  const ctx = (error as { context?: unknown } | null)?.context
  if (ctx && typeof (ctx as Response).clone === 'function') {
    try {
      const doCorpo = motivoDoCorpo(await (ctx as Response).clone().json())
      if (doCorpo) return doCorpo
    } catch {
      /* corpo não é JSON */
    }
  }
  return padrao
}
