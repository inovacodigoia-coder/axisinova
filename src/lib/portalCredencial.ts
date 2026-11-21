import type { PasswordKind } from '@/hooks/useExternalAccesses'

/** Rótulo mostrado quando a senha já foi entregue (a tela nunca recebe a senha guardada). */
export function rotuloSenhaDefinida(kind?: PasswordKind | null): string {
  if (kind === 'cpf') return 'Definida · 4 últimos dígitos do CPF'
  if (kind === 'personal') return 'Definida · senha pessoal'
  return 'Senha definida'
}

/** Texto do "Copiar tudo": inclui a senha só quando ela acabou de ser gerada. */
export function textoCredencialPortal(url: string, codigo: string, senha?: string | null): string {
  const linhas = ['Portal de resultados', `Link: ${url}`, `Código de acesso: ${codigo}`]
  if (senha) linhas.push(`Senha: ${senha}`)
  return linhas.join('\n')
}

function esc(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

/** Imprime um cartão simples com link, código e (se recém-gerada) senha. Nada é registrado. */
export function imprimirCredencialPortal(d: { nome: string; url: string; codigo: string; senha?: string | null }): void {
  const w = window.open('', '_blank', 'width=420,height=560')
  if (!w) return
  const senha = d.senha ? `<p><b>Senha:</b> <span class="m">${esc(d.senha)}</span></p>` : ''
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Acesso ao portal</title>
<style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:16px;margin:0 0 4px}p{margin:6px 0;font-size:13px}.m{font-family:monospace;font-size:15px}</style>
</head><body><h1>Portal de resultados</h1><p>${esc(d.nome)}</p><p><b>Link:</b> <span class="m">${esc(d.url)}</span></p>
<p><b>Código:</b> <span class="m">${esc(d.codigo)}</span></p>${senha}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
}
