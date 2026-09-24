// Tradução do log de integração com o apoio para português. Nunca mostrar texto cru.
export type Lado = 'nosso' | 'pardini' | 'rede' | 'cadastro'
export type Situacao = 'sucesso' | 'aviso' | 'erro'

export interface LinhaLog {
  id: string; created_at: string; apoio_id: string; apoio_nome: string | null; tipo: string; origem: string | null; usuario_nome: string | null
  http_status: number | null; duracao_ms: number | null; codigos: string[] | null; texto_pardini: string | null
  falha_interna: boolean; sem_conexao: boolean; login_recusado: boolean; recuperado: boolean; situacao: Situacao
  cod_lote: string | null; remessa_id: string | null; remessa_numero: number | null; resolvido_em: string | null; resolvido_obs: string | null; total: number
}

export interface Traducao { resumo: string; oQueFazer: string; lado: Lado; pendente?: boolean }

export const TIPOS: Record<string, string> = {
  transmitir: 'Transmitir remessa', consultar_lote: 'Consultar lote', resultados: 'Buscar resultados', status: 'Status das amostras',
  pendencia: 'Pendências técnicas', recebimento: 'Confirmar recebimento', cancelamento: 'Cancelar exame', catalogo: 'Baixar catálogo',
  modelos: 'Buscar modelos', pdf: 'Baixar laudo PDF', lista_erros: 'Baixar tabela de erros', formato_auto: 'Mapear formato automaticamente',
}
export const LADOS: Record<Lado, string> = { nosso: 'Nosso sistema', pardini: 'Pardini', rede: 'Rede / internet', cadastro: 'Cadastro do laboratório' }

const entre = (c: string, a: number, b: number) => Number(c) >= a && Number(c) <= b
const proximaRotina = () => {
  const d = new Date(); d.setMinutes(Math.ceil((d.getMinutes() + 1) / 10) * 10, 0, 0)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function traduzir(l: LinhaLog, tabelaErros: Map<string, string> = new Map()): Traducao {
  const op = TIPOS[l.tipo] || l.tipo
  const cods = [...(l.codigos || [])].sort((a, b) => Number(b) - Number(a)) // códigos de negócio (1xxxx) primeiro
  const neg = cods.find(c => c.length === 5)

  if (neg === '10023' || neg === '10217') {
    const oque = neg === '10023' ? 'número do lote' : 'código do pedido'
    if (l.recuperado) return { resumo: `O Pardini já tinha recebido este ${neg === '10023' ? 'lote' : 'pedido'}; a resposta foi recuperada.`, oQueFazer: 'Nada a fazer.', lado: 'pardini' }
    return { resumo: `O ${oque} já foi usado no Pardini (por outro sistema).`, oQueFazer: 'Abra a remessa, clique em "Gerar número novo" e transmita de novo.', lado: 'pardini' }
  }
  if (neg && ['10034', '10035', '10213', '10226'].includes(neg)) return { resumo: `Exame não liberado no seu contrato com o Pardini${l.texto_pardini ? `: ${l.texto_pardini}` : ''}.`, oQueFazer: 'Fale com o consultor do Pardini.', lado: 'pardini' }
  if (neg && (neg === '10214' || entre(neg, 10204, 10206))) return { resumo: 'Bloqueio financeiro no Pardini (limite de crédito / conta pré-paga).', oQueFazer: 'Fale com o financeiro do Pardini.', lado: 'pardini' }
  if (neg === '10151' || neg === '10037') return { resumo: `Falta ${neg === '10151' ? 'data de nascimento' : 'sexo'} do paciente.`, oQueFazer: 'Corrija o cadastro do paciente e transmita de novo.', lado: 'cadastro' }
  if (neg && entre(neg, 10104, 10112)) return { resumo: `Informação da amostra inválida para o Pardini${l.texto_pardini ? ` (${l.texto_pardini})` : ''}.`, oQueFazer: 'Confira material, conservante e informação complementar do exame.', lado: 'cadastro' }
  if (l.login_recusado) return { resumo: 'Código ou senha do Pardini recusados.', oQueFazer: 'Confira em Terceirização › Laboratórios.', lado: 'cadastro' }
  if (l.falha_interna) return { resumo: `O servidor do Pardini falhou ao processar (${op}). Não é problema do seu cadastro.`, oQueFazer: 'Tente mais tarde; se repetir, avise o suporte do Pardini.', lado: 'pardini' }
  if (l.sem_conexao) return { resumo: 'Não foi possível falar com o Pardini (internet ou Pardini fora do ar).', oQueFazer: `A rotina tenta de novo sozinha por volta das ${proximaRotina()}.`, lado: 'rede' }
  if (neg || cods.length) {
    const c = neg || cods[0]
    const txt = tabelaErros.get(c) || l.texto_pardini || 'sem descrição'
    return { resumo: `O Pardini devolveu o erro ${c}: ${txt.replace(/<[^>]+>/g, ' ').replace(/%\d/g, '…').trim()}.`, oQueFazer: 'Confira o dado indicado e tente de novo. Se não entender, use "Copiar para o suporte".', lado: 'pardini', pendente: true }
  }
  if (l.situacao === 'erro') return { resumo: `Falha em ${op}.`, oQueFazer: 'Tente de novo. Se repetir, use "Copiar para o suporte".', lado: 'nosso', pendente: true }
  return { resumo: `${op} concluído.`, oQueFazer: 'Nada a fazer.', lado: 'nosso' }
}
