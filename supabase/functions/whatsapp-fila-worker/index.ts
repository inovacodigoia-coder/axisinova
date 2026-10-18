// Worker da fila do WhatsApp (Etapa 6B). Chamado pelo agendador (pg_cron) a cada 1 minuto.
// Espaçamento real entre mensagens do MESMO número: intervalo sorteado (2, 3, 4 ou 5 min)
// + até 1 min até a próxima execução => entre 2 e 6 minutos. Cada número tem seu próprio intervalo.
// Regras: reserva atômica no banco, uma tentativa só, nunca repete; nunca registra token nem texto.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { decifrar } from '../_shared/whatsappCripto.ts'
import { enviarConfirmacao, enviarCiclo, idMensagem, type Formato } from '../_shared/whatsappMenu.ts'
import { separarAvisoSaida } from '../_shared/whatsappCiclo.ts'

const BASE = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
const SEGREDO = Deno.env.get('WHATSAPP_WORKER_SECRET') ?? ''
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function igualTempoConstante(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b)
  let diff = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return diff === 0
}

function intervaloAleatorioMin() {
  const b = new Uint32Array(1)
  crypto.getRandomValues(b)
  return 2 + (b[0] % 4) // 2, 3, 4 ou 5
}
const emMin = (m: number) => new Date(Date.now() + m * 60_000).toISOString()

type Reserva = { fila_id: string; instancia_id: string; telefone_destino: string; texto_final: string }

Deno.serve(async (req) => {
  const h = req.headers.get('x-worker-secret') ?? ''
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Aceita WHATSAPP_WORKER_SECRET (se cadastrado) ou um token de uso único gerado pelo agendador no banco.
  let autorizado = !!SEGREDO && !!h && igualTempoConstante(h, SEGREDO)
  if (!autorizado && /^[0-9a-f]{64}$/.test(h)) {
    const { data } = await db.rpc('whatsapp_worker_consumir_token', { p_token: h })
    autorizado = data === true
  }
  if (!autorizado) return json(401, { ok: false })

  const inicio = Date.now()
  const c = { reservadas: 0, enviadas: 0, falhas: 0, devolvidas: 0 }
  let erroGeral: string | null = null

  try {
    const { data, error } = await db.rpc('whatsapp_reservar_envios')
    if (error) throw new Error(`reserva: ${error.message}`)
    const reservas = (data ?? []) as Reserva[]
    c.reservadas = reservas.length

    for (const r of reservas) {
      const agora = new Date().toISOString()
      const fila = (patch: Record<string, unknown>) =>
        db.from('whatsapp_fila_envios').update({ ...patch, atualizado_em: new Date().toISOString() }).eq('id', r.fila_id)
      const instancia = (patch: Record<string, unknown>) => db.from('whatsapp_instancias').update(patch).eq('id', r.instancia_id)
      const devolver = () => fila({ status: 'agendada', instancia_id: null })
      const falhar = async (erro: string) => {
        await fila({ status: 'falha', erro })
        await instancia({ ultimo_envio_em: agora, proximo_envio_apos: emMin(intervaloAleatorioMin()) })
        c.falhas++
      }

      let token: string
      try {
        const { data: s } = await db.from('whatsapp_instancia_segredos').select('token_instancia_cifrado').eq('instancia_id', r.instancia_id).maybeSingle()
        if (!s?.token_instancia_cifrado) throw new Error()
        token = await decifrar(s.token_instancia_cifrado)
      } catch {
        // sem chave válida: não consome a mensagem
        await devolver()
        await instancia({ status: 'disconnected', ultimo_motivo_desconexao: 'Chave do número indisponível', status_atualizado_em: agora })
        c.devolvidas++
        continue
      }

      const { data: linha } = await db.from('whatsapp_fila_envios').select('tipo, company_id, codigo_resposta').eq('id', r.fila_id).maybeSingle()
      let status = 0, body: any = null, retryAfter: string | null = null
      let formato: Formato = 'texto', motivoPlanoB: string | null = null
      if (linha?.tipo === 'confirmacao_agendamento') {
        const { data: cfg } = await db.from('whatsapp_config_empresa').select('formato_confirmacao').eq('company_id', linha.company_id).maybeSingle()
        let codigo = linha.codigo_resposta as string | null
        if (!codigo) {
          const { data: g } = await db.rpc('whatsapp_gerar_codigo_resposta')
          codigo = String(g)
          await fila({ codigo_resposta: codigo })
        }
        const res = await enviarConfirmacao({
          base: BASE, token, numero: r.telefone_destino, texto: r.texto_final, codigo, trackId: r.fila_id,
          formato: cfg?.formato_confirmacao === 'texto_numerado' ? 'texto_numerado' : 'botoes',
        })
        ;({ status, body, retryAfter, formato, motivoPlanoB } = res)
      } else if (linha?.tipo?.startsWith('ciclo_')) {
        const saida = separarAvisoSaida(r.texto_final)
        const res = await enviarCiclo({ base: BASE, token, numero: r.telefone_destino, texto: saida.texto,
          trackId: r.fila_id, incluirBotao: saida.incluirBotao })
        ;({ status, body, retryAfter, formato, motivoPlanoB } = res)
      } else {
        try {
          const ctl = new AbortController()
          const t = setTimeout(() => ctl.abort(), 15_000)
          const resp = await fetch(`${BASE}/send/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', token },
            body: JSON.stringify({ number: r.telefone_destino, text: r.texto_final }),
            signal: ctl.signal,
          })
          clearTimeout(t)
          status = resp.status
          retryAfter = resp.headers.get('Retry-After')
          try { body = await resp.json() } catch { /* sem corpo */ }
        } catch {
          status = 0 // timeout ou rede
        }
      }
      if (motivoPlanoB) await fila({ motivo_plano_b: motivoPlanoB })

      const msgTxt = String(body?.error ?? body?.message ?? '').toLowerCase()
      const desconectado = status === 401 || /disconnect|not connected|desconect|no session|not logged/.test(msgTxt)

      if (status >= 200 && status < 300) {
        await fila({ status: 'enviada', enviada_em: agora, message_id_uazapi: idMensagem(body), erro: null, formato_envio: formato })
        await instancia({ ultimo_envio_em: agora, proximo_envio_apos: emMin(intervaloAleatorioMin()) })
        c.enviadas++
      } else if (desconectado) {
        await devolver()
        await instancia({ status: 'disconnected', ultimo_motivo_desconexao: status === 401 ? 'Chave do número recusada no envio' : 'Desconectado detectado no envio', status_atualizado_em: agora })
        c.devolvidas++
      } else if (status === 429) {
        const s = Number(retryAfter)
        await devolver()
        await instancia({ proximo_envio_apos: Number.isFinite(s) && s > 0 ? new Date(Date.now() + s * 1000).toISOString() : emMin(5) })
        c.devolvidas++
      } else if (status === 400 || status === 404 || status === 422) {
        await falhar('NUMERO_INVALIDO')
      } else if (status === 0 || status >= 500) {
        await falhar('RESULTADO_INCERTO') // pode ter saído: nunca reenviar
      } else {
        await falhar(`ERRO_HTTP_${status}`)
      }
    }
  } catch (e) {
    erroGeral = e instanceof Error ? e.message.slice(0, 300) : 'erro desconhecido'
  }

  if (c.reservadas > 0 || erroGeral) {
    await db.from('whatsapp_worker_execucoes').insert({
      iniciado_em: new Date(inicio).toISOString(), duracao_ms: Date.now() - inicio, ...c, erro: erroGeral,
    })
  }
  return json(erroGeral ? 500 : 200, c)
})
