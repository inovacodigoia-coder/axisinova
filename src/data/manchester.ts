/**
 * Protocolo de Manchester — fluxogramas por queixa e seus discriminadores.
 * Cores e tempos-alvo oficiais.
 */

export type ManchesterColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue'

export interface ManchesterColorInfo {
  key: ManchesterColor
  label: string
  priority: number
  targetMinutes: number
  hex: string
  text: string
}

export const MANCHESTER_COLORS: Record<ManchesterColor, ManchesterColorInfo> = {
  red: { key: 'red', label: 'Vermelho — Emergência', priority: 1, targetMinutes: 0, hex: '#DC2626', text: 'Atendimento imediato' },
  orange: { key: 'orange', label: 'Laranja — Muito Urgente', priority: 2, targetMinutes: 10, hex: '#EA580C', text: 'Até 10 minutos' },
  yellow: { key: 'yellow', label: 'Amarelo — Urgente', priority: 3, targetMinutes: 60, hex: '#CA8A04', text: 'Até 60 minutos' },
  green: { key: 'green', label: 'Verde — Pouco Urgente', priority: 4, targetMinutes: 120, hex: '#16A34A', text: 'Até 120 minutos' },
  blue: { key: 'blue', label: 'Azul — Não Urgente', priority: 5, targetMinutes: 240, hex: '#2563EB', text: 'Até 240 minutos' },
}

export const COLOR_ORDER: ManchesterColor[] = ['red', 'orange', 'yellow', 'green', 'blue']

export interface Discriminator {
  label: string
  color: ManchesterColor
}

/** Discriminadores gerais — presentes em todos os fluxogramas. */
export const GENERAL_DISCRIMINATORS: Discriminator[] = [
  { label: 'Choque', color: 'red' },
  { label: 'Comprometimento de via aérea', color: 'red' },
  { label: 'Respiração ineficaz', color: 'red' },
  { label: 'Inconsciente (não responsivo)', color: 'red' },
  { label: 'Convulsionando agora', color: 'red' },
  { label: 'Exsanguinação / hemorragia incontrolável', color: 'red' },
  { label: 'Dor intensa (8 a 10)', color: 'orange' },
  { label: 'Hemorragia intensa não controlada', color: 'orange' },
  { label: 'Alteração do nível de consciência', color: 'orange' },
  { label: 'Adulto com temperatura muito alta (> 41 °C)', color: 'orange' },
  { label: 'Criança com temperatura muito alta (> 41 °C)', color: 'orange' },
  { label: 'Início agudo após lesão', color: 'orange' },
  { label: 'Dor moderada (4 a 7)', color: 'yellow' },
  { label: 'Hemorragia moderada não controlada', color: 'yellow' },
  { label: 'História inadequada / incoerente', color: 'yellow' },
  { label: 'Adulto com temperatura alta (> 38,5 °C)', color: 'yellow' },
  { label: 'Criança com temperatura alta (> 38,5 °C)', color: 'yellow' },
  { label: 'Problema recente (até 7 dias)', color: 'green' },
  { label: 'Dor leve (1 a 3)', color: 'green' },
  { label: 'Hemorragia leve', color: 'green' },
  { label: 'Vômito / diarreia persistente', color: 'green' },
  { label: 'Problema antigo (mais de 7 dias)', color: 'blue' },
  { label: 'Sem discriminador presente', color: 'blue' },
]

export interface Flowchart {
  name: string
  discriminators: Discriminator[]
}

/** Fluxogramas oficiais do Protocolo de Manchester com discriminadores específicos. */
export const FLOWCHARTS: Flowchart[] = [
  { name: 'Agressão', discriminators: [
    { label: 'Lesão penetrante', color: 'orange' },
    { label: 'Ferimento com sangramento ativo', color: 'orange' },
    { label: 'Risco de agressão continuada', color: 'yellow' },
    { label: 'Ferimento superficial', color: 'green' },
  ]},
  { name: 'Alergia', discriminators: [
    { label: 'Edema de glote / estridor', color: 'red' },
    { label: 'Anafilaxia em curso', color: 'red' },
    { label: 'Edema facial ou de lábios', color: 'orange' },
    { label: 'Urticária generalizada', color: 'yellow' },
    { label: 'Prurido localizado', color: 'green' },
  ]},
  { name: 'Asma', discriminators: [
    { label: 'Incapaz de falar frases completas', color: 'orange' },
    { label: 'Uso de musculatura acessória', color: 'orange' },
    { label: 'SpO2 abaixo de 92%', color: 'orange' },
    { label: 'Pico de fluxo reduzido', color: 'yellow' },
    { label: 'Sibilância leve', color: 'green' },
  ]},
  { name: 'Alterações do comportamento', discriminators: [
    { label: 'Risco imediato para si ou terceiros', color: 'orange' },
    { label: 'Agitação psicomotora intensa', color: 'orange' },
    { label: 'Ideação suicida', color: 'yellow' },
    { label: 'Comportamento estranho recente', color: 'green' },
  ]},
  { name: 'Autoagressão', discriminators: [
    { label: 'Tentativa de suicídio em curso', color: 'red' },
    { label: 'Ferimento autoinfligido com sangramento', color: 'orange' },
    { label: 'Intenção suicida declarada', color: 'yellow' },
    { label: 'Autoagressão antiga', color: 'green' },
  ]},
  { name: 'Cefaleia', discriminators: [
    { label: 'Cefaleia súbita e intensa (thunderclap)', color: 'orange' },
    { label: 'Sinais neurológicos focais', color: 'orange' },
    { label: 'Rigidez de nuca', color: 'orange' },
    { label: 'Cefaleia com vômitos', color: 'yellow' },
    { label: 'Cefaleia habitual', color: 'green' },
  ]},
  { name: 'Convulsões', discriminators: [
    { label: 'Convulsionando no momento', color: 'red' },
    { label: 'Estado pós-ictal', color: 'orange' },
    { label: 'Mais de uma crise hoje', color: 'orange' },
    { label: 'Crise única já resolvida', color: 'yellow' },
    { label: 'Crise habitual controlada', color: 'green' },
  ]},
  { name: 'Diabetes', discriminators: [
    { label: 'Hipoglicemia com rebaixamento', color: 'red' },
    { label: 'Glicemia muito alta com cetose', color: 'orange' },
    { label: 'Glicemia alterada sintomática', color: 'yellow' },
    { label: 'Ajuste de tratamento', color: 'green' },
  ]},
  { name: 'Diarreia e vômitos', discriminators: [
    { label: 'Sinais de desidratação grave', color: 'orange' },
    { label: 'Vômito com sangue', color: 'orange' },
    { label: 'Diarreia com sangue', color: 'yellow' },
    { label: 'Vômitos persistentes', color: 'yellow' },
    { label: 'Diarreia sem desidratação', color: 'green' },
  ]},
  { name: 'Dispneia em adulto', discriminators: [
    { label: 'Respiração ineficaz', color: 'red' },
    { label: 'SpO2 abaixo de 92%', color: 'orange' },
    { label: 'Incapaz de falar frases completas', color: 'orange' },
    { label: 'Dispneia aos esforços', color: 'yellow' },
    { label: 'Dispneia antiga sem alteração', color: 'green' },
  ]},
  { name: 'Dispneia em criança', discriminators: [
    { label: 'Estridor / tiragem grave', color: 'red' },
    { label: 'Batimento de asa de nariz', color: 'orange' },
    { label: 'SpO2 abaixo de 92%', color: 'orange' },
    { label: 'Taquipneia moderada', color: 'yellow' },
    { label: 'Tosse sem esforço respiratório', color: 'green' },
  ]},
  { name: 'Dor abdominal em adulto', discriminators: [
    { label: 'Abdome rígido com choque', color: 'red' },
    { label: 'Dor intensa (8 a 10)', color: 'orange' },
    { label: 'Vômito com sangue / melena', color: 'orange' },
    { label: 'Dor moderada (4 a 7)', color: 'yellow' },
    { label: 'Dor leve (1 a 3)', color: 'green' },
  ]},
  { name: 'Dor abdominal em criança', discriminators: [
    { label: 'Abdome rígido', color: 'orange' },
    { label: 'Dor intensa (8 a 10)', color: 'orange' },
    { label: 'Vômitos biliosos', color: 'yellow' },
    { label: 'Dor leve', color: 'green' },
  ]},
  { name: 'Dor cervical', discriminators: [
    { label: 'Déficit neurológico', color: 'orange' },
    { label: 'História de trauma cervical', color: 'orange' },
    { label: 'Dor moderada', color: 'yellow' },
    { label: 'Dor leve antiga', color: 'green' },
  ]},
  { name: 'Dor lombar', discriminators: [
    { label: 'Perda de controle esfincteriano', color: 'orange' },
    { label: 'Déficit motor em membros inferiores', color: 'orange' },
    { label: 'Dor moderada', color: 'yellow' },
    { label: 'Lombalgia crônica', color: 'green' },
  ]},
  { name: 'Dor torácica', discriminators: [
    { label: 'Dor torácica com choque', color: 'red' },
    { label: 'Dor torácica típica cardíaca', color: 'orange' },
    { label: 'Dor irradiada para braço / mandíbula', color: 'orange' },
    { label: 'Dor pleurítica', color: 'yellow' },
    { label: 'Dor torácica antiga sem alteração', color: 'green' },
  ]},
  { name: 'Estado de inconsciência', discriminators: [
    { label: 'Glasgow menor que 9', color: 'red' },
    { label: 'Não responsivo à dor', color: 'red' },
    { label: 'Glasgow entre 9 e 12', color: 'orange' },
    { label: 'Desmaio recuperado', color: 'yellow' },
  ]},
  { name: 'Exposição a agentes químicos', discriminators: [
    { label: 'Via aérea comprometida', color: 'red' },
    { label: 'Exposição a agente altamente tóxico', color: 'orange' },
    { label: 'Contato ocular com produto químico', color: 'orange' },
    { label: 'Contato cutâneo limitado', color: 'yellow' },
  ]},
  { name: 'Feridas', discriminators: [
    { label: 'Hemorragia incontrolável', color: 'red' },
    { label: 'Ferida penetrante ou profunda', color: 'orange' },
    { label: 'Ferida com necessidade de sutura', color: 'yellow' },
    { label: 'Ferida superficial', color: 'green' },
  ]},
  { name: 'Grande traumatismo', discriminators: [
    { label: 'Mecanismo de alta energia com instabilidade', color: 'red' },
    { label: 'Trauma com sinais de choque', color: 'red' },
    { label: 'Trauma com deformidade evidente', color: 'orange' },
    { label: 'Trauma sem alteração de sinais vitais', color: 'yellow' },
  ]},
  { name: 'Gravidez', discriminators: [
    { label: 'Sangramento vaginal intenso', color: 'orange' },
    { label: 'Trabalho de parto ativo', color: 'orange' },
    { label: 'Redução de movimentos fetais', color: 'yellow' },
    { label: 'Queixa gestacional leve', color: 'green' },
  ]},
  { name: 'Hemorragia gastrointestinal', discriminators: [
    { label: 'Hematêmese com choque', color: 'red' },
    { label: 'Melena com instabilidade', color: 'orange' },
    { label: 'Sangramento retal moderado', color: 'yellow' },
    { label: 'Sangramento leve antigo', color: 'green' },
  ]},
  { name: 'Infecções locais e abcessos', discriminators: [
    { label: 'Sinais de sepse', color: 'orange' },
    { label: 'Celulite em progressão', color: 'yellow' },
    { label: 'Abcesso localizado', color: 'green' },
  ]},
  { name: 'Mal-estar em adulto', discriminators: [
    { label: 'Sinais de sepse', color: 'orange' },
    { label: 'Prostração intensa', color: 'yellow' },
    { label: 'Mal-estar sem sinais de alarme', color: 'green' },
  ]},
  { name: 'Mordeduras e picadas', discriminators: [
    { label: 'Reação anafilática', color: 'red' },
    { label: 'Picada de animal peçonhento', color: 'orange' },
    { label: 'Mordedura com sangramento', color: 'yellow' },
    { label: 'Picada sem reação sistêmica', color: 'green' },
  ]},
  { name: 'Overdose e envenenamento', discriminators: [
    { label: 'Rebaixamento de consciência', color: 'red' },
    { label: 'Ingestão de substância altamente tóxica', color: 'orange' },
    { label: 'Ingestão há mais de 6 horas assintomático', color: 'yellow' },
  ]},
  { name: 'Problemas em extremidades', discriminators: [
    { label: 'Extremidade fria e sem pulso', color: 'red' },
    { label: 'Deformidade com déficit neurovascular', color: 'orange' },
    { label: 'Suspeita de fratura', color: 'yellow' },
    { label: 'Entorse leve', color: 'green' },
  ]},
  { name: 'Problemas oculares', discriminators: [
    { label: 'Perda súbita de visão', color: 'orange' },
    { label: 'Queimadura química ocular', color: 'orange' },
    { label: 'Corpo estranho ocular', color: 'yellow' },
    { label: 'Olho vermelho sem dor', color: 'green' },
  ]},
  { name: 'Problemas urinários', discriminators: [
    { label: 'Retenção urinária aguda', color: 'orange' },
    { label: 'Hematúria com dor intensa', color: 'orange' },
    { label: 'Disúria com febre', color: 'yellow' },
    { label: 'Disúria sem febre', color: 'green' },
  ]},
  { name: 'Queimaduras', discriminators: [
    { label: 'Queimadura de via aérea', color: 'red' },
    { label: 'Grande superfície corporal queimada', color: 'orange' },
    { label: 'Queimadura de face, mãos ou genitália', color: 'orange' },
    { label: 'Queimadura superficial pequena', color: 'green' },
  ]},
  { name: 'Sangramento vaginal', discriminators: [
    { label: 'Hemorragia com choque', color: 'red' },
    { label: 'Sangramento intenso na gravidez', color: 'orange' },
    { label: 'Sangramento moderado', color: 'yellow' },
    { label: 'Sangramento leve', color: 'green' },
  ]},
  { name: 'Trauma craniano', discriminators: [
    { label: 'Glasgow menor que 13 após trauma', color: 'red' },
    { label: 'Vômitos repetidos após trauma', color: 'orange' },
    { label: 'Perda de consciência transitória', color: 'yellow' },
    { label: 'Trauma leve sem sintomas', color: 'green' },
  ]},
  { name: 'Criança irritável', discriminators: [
    { label: 'Criança não responsiva', color: 'red' },
    { label: 'Choro inconsolável com febre alta', color: 'orange' },
    { label: 'Irritabilidade com recusa alimentar', color: 'yellow' },
    { label: 'Irritabilidade leve', color: 'green' },
  ]},
  { name: 'Doença mental', discriminators: [
    { label: 'Violência iminente', color: 'orange' },
    { label: 'Delírio ou alucinação aguda', color: 'yellow' },
    { label: 'Acompanhamento de rotina', color: 'blue' },
  ]},
  { name: 'Indisposição em adulto', discriminators: [
    { label: 'Hipotensão sintomática', color: 'orange' },
    { label: 'Tontura persistente', color: 'yellow' },
    { label: 'Cansaço sem sinais de alarme', color: 'green' },
  ]},
  { name: 'Outros / Queixa não listada', discriminators: [] },
]

/** Resolve a cor final pela regra do protocolo: prevalece o discriminador mais grave. */
export function resolveColor(selected: Discriminator[]): ManchesterColor {
  if (!selected.length) return 'blue'
  return selected.reduce<ManchesterColor>((worst, d) =>
    MANCHESTER_COLORS[d.color].priority < MANCHESTER_COLORS[worst].priority ? d.color : worst,
  'blue')
}

/** Próxima cor mais grave, usada na reclassificação por tempo excedido. */
export function escalateColor(color: ManchesterColor): ManchesterColor {
  const idx = COLOR_ORDER.indexOf(color)
  return idx <= 0 ? 'red' : COLOR_ORDER[idx - 1]
}

export const REPRINT_REASONS = [
  'Pulseira danificada',
  'Pulseira perdida / removida',
  'Dados impressos incorretos',
  'Falha na impressão',
  'Outro motivo (descrever)',
]
