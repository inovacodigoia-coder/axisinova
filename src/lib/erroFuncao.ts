/**
 * Extrai a mensagem amigável que uma Edge Function devolveu no corpo ({ error }).
 * O supabase-js só informa "non-2xx status code"; o texto real fica em error.context (Response).
 */
export async function mensagemErroFuncao(error: unknown, padrao: string): Promise<string> {
  const ctx = (error as { context?: unknown } | null)?.context
  if (ctx && typeof (ctx as Response).clone === 'function') {
    try {
      const corpo = await (ctx as Response).clone().json()
      if (corpo && typeof corpo.error === 'string' && corpo.error.trim()) return corpo.error
    } catch {
      /* corpo não é JSON */
    }
  }
  return padrao
}
