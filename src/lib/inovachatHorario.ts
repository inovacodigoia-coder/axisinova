// Espelho de inovachat_horario_texto (SQL) para pré-visualização.
export interface DiaHorario { d: number; a: boolean; i: string; f: string }
export const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]
export const DIAS_PADRAO: DiaHorario[] = ORDEM_DIAS.map(d => ({ d, a: d >= 1 && d <= 5, i: '08:00', f: d >= 1 && d <= 5 ? '18:00' : '12:00' }))
export const FORA_HORARIO_PADRAO = 'Olá, {nome_contato}! Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos assim que possível. Nosso horário: {horario_atendimento}.'

export function horarioTexto(dias: DiaHorario[]): string {
  const partes: string[] = []
  let atual: string | null = null, ini = 0, fim = 0
  for (let k = 0; k <= 7; k++) {
    const e = k < 7 ? dias.find(x => x.d === ORDEM_DIAS[k]) : undefined
    const chave = e?.a ? `${e.i}|${e.f}` : null
    if (atual && chave !== atual) {
      const [i, f] = atual.split('|')
      const n = ini === fim ? NOMES_DIA[ORDEM_DIAS[ini]] : `${NOMES_DIA[ORDEM_DIAS[ini]]} a ${NOMES_DIA[ORDEM_DIAS[fim]]}`
      partes.push(`${n}, das ${i} às ${f}`); atual = null
    }
    if (chave && !atual) { atual = chave; ini = k }
    if (chave) fim = k
  }
  if (!partes.length) return 'sem horário de atendimento definido'
  const t = partes.join('; ')
  return t[0].toUpperCase() + t.slice(1)
}

export function renderForaHorario(texto: string, v: { nome_contato: string; empresa: string; horario: string }) {
  return texto.split('{nome_contato}').join(v.nome_contato).split('{empresa}').join(v.empresa)
    .split('{horario_atendimento}').join(v.horario).replace(/,\s*([!.?])/g, '$1')
}
