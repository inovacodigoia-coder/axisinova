/**
 * Junta os valores gravados no banco com o que está na tela da Digitação.
 * O valor salvo (Salvar Parcial, Concluir, aparelho, CALC manual) sempre volta
 * ao abrir a tela; só não substitui o que o usuário digitou nesta sessão.
 * Aparelho e CALC manual persistido prevalecem até sobre a digitação da sessão.
 */
export function mergeSavedResults(args: {
  current: Record<string, string>
  saved: Record<string, string>
  userEdited: Set<string>
  priority?: Set<string>
}): Record<string, string> {
  const { current, saved, userEdited, priority } = args
  const next = { ...current }
  for (const [k, v] of Object.entries(saved)) {
    if (priority?.has(k) || !userEdited.has(k)) next[k] = v
  }
  return next
}
