import jsPDF from 'jspdf'

export interface TuboRemessa {
  codigo: string
  pedido_id: string | null
  order_number: string | null
  paciente: string | null
  exames: string | null
  bipado: boolean
  pos_transmissao: boolean
}

export interface ItemRemessa {
  id: string
  paciente: string
  order_number: string
  exame: string
  material: string
  tubo: string
  conservacao?: string
}

/** DEPRECATED (12C): temperatura agora é por tubo; mantido para dados antigos */
export const TEMPERATURAS: Record<string, string> = {
  ambiente: 'Ambiente', refrigerada: 'Refrigerada', congelada: 'Congelada',
}

/** EPL2 simples (etiqueta 50x25mm, 203dpi) — usado na contingência quando o apoio não devolve a etiqueta */
export function gerarEpl(codigo: string, linha1: string, linha2: string): string {
  const limpa = (s: string) => String(s || '').replace(/"/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 30)
  return [
    '', 'N', 'q400', 'Q200,24',
    `A10,10,0,2,1,1,N,"${limpa(linha1)}"`,
    `B10,40,0,1,2,5,80,B,"${limpa(codigo)}"`,
    `A10,160,0,1,1,1,N,"${limpa(linha2)}"`,
    'P1', '',
  ].join('\n')
}

export function baixarTexto(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function gerarRomaneio(opts: {
  laboratorio: string; apoio: string; numero: number | string; temperatura: string;
  itens: ItemRemessa[]; totalTubos: number
}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 12
  let y = 16
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text('ROMANEIO DE REMESSA', M, y)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  y += 7; doc.text(`Laboratório: ${opts.laboratorio}`, M, y)
  y += 5; doc.text(`Apoio: ${opts.apoio}`, M, y)
  doc.text(`Remessa nº ${opts.numero}`, W - M, y, { align: 'right' })
  y += 5; doc.text(`Data/hora: ${new Date().toLocaleString('pt-BR')}`, M, y)
  doc.text(`Temperatura: ${TEMPERATURAS[opts.temperatura] || opts.temperatura}`, W - M, y, { align: 'right' })
  y += 6
  const cols = [
    { t: 'Paciente', w: 55 }, { t: 'Pedido', w: 25 }, { t: 'Código de barras', w: 32 },
    { t: 'Exame', w: 45 }, { t: 'Material', w: 29 },
  ]
  const header = () => {
    doc.setFillColor(235, 238, 242); doc.rect(M, y, W - 2 * M, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    let x = M + 1
    cols.forEach(c => { doc.text(c.t, x, y + 5); x += c.w })
    y += 7; doc.setFont('helvetica', 'normal')
  }
  header()
  opts.itens.forEach(it => {
    if (y > 250) { doc.addPage(); y = 16; header() }
    const vals = [it.paciente, it.order_number, it.tubo, it.exame, it.material]
    let x = M + 1
    vals.forEach((v, i) => {
      const txt = doc.splitTextToSize(String(v || '-'), cols[i].w - 2)[0]
      doc.text(txt, x, y + 5); x += cols[i].w
    })
    doc.setDrawColor(220); doc.line(M, y + 7, W - M, y + 7)
    y += 7
  })
  y += 6
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(`Total de exames: ${opts.itens.length}    Total de tubos: ${opts.totalTubos}`, M, y)
  y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  const assin = ['Enviado por', 'Recebido por', 'Data e hora', 'Temperatura na saída']
  assin.forEach((a, i) => {
    const x = i % 2 === 0 ? M : W / 2 + 4
    if (i === 2) y += 18
    doc.line(x, y, x + 80, y)
    doc.text(a, x, y + 4)
  })
  return doc
}
