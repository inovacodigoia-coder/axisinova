import { useLayoutEffect, useRef } from 'react'
import { AttendanceReceiptVia } from './AttendanceReceiptVia'
import type { AttendanceControlDocument, PrinterConfig } from '@/types/payment-print.types'
import { medidasFolha } from '@/lib/labelPdf'

function ReceiptHalf({ document, config, via }: {
  document: AttendanceControlDocument; config: PrinterConfig; via: 'patient' | 'establishment'
}) {
  const container = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const box = container.current
    const node = content.current
    if (!box || !node) return
    const fit = () => {
      const scale = Math.min(1, box.clientWidth / node.offsetWidth, (box.clientHeight - 12) / node.offsetHeight)
      node.style.transform = `scale(${scale})`
    }
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    observer.observe(node)
    fit()
    return () => observer.disconnect()
  }, [])
  return <div ref={container} className="receipt-half">
    <div ref={content} className="receipt-half-content"><AttendanceReceiptVia document={document} config={config} via={via} /></div>
  </div>
}

export function AttendanceReceiptSheet({ document, config }: { document: AttendanceControlDocument; config: PrinterConfig }) {
  const [width, height] = medidasFolha(config.paperSize === 'a5' ? 'a5' : 'a4', config.orientation)
  return <div className="receipt-combined-sheet" style={{ width: `${width - 20}mm`, height: `${height - 20}mm` }}>
    <ReceiptHalf document={document} config={config} via="patient" />
    <ReceiptHalf document={document} config={config} via="establishment" />
  </div>
}