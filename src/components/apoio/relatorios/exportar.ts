import { jsPDF } from 'jspdf'

export interface Coluna { key: string; label: string; fmt?: (v: any, row: any) => string }

const txt = (c: Coluna, r: any) => {
  const v = r[c.key]
  if (c.fmt) return c.fmt(v, r)
  if (v == null) return ''
  return String(v)
}

/** CSV com ; e BOM UTF-8 (Excel abre com acentuação certa) */
export function exportarCsv(nome: string, cols: Coluna[], rows: any[]) {
  const esc = (s: string) => /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  const linhas = [cols.map(c => esc(c.label)).join(';'), ...rows.map(r => cols.map(c => esc(txt(c, r))).join(';'))]
  baixar(new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${nome}.csv`)
}

export function exportarPdf(nome: string, titulo: string, subtitulo: string, cols: Coluna[], rows: any[], aviso?: string) {
  const doc = new jsPDF({ orientation: cols.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), m = 10
  const colW = (W - 2 * m) / cols.length
  let y = m
  const cabecalho = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(titulo, m, y + 5); y += 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text(subtitulo, m, y + 3); doc.setTextColor(0); y += 6
    if (aviso) {
      doc.setFillColor(254, 243, 199); doc.rect(m, y, W - 2 * m, 7, 'F')
      doc.setFont('helvetica', 'bold'); doc.setTextColor(146, 64, 14); doc.text(aviso, m + 2, y + 4.7); doc.setTextColor(0); y += 9
    }
    doc.setFillColor(241, 245, 249); doc.rect(m, y, W - 2 * m, 6, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
    cols.forEach((c, i) => doc.text(doc.splitTextToSize(c.label, colW - 2)[0], m + i * colW + 1, y + 4))
    y += 7; doc.setFont('helvetica', 'normal')
  }
  cabecalho()
  rows.forEach(r => {
    const cells = cols.map(c => doc.splitTextToSize(txt(c, r), colW - 2) as string[])
    const h = Math.max(1, ...cells.map(c => c.length)) * 3.2 + 1.5
    if (y + h > H - m) { doc.addPage(); y = m; cabecalho() }
    if (r.__cor === 'vermelho') { doc.setFillColor(254, 226, 226); doc.rect(m, y - 0.5, W - 2 * m, h, 'F') }
    if (r.__cor === 'amarelo') { doc.setFillColor(254, 249, 195); doc.rect(m, y - 0.5, W - 2 * m, h, 'F') }
    cells.forEach((c, i) => doc.text(c, m + i * colW + 1, y + 2.5))
    y += h
    doc.setDrawColor(226, 232, 240); doc.line(m, y - 0.5, W - m, y - 0.5)
  })
  if (!rows.length) doc.text('Nenhum registro no período.', m, y + 4)
  baixar(doc.output('blob'), `${nome}.pdf`)
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
