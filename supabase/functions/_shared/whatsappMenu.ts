// Montagem ÚNICA da confirmação com botões (uazapi POST /send/menu).
// A uazapi avisa que botões podem ser descontinuados: para trocar por list/poll, mude só montarMenuConfirmacao.
export type Formato = 'botoes' | 'texto_numerado' | 'texto'

export function montarMenuConfirmacao(numero: string, texto: string, codigo: string, trackId: string) {
  return {
    number: numero,
    type: 'button',
    text: texto,
    choices: [`CONFIRMAR|confirmar:${codigo}`, `REMARCAR|remarcar:${codigo}`, `CANCELAR|cancelar:${codigo}`],
    track_source: 'axis_confirmacao',
    track_id: trackId,
  }
}

export function textoNumerado(texto: string) {
  return `${texto}\n\nResponda com o número:\n1 - CONFIRMAR\n2 - REMARCAR\n3 - CANCELAR`
}

export type Resultado = { status: number; body: any; retryAfter: string | null }

async function post(base: string, token: string, path: string, payload: unknown, timeoutMs: number): Promise<Resultado> {
  try {
    const resp = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
    let body: any = null
    try { body = await resp.json() } catch { /* sem corpo */ }
    return { status: resp.status, body, retryAfter: resp.headers.get('Retry-After') }
  } catch {
    return { status: 0, body: null, retryAfter: null } // timeout ou rede: resultado incerto
  }
}

const desconectado = (r: Resultado) =>
  r.status === 401 || /disconnect|not connected|desconect|no session|not logged/.test(String(r.body?.error ?? r.body?.message ?? '').toLowerCase())

/** Envia uma confirmação no formato pedido. Plano B (texto numerado) SOMENTE após recusa explícita (400/422) do menu. */
export async function enviarConfirmacao(o: {
  base: string; token: string; numero: string; texto: string; codigo: string; trackId: string
  formato: 'botoes' | 'texto_numerado'; timeoutMs?: number
}): Promise<Resultado & { formato: Formato; motivoPlanoB: string | null }> {
  const t = o.timeoutMs ?? 15_000
  if (o.formato === 'texto_numerado') {
    const r = await post(o.base, o.token, '/send/text', { number: o.numero, text: textoNumerado(o.texto), track_source: 'axis_confirmacao', track_id: o.trackId }, t)
    return { ...r, formato: 'texto_numerado', motivoPlanoB: null }
  }
  const r = await post(o.base, o.token, '/send/menu', montarMenuConfirmacao(o.numero, o.texto, o.codigo, o.trackId), t)
  if ((r.status === 400 || r.status === 422) && !desconectado(r)) {
    const motivo = `Menu recusado (HTTP ${r.status}): ${String(r.body?.error ?? r.body?.message ?? 'sem detalhe').slice(0, 200)}`
    const r2 = await post(o.base, o.token, '/send/text', { number: o.numero, text: textoNumerado(o.texto), track_source: 'axis_confirmacao', track_id: o.trackId }, t)
    return { ...r2, formato: 'texto_numerado', motivoPlanoB: motivo }
  }
  return { ...r, formato: 'botoes', motivoPlanoB: null }
}

export const idMensagem = (body: any) => {
  const id = body?.messageid ?? body?.id ?? body?.key?.id ?? null
  return id == null ? null : String(id)
}
