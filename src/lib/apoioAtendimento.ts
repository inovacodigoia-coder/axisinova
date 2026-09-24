/** Regras do atendimento para exames que vão para o laboratório de apoio. */

export const APOIO_NOME_MAX = 35

/** Abrevia os sobrenomes do meio (da direita para a esquerda) até caber, mantendo primeiro e último nome. */
export function abreviarNome(nome: string, max = APOIO_NOME_MAX): string {
  const limpo = (nome || '').trim().replace(/\s+/g, ' ').toUpperCase()
  if (limpo.length <= max) return limpo
  const partes = limpo.split(' ')
  if (partes.length <= 2) return limpo.slice(0, max)
  const conectivos = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E'])
  // Índices do meio que podem ser abreviados, começando pelo mais próximo do último nome
  const meio = partes.map((_, i) => i).slice(1, -1).reverse()
  // Passo 1: abreviar sobrenomes do meio (não conectivos), da direita para a esquerda
  for (const i of meio.slice().reverse()) {
    if (partes.join(' ').length <= max) break
    if (conectivos.has(partes[i]) || partes[i].length <= 1) continue
    partes[i] = partes[i][0]
  }
  let res = partes.join(' ')
  // Passo 2: remover conectivos soltos entre iniciais, se ainda não coube
  if (res.length > max) {
    const semConect = partes.filter((p, i) => i === 0 || i === partes.length - 1 || !conectivos.has(p))
    res = semConect.join(' ')
  }
  return res.length > max ? res.slice(0, max).trim() : res
}

const NUMERICO = /(PESO|ALTURA|IDADE|DIAS|VOLUME|DIURESE|TEMPO|KG|CM|ML|SEMANA|HORA|DUM|GESTA)/i
export const infoCompNumerico = (label: string) => NUMERICO.test(label || '')

export interface ApoioInfo {
  nome_envio?: string
  info_comp?: Record<string, string>
  condicao?: string
}

/** Lista os problemas que impedem salvar o pedido por causa dos exames de apoio. Vazio = ok. */
export function validarApoio(state: any): string[] {
  const erros: string[] = []
  const exames = (state?.guides || []).flatMap((g: any) => g.exams || []).filter((e: any) => e.bancadaTipo === 'apoio')
  if (exames.length === 0) return erros
  const p = state?.patient || {}
  const sexo = p.gender || p.sex
  if (!sexo || sexo === 'not_informed') erros.push('Informe o sexo do paciente (Masculino, Feminino ou Indefinido) — obrigatório para exame de apoio')
  if (!p.birthDate && !p.age) erros.push('Informe a data de nascimento ou a idade do paciente — obrigatório para exame de apoio')
  const nome = String(p.fullName || '')
  if (nome.trim().length > APOIO_NOME_MAX) {
    const env = String(state?.apoioNomeEnvio ?? abreviarNome(nome)).trim()
    if (!env) erros.push('Informe o nome abreviado que será enviado ao apoio')
    else if (env.length > APOIO_NOME_MAX) erros.push(`O nome enviado ao apoio precisa ter no máximo ${APOIO_NOME_MAX} caracteres`)
  }
  for (const e of exames) {
    const campos: string[] = e.apoioInfoComp || []
    const valores = e.apoioInfo?.info_comp || {}
    for (const c of campos) {
      const v = String(valores[c] ?? '').trim()
      if (!v) erros.push(`${e.name}: preencha "${c}"`)
      else if (infoCompNumerico(c) && !/^\d+(\.\d+)?$/.test(v)) erros.push(`${e.name}: "${c}" deve ser número com ponto decimal (ex.: 70.5)`)
    }
    if ((e.apoioCondicoes || []).length > 0 && !e.apoioInfo?.condicao) erros.push(`${e.name}: escolha a condição`)
  }
  return erros
}

/** Copia o nome de envio para cada exame de apoio antes de gravar o pedido. */
export function aplicarNomeEnvio(guides: any[], state: any): any[] {
  const nome = String(state?.patient?.fullName || '')
  const env = nome.trim().length > APOIO_NOME_MAX ? String(state?.apoioNomeEnvio ?? abreviarNome(nome)).trim() : null
  if (!env) return guides
  return (guides || []).map((g: any) => ({
    ...g,
    exams: (g.exams || []).map((e: any) => e.bancadaTipo === 'apoio' ? { ...e, apoioInfo: { ...(e.apoioInfo || {}), nome_envio: env } } : e),
  }))
}

export const fmtDiaMes = (iso?: string | null) => {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}` : String(iso)
}
