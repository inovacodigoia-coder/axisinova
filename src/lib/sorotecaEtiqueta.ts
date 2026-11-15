// Etiqueta da estante: vai para o Servidor de Impressão local, na mesma impressora térmica das etiquetas de tubo.
import { imprimirEtiquetas, servidorImpressaoAtivo, TIPOS_DOCUMENTO, type DadosEtiqueta } from '@/lib/impressaoLocal'
import { registrarImpressaoSoroteca } from '@/hooks/useSoroteca'
import { gradeDaEstante, rotuloPosicao, TIPOS_EQUIPAMENTO, type EquipamentoSoroteca } from '@/lib/soroteca'

/** Dados enviados ao servidor: o código de barras é o próprio código da estante (ou o nome da geladeira). */
export function dadosEtiquetaEquipamento(e: EquipamentoSoroteca, laboratorio?: string | null, agora = new Date()): DadosEtiqueta {
  const g = gradeDaEstante(e)
  const codigo = (e.codigo || e.nome).trim().toUpperCase()
  const tipo = TIPOS_EQUIPAMENTO.find(t => t.value === e.tipo)?.label || 'Equipamento'
  const detalhe = e.tipo === 'estante'
    ? (g ? `${g.linhas}×${g.colunas} · A01–${rotuloPosicao(g.linhas, g.colunas)}` : undefined)
    : [e.temperatura, `${e.prateleiras.length} prateleira(s)`].filter(Boolean).join(' · ')
  return {
    codigoAmostra: codigo,
    codigoAlfanumerico: codigo,
    paciente: `${tipo.toUpperCase()} ${e.tipo === 'estante' ? codigo : e.nome}`.trim(),
    tipoAmostra: detalhe || undefined,
    painel: e.bancada_nome || undefined,
    dataHora: agora.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
    laboratorio: laboratorio || undefined,
    fimPedido: true,
  }
}

/** Confere o servidor antes de mandar (sem reenvio automático) e devolve a mensagem para o aviso. */
export async function imprimirEtiquetaEquipamento(e: EquipamentoSoroteca, laboratorio?: string | null): Promise<string> {
  if (!(await servidorImpressaoAtivo())) {
    throw new Error('Servidor de Impressão AisAxius não está aberto. Abra o programa na bandeja do Windows e tente de novo.')
  }
  const r = await imprimirEtiquetas(TIPOS_DOCUMENTO.etiquetaCliente, [dadosEtiquetaEquipamento(e, laboratorio)])
  await registrarImpressaoSoroteca('etiqueta', e.id)
  return r.mensagem || `Etiqueta de ${e.codigo || e.nome} enviada para impressão`
}
