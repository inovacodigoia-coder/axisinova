// Espelho exato de public.whatsapp_render_modelo (SQL). Mudou um, mude o outro.
export const VARIAVEIS_MODELO = [
  { chave: '{paciente}', desc: 'nome completo do paciente' },
  { chave: '{primeiro_nome}', desc: 'primeiro nome do paciente' },
  { chave: '{tipo}', desc: 'tipo do atendimento' },
  { chave: '{medico}', desc: 'nome do médico com título' },
  { chave: '{data_hora}', desc: 'data e hora do agendamento' },
  { chave: '{responsavel}', desc: 'quem fez o agendamento' },
] as const

export const MODELOS_PADRAO: Record<number, string> = {
  1: 'Olá, {primeiro_nome}! Tudo bem? Passando para confirmar seu agendamento: {tipo} com {medico} em {data_hora}. Tudo certo?',
  2: 'Oi, {paciente}! Você tem um agendamento de {tipo} com {medico} em {data_hora}. Pode confirmar sua presença?',
  3: '{primeiro_nome}, tudo certo para {data_hora}? Está agendado: {tipo} com {medico}. Confirma para nós?',
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
