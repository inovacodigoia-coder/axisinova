import React from 'react'
import Barcode from 'react-barcode'
import { MANCHESTER_COLORS, ManchesterColor } from '@/data/manchester'

interface Props {
  patientName: string
  cpf?: string | null
  protocol: string
  color: ManchesterColor
  classifiedAt: string
  widthMm?: number
  heightMm?: number
}

const MM = 3.7795

/**
 * Pulseira de identificação para impressora Zebra (rolo contínuo).
 * Largura padrão de 25 mm; o conteúdo é impresso ao longo do comprimento.
 */
export const WristbandLabel = React.forwardRef<HTMLDivElement, Props>(function WristbandLabel(
  { patientName, cpf, protocol, color, classifiedAt, widthMm = 25, heightMm = 250 },
  ref,
) {
  const info = MANCHESTER_COLORS[color]
  const hora = new Date(classifiedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div
      ref={ref}
      style={{
        width: `${heightMm * MM}px`,
        height: `${widthMm * MM}px`,
        background: '#ffffff',
        color: '#000000',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '16px',
          alignSelf: 'stretch',
          background: info.hex,
          borderRadius: '2px',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {patientName.toUpperCase()}
        </div>
        <div style={{ fontSize: '9px', fontWeight: 600 }}>
          CPF: {cpf || '—'} · Protocolo: {protocol}
        </div>
        <div style={{ fontSize: '9px', fontWeight: 700 }}>
          {info.label.toUpperCase()} · {hora}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        <Barcode
          value={protocol || '0'}
          format="CODE128"
          width={1}
          height={28}
          displayValue={false}
          margin={0}
        />
      </div>
    </div>
  )
})
