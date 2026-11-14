import * as XLSX from 'xlsx'

/** Gera um PDF A4 deitado a partir de um trecho da tela (várias páginas se precisar). */
export async function exportarElementoPdf(el: HTMLElement, arquivo: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const largura = 277, altura = 190
  const ratio = canvas.width / largura
  const porPagina = Math.floor(altura * ratio)
  for (let y = 0, i = 0; y < canvas.height; y += porPagina, i++) {
    const h = Math.min(porPagina, canvas.height - y)
    const parte = document.createElement('canvas')
    parte.width = canvas.width
    parte.height = h
    const ctx = parte.getContext('2d')
    if (!ctx) throw new Error('Não foi possível gerar o PDF')
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (i) pdf.addPage('a4', 'landscape')
    pdf.addImage(parte.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 10, largura, h / ratio)
  }
  pdf.save(arquivo)
}

/** Planilha com uma aba por tabela. */
export function exportarPlanilha(abas: { nome: string; linhas: Record<string, unknown>[] }[], arquivo: string) {
  const wb = XLSX.utils.book_new()
  for (const a of abas) {
    const ws = XLSX.utils.json_to_sheet(a.linhas.length ? a.linhas : [{ Aviso: 'Sem dados no período' }])
    XLSX.utils.book_append_sheet(wb, ws, a.nome.slice(0, 31))
  }
  XLSX.writeFile(wb, arquivo)
}
