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
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [widthMm, heightMm] })

  for (let i = 0; i < elements.length; i++) {
    const canvas = await html2canvas(elements[i], {
      scale: 4,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })
    const img = canvas.toDataURL('image/png')
    if (i > 0) pdf.addPage([widthMm, heightMm], 'landscape')
    pdf.addImage(img, 'PNG', 0, 0, widthMm, heightMm)
  }

  return pdf.output('blob')
}
