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
  const ok = (st: number) => st >= 200 && st < 300
  // 404 = o número já não existe no servidor do WhatsApp: a exclusão remota está confirmada.
  const jaNaoExiste = (st: number) => st === 404
  if (conectado) {
    const r = await chamar('POST', '/instance/disconnect')
    if (jaNaoExiste(r.status)) { await apagarLocal(); return null }
    if (!ok(r.status)) return r
  }
  const r = await chamar('DELETE', '/instance')
  if (!ok(r.status) && !jaNaoExiste(r.status)) return r
  await apagarLocal()
  return null
}