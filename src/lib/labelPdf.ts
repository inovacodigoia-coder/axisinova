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
    // Escala alta = mais pixels por barra; evita barras "falhadas" na leitura.
    const targetDpi = 600
    const scale = Math.min(8, Math.max(4, (widthMm / 25.4) * targetDpi / el.offsetWidth))
    const canvas = await html2canvas(el, {
      scale,
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

export type FolhaFormato = 'a4' | 'a5'
export type FolhaOrientacao = 'portrait' | 'landscape'
export interface FolhaPdf {
  formato: FolhaFormato
  /** Padrão: retrato. */
  orientacao?: FolhaOrientacao
  margemMm?: number
}

const FOLHAS: Record<FolhaFormato, [number, number]> = { a4: [210, 297], a5: [148, 210] }

/** Medidas fixas da folha (largura x altura em mm), já na orientação escolhida. */
export function medidasFolha(formato: FolhaFormato, orientacao: FolhaOrientacao = 'portrait'): [number, number] {
  const [w, h] = FOLHAS[formato]
  return orientacao === 'landscape' ? [h, w] : [w, h]
}

/** Regra @page literal (tamanho E orientação), nunca automática. */
export function cssPagina(formato: FolhaFormato, orientacao: FolhaOrientacao = 'portrait', margemMm = 10): string {
  return `@page { size: ${formato.toUpperCase()} ${orientacao}; margin: ${margemMm}mm; }`
}

/**
 * Converte elementos DOM (recibos, guias, laudos) em PDF.
 * - Com `folha`: cada página nasce no tamanho FIXO A4/A5 na orientação escolhida
 *   (padrão retrato); o conteúdo é encaixado dentro das margens, sem girar.
 * - Sem `folha` (bobina térmica): página da largura informada e altura do conteúdo.
 */
export async function gerarPdfElementos(
  elements: HTMLElement[],
  widthMm: number,
  folha?: FolhaPdf,
): Promise<Blob> {
  let pdf: jsPDF | null = null

  for (let i = 0; i < elements.length; i++) {
    const canvas = await html2canvas(elements[i], {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })
    const img = canvas.toDataURL('image/jpeg', 0.92)

    if (folha) {
      const orientacao = folha.orientacao ?? 'portrait'
      const [pw, ph] = medidasFolha(folha.formato, orientacao)
      const m = folha.margemMm ?? 10
      const uw = pw - 2 * m
      const uh = ph - 2 * m
      let w = uw
      let h = (canvas.height / canvas.width) * w
      if (h > uh) { h = uh; w = (canvas.width / canvas.height) * h }
      if (!pdf) pdf = new jsPDF({ orientation: orientacao, unit: 'mm', format: folha.formato })
      else pdf.addPage(folha.formato, orientacao)
      pdf.addImage(img, 'JPEG', m + (uw - w) / 2, m, w, h)
      continue
    }

    const heightMm = (canvas.height / canvas.width) * widthMm
    const orientation = heightMm > widthMm ? 'portrait' : 'landscape'
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: [widthMm, heightMm] })
    } else {
      pdf.addPage([widthMm, heightMm], orientation)
    }
    pdf.addImage(img, 'JPEG', 0, 0, widthMm, heightMm)
  }

  if (!pdf) throw new Error('Nenhum conteúdo para imprimir.')
  return pdf.output('blob')
}
