/** Regras de teclado do Cadastro rápido de exames (etapa Guias e Procedimentos). */
export function moverDestaque(atual: number, tecla: string, total: number): number {
  if (total <= 0) return 0
  if (tecla === 'ArrowDown') return (atual + 1) % total
  if (tecla === 'ArrowUp') return (atual - 1 + total) % total
  return Math.min(Math.max(atual, 0), total - 1)
}

/** Enter/Insert fora de campos de digitação abre a busca de exames. */
export function abreBuscaPeloTeclado(tecla: string, alvoTag: string | undefined, modalAberto: boolean): boolean {
  if (modalAberto) return false
  if (tecla !== 'Enter' && tecla !== 'Insert') return false
  const tag = (alvoTag || '').toUpperCase()
  return !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)
}

const semAcento = (v?: string | null) =>
  (v || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Busca de exame no Adicionar Exame: ignora acentos e maiúsculas no nome e nos códigos. */
export function exameCombinaBusca(
  exam: { name?: string | null; tussCode?: string | null; internalCode?: string | null },
  busca: string,
): boolean {
  const q = semAcento(busca)
  if (!q) return false
  return [exam.name, exam.tussCode, exam.internalCode].some(c => semAcento(c).includes(q))
}
