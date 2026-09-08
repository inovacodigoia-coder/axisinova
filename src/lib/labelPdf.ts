import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Converte elementos de etiqueta (50mm x 30mm) em um PDF multi-páginas,
 * usado para envio direto ao Servidor de Impressão AisAxius.
 */
export async function gerarPdfEtiquetas(
  elements: HTMLElement[],
  widthMm = 50,
  heightMm = 30,
): Promise<Blob> {
  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm] })

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    const canvas = await html2canvas(el, {
      scale: 4,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })

    if (!canvas.width || !canvas.height) {
      throw new Error('Não foi possível capturar o conteúdo da etiqueta.')
    }

    const img = canvas.toDataURL('image/png')
    if (i > 0) pdf.addPage([widthMm, heightMm], orientation)
    pdf.addImage(img, 'PNG', 0, 0, widthMm, heightMm)
  }


  return pdf.output('blob')
}

/**
 * Converte elementos DOM genéricos (recibos, guias, comprovantes) em um PDF,
 * com uma página por elemento e altura proporcional ao conteúdo.
 * Usado para envio direto ao Servidor de Impressão AisAxius.
 */
export async function gerarPdfElementos(
  elements: HTMLElement[],
  widthMm: number,
): Promise<Blob> {
  let pdf: jsPDF | null = null

  for (let i = 0; i < elements.length; i++) {
    const canvas = await html2canvas(elements[i], {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })
    const heightMm = (canvas.height / canvas.width) * widthMm
    const orientation = heightMm > widthMm ? 'portrait' : 'landscape'
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm] })
    } else {
      pdf.addPage([widthMm, heightMm], orientation)
    }
    const img = canvas.toDataURL('image/jpeg', 0.92)
    pdf.addImage(img, 'JPEG', 0, 0, widthMm, heightMm)
  }

  if (!pdf) throw new Error('Nenhum conteúdo para imprimir.')
  return pdf.output('blob')
}
