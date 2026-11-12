// Mapa personalizado: um paciente por vez, com os exames agrupados pela
// ordem das bancadas (reportOrder) e o cabeçalho do pedido.

export interface MapaBancada {
  id: string
  name: string
  reportOrder?: number | null
}

export interface MapaPersonalizadoExame {
  sigla: string
  nome: string
  workbenchId?: string | null
  /** Nome da bancada gravado no pedido (fallback quando a bancada não está no cadastro). */
  bancadaNome?: string | null
}

export interface MapaPersonalizadoGrupo<E extends MapaPersonalizadoExame> {
  bancadaId: string
  bancadaNome: string
  /** Número da bancada no estilo "01" (vazio quando não tem ordem cadastrada). */
  numero: string
  ordem: number
  exames: E[]
}

const SEM_ORDEM = Number.MAX_SAFE_INTEGER

/** Agrupa os exames por bancada, na ordem da bancada; dentro dela, mantém a ordem do pedido. */
export function agruparPorBancada<E extends MapaPersonalizadoExame>(
  exames: readonly E[],
  bancadas: readonly MapaBancada[],
): MapaPersonalizadoGrupo<E>[] {
  const grupos = new Map<string, MapaPersonalizadoGrupo<E>>()
  exames.forEach(exame => {
    const id = exame.workbenchId || ''
    const bancada = bancadas.find(b => b.id === id)
    const chave = bancada?.id || id || `nome:${exame.bancadaNome || ''}`
    let grupo = grupos.get(chave)
    if (!grupo) {
      const ordem = bancada?.reportOrder && bancada.reportOrder > 0 ? bancada.reportOrder : SEM_ORDEM
      grupo = {
        bancadaId: chave,
        bancadaNome: (bancada?.name || exame.bancadaNome || 'Sem bancada').toUpperCase(),
        numero: ordem === SEM_ORDEM ? '' : String(ordem).padStart(2, '0'),
        ordem,
        exames: [],
      }
      grupos.set(chave, grupo)
    }
    grupo.exames.push(exame)
  })
  return Array.from(grupos.values()).sort(
    (a, b) => a.ordem - b.ordem || a.bancadaNome.localeCompare(b.bancadaNome, 'pt-BR'),
  )
}

/** Pacientes em ordem alfabética; mesmo nome segue o número do pedido. */
export function ordenarPacientes<P extends { paciente: string; codigo: string }>(lista: readonly P[]): P[] {
  return [...lista].sort(
    (a, b) =>
      a.paciente.localeCompare(b.paciente, 'pt-BR', { sensitivity: 'base' }) ||
      a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }),
  )
}
