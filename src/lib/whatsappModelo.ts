// Espelho exato de public.whatsapp_render_modelo (SQL). Mudou um, mude o outro.
export const VARIAVEIS_MODELO = [
  { chave: '{paciente}', desc: 'nome completo do paciente' },
  { chave: '{primeiro_nome}', desc: 'primeiro nome do paciente' },
  { chave: '{tipo}', desc: 'tipo do atendimento' },
  { chave: '{medico}', desc: 'nome do médico com título' },
  { chave: '{data_hora}', desc: 'data e hora do agendamento' },
  { chave: '{dia_semana}', desc: 'dia da semana (ex.: QUARTA)' },
  { chave: '{responsavel}', desc: 'quem fez o agendamento' },
] as const

export const MODELOS_PADRAO: Record<number, string> = {
  1: 'Olá, {primeiro_nome}! Tudo bem? Passando para confirmar seu agendamento: {tipo} com {medico} em {data_hora}. Tudo certo?',
  2: 'Oi, {paciente}! Você tem um agendamento de {tipo} com {medico} em {data_hora}. Pode confirmar sua presença?',
  3: '{primeiro_nome}, tudo certo para {data_hora}? Está agendado: {tipo} com {medico}. Confirma para nós?',
}

export const RESPOSTAS_PADRAO: Record<string, string> = {
  resposta_confirmar: '{primeiro_nome} seu agendamento foi confirmado com sucesso.\n\nAgradecemos a sua confiança e ficamos à disposição caso precise alterar o horário ou obter mais informações.\n\nTenha um excelente dia! Até {dia_semana}! 💚🙏',
  resposta_remarcar: 'Recebemos seu pedido de remarcação. Nossa equipe entrará em contato em breve para combinar um novo horário. 💚',
  resposta_cancelar: 'Recebemos seu pedido de cancelamento. Nossa equipe vai confirmar com você em breve. 🙏',
}

const DIAS_MAIUSC = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

/** Dia da semana em maiúsculas, sem "-feira", fuso America/Fortaleza. */
export function diaSemana(d: Date): string {
  const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Fortaleza', weekday: 'short' }).format(d)
  return DIAS_MAIUSC[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)] ?? ''
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function formatarDataHora(d: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(d).map(p => [p.type, p.value]),
  )
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return `${DIAS[dow]}, ${parts.day}/${parts.month}/${parts.year} às ${parts.hour}:${parts.minute}`
}

export interface DadosModelo {
  paciente?: string | null
  tipo?: string | null
  primeiraVez?: boolean | null
  medico?: string | null
  dataHora?: Date | string | null
  responsavel?: string | null
}

export function renderModelo(texto: string, d: DadosModelo): string {
  const pac = (d.paciente ?? '').trim()
  let tipo = (d.tipo ?? '').trim().toLowerCase()
  if (tipo && d.primeiraVez) tipo += ' (1ª vez)'
  const dh = d.dataHora ? formatarDataHora(new Date(d.dataHora)) : ''
  let r = texto ?? ''
  r = r.split('{paciente}').join(pac)
  r = r.split('{primeiro_nome}').join(pac.split(' ')[0] ?? '')
  r = r.split('{tipo}').join(tipo)
  r = r.split('{medico}').join((d.medico ?? '').trim())
  r = r.split('{data_hora}').join(dh)
  r = r.split('{dia_semana}').join(d.dataHora ? diaSemana(new Date(d.dataHora)) : '')
  r = r.split('{responsavel}').join(limparNome(d.responsavel))
  r = r.replace(/[ \t]{2,}/g, ' ')
  r = r.replace(/ +([,.!?;:])/g, '$1')
  return r.trim()
}

export function variaveisDesconhecidas(texto: string): string[] {
  const ok = new Set<string>(VARIAVEIS_MODELO.map(v => v.chave))
  return [...new Set((texto.match(/\{[^{}\s]*\}/g) ?? []).filter(v => !ok.has(v)))]
}

export function limparTexto(t: string): string {
  // eslint-disable-next-line no-control-regex
  return t.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim()
}

/** Igual a whatsapp_limpar_nome (SQL): tira * _ ~ e espaços extras. */
export function limparNome(n?: string | null): string {
  return (n ?? '').replace(/[*_~]/g, '').replace(/\s+/g, ' ').trim()
}

/** Igual a whatsapp_cabecalho (SQL): "*Nome*:" + quebra de linha + corpo. */
export function comCabecalho(responsavel: string | null | undefined, corpo: string): string {
  const n = limparNome(responsavel)
  return n ? `*${n}*:\n${corpo}` : corpo
}

export function textoNumerado(t: string): string {
  return `${t}\n\nResponda com o número:\n1 - CONFIRMAR\n2 - REMARCAR\n3 - CANCELAR`
}

// ---------- Etapa 11A: automações de ciclo (espelho de whatsapp_automacao_padrao / whatsapp__ciclo_um) ----------
export type TipoAutomacao = 'inclusao_agenda' | 'pre_atendimento' | 'pos_atendimento'
import { AVISO_SAIR } from '../../supabase/functions/_shared/whatsappCiclo'
export { BOTAO_SAIR, separarAvisoSaida } from '../../supabase/functions/_shared/whatsappCiclo'
export { AVISO_SAIR }
export const AUTOMACOES_PADRAO: Record<TipoAutomacao, { nome: string; deslocamento: number; horario: string | null; filtro: string[] | null; aviso: boolean; texto: string }> = {
  inclusao_agenda: { nome: 'Inclusão na agenda', deslocamento: 5, horario: null, filtro: null, aviso: false,
    texto: 'Olá, {primeiro_nome}! Seu agendamento foi realizado: {tipo} com {medico} em {data_hora}. Qualquer alteração, fale com a nossa equipe.' },
  pre_atendimento: { nome: 'Pré-atendimento', deslocamento: 1440, horario: '18:00', filtro: ['Exame', 'Procedimento'], aviso: false,
    texto: 'Olá, {primeiro_nome}! Lembrete do seu atendimento: {tipo} com {medico} em {data_hora}. Orientações: [escreva aqui as orientações de preparo].' },
  pos_atendimento: { nome: 'Pós-atendimento', deslocamento: 120, horario: null, filtro: null, aviso: true,
    texto: 'Olá, {primeiro_nome}! Foi um prazer atender você hoje. Se precisar de algo, estamos à disposição. Cuide-se! 💚' },
}
export const TIPO_AUTOMACAO_LABEL: Record<TipoAutomacao, string> = {
  inclusao_agenda: 'Inclusão na agenda', pre_atendimento: 'Pré-atendimento', pos_atendimento: 'Pós-atendimento',
}

/** Corpo final de uma mensagem de ciclo (sem cabeçalho), igual ao banco. */
export function textoCiclo(texto: string, d: DadosModelo, incluirAviso: boolean): string {
  return renderModelo(texto, d) + (incluirAviso ? AVISO_SAIR : '')
}

export const temMarcadorOrientacao = (t: string) => t.toLowerCase().includes('[escreva aqui')

function fmtDur(min: number) {
  if (min % 1440 === 0 && min > 0) { const d = min / 1440; return d === 1 ? '1 dia' : `${d} dias` }
  if (min % 60 === 0 && min > 0) { const h = min / 60; return h === 1 ? '1 hora' : `${h} horas` }
  return min === 1 ? '1 minuto' : `${min} minutos`
}

/** Descrição humana de quando a regra envia. */
export function descreverQuando(tipo: TipoAutomacao, min: number, horario?: string | null): string {
  const hr = horario ? String(horario).slice(0, 5) : null
  if (tipo === 'pre_atendimento') {
    if (hr) {
      const dias = Math.round(min / 1440)
      const dia = dias <= 0 ? 'no dia do atendimento' : dias === 1 ? 'no dia anterior ao atendimento' : `${dias} dias antes do atendimento`
      return `${dia}, às ${hr}`
    }
    return min === 0 ? 'no horário do atendimento' : `${fmtDur(min)} antes do atendimento`
  }
  const base = tipo === 'pos_atendimento' ? 'de finalizar o atendimento' : 'de criar o agendamento'
  const q = min === 0 ? `logo depois ${base}` : `${fmtDur(min)} depois ${base}`
  return hr ? `${q}, às ${hr}` : q
}
