interface ContatoNome {
  paciente_id: string | null
  paciente?: { name: string | null } | null
  nome_exibicao: string | null
}

export function nomePacienteContato(contato: ContatoNome | null): string | null {
  return contato?.paciente_id ? contato.paciente?.name?.trim() || null : null
}

export function nomePrincipalContato(contato: ContatoNome | null, fallback: string): string {
  return nomePacienteContato(contato) || contato?.nome_exibicao || fallback
}

export function perfilSecundarioContato(contato: ContatoNome | null): string | null {
  return nomePacienteContato(contato) && contato?.nome_exibicao ? `no WhatsApp: ${contato.nome_exibicao}` : null
}