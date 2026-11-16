import Barcode from 'react-barcode'
import { TESTE_CARACTERES, TESTE_CODIGO_BARRAS } from '@/lib/etiquetaTesteCabeca'

/** Mesmo teste da cabeça em versão para a impressão do navegador (PDF no tamanho da etiqueta). */
export function EtiquetaTesteCabeca({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const faixa = `${(heightMm * 0.14).toFixed(2)}mm`
  const letra = `${(heightMm * 0.12).toFixed(2)}mm`
  const texto = TESTE_CARACTERES + TESTE_CARACTERES
  return (
    <div
      className="box-border flex flex-col justify-between overflow-hidden bg-white font-mono font-bold text-black"
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      data-teste-cabeca
    >
      <div className="w-full shrink-0 bg-black" style={{ height: faixa }} />
      <div className="whitespace-nowrap leading-none" style={{ fontSize: letra }}>{texto}</div>
      <div className="whitespace-nowrap leading-none" style={{ fontSize: letra, paddingLeft: `calc(${letra} * 0.3)` }}>{texto}</div>
      <div className="flex w-full justify-center [&_svg]:block [&_svg]:h-full [&_svg]:w-[90%]" style={{ height: `${(heightMm * 0.24).toFixed(2)}mm` }}>
        <Barcode value={TESTE_CODIGO_BARRAS} renderer="svg" format="CODE128" width={3} displayValue={false} margin={0} background="#ffffff" lineColor="#000000" />
      </div>
      <div className="w-full shrink-0 bg-black" style={{ height: faixa }} />
    </div>
  )
}
