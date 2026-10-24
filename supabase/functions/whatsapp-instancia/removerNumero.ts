/** Fluxo de exclusão isolado para testes sem chamadas ou dados reais. */
export function podeRemoverNumero(superAdmin: boolean, temPermissao: boolean, empresaUsuario: string | null | undefined, empresaInstancia: string) {
  return superAdmin || (temPermissao && !!empresaUsuario && empresaUsuario === empresaInstancia)
}

type ResultadoRemoto = { status: number; retryAfter: string | null }
export async function removerNumeroRemoto(
  conectado: boolean,
  chamar: (metodo: string, caminho: string) => Promise<ResultadoRemoto>,
  apagarLocal: () => Promise<void>,
): Promise<ResultadoRemoto | null> {
  if (conectado) {
    const r = await chamar('POST', '/instance/disconnect')
    if (r.status < 200 || r.status >= 300) return r
  }
  const r = await chamar('DELETE', '/instance')
  if (r.status < 200 || r.status >= 300) return r
  await apagarLocal()
  return null
}